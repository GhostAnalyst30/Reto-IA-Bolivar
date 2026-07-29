'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { ActionOverlay } from '@/components/ui/ActionOverlay';
import { NeuralProgramGraph } from '@/components/vocational/NeuralProgramGraph';
import { proxyJson } from '@/lib/proxy';
import { Compass, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface BinaryOption {
  value: string;
  label: string;
  next: string | null;
}

interface Question {
  id: string;
  text: string;
  type: string;
  options?: Array<string | BinaryOption>;
  tags?: string[];
  hint?: string;
}

interface Recommendation {
  feature_nodes?: { id: string; label: string; weight: number }[];
  features?: Record<string, number>;
  recommended?: { id?: string; name: string; description?: string; affinity?: number; score?: number; final_score?: number; embedding_sim?: number }[];
  programs?: { id?: string; name: string; description?: string; affinity?: number; score?: number; final_score?: number; embedding_sim?: number }[];
  sources?: Record<string, boolean>;
  source_weights?: Record<string, number>;
  student_text?: string;
  programs_active_count?: number;
}

function normalizeOptions(options?: Array<string | BinaryOption>): BinaryOption[] {
  if (!options?.length) return [];
  return options.map((opt, i) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt, next: null };
    }
    return {
      value: opt.value,
      label: opt.label,
      next: opt.next ?? null,
    };
  });
}

/** Typical depth of the UTB vocational test (10 prefix + 4-5 binary tree). */
const EXPECTED_DEPTH = 15;

export default function VocationalPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rootId, setRootId] = useState('v1');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [error, setError] = useState('');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [completed, setCompleted] = useState(false);

  const byId = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of questions) map.set(q.id, q);
    return map;
  }, [questions]);

  const q = currentId ? byId.get(currentId) : undefined;
  const options = normalizeOptions(q?.options);
  const answeredCount = Object.keys(responses).length;
  const progress = Math.min(100, ((answeredCount + (q ? 0.35 : 0)) / EXPECTED_DEPTH) * 100);

  const loadRecommendation = useCallback(async () => {
    try {
      const data = await proxyJson<Recommendation>('/vocational/recommendation');
      setRecommendation(data);
    } catch {
      /* optional until sources exist */
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    setError('');
    try {
      const d = await proxyJson<{ questions: Question[]; root_id?: string }>(
        '/vocational/questions'
      );
      const list = d.questions || [];
      const root = d.root_id || list[0]?.id || 'v1';
      setQuestions(list);
      setRootId(root);
      setCurrentId(root);
      setHistory([]);
      setResponses({});
    } catch {
      setError('No se pudieron cargar las preguntas del test vocacional.');
      setQuestions([]);
      setCurrentId(null);
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
    proxyJson<{ status?: string } | null>('/vocational/assessment')
      .then((a) => {
        if (a?.status === 'completed') {
          setCompleted(true);
          loadRecommendation();
        }
      })
      .catch(() => undefined);
  }, [loadQuestions, loadRecommendation]);

  async function submitPath(finalResponses: Record<string, string>) {
    setLoading(true);
    setError('');
    const payload = Object.entries(finalResponses).map(([question_id, value]) => {
      const question = byId.get(question_id);
      return {
        question_id,
        value,
        tags: question?.tags || [],
      };
    });
    try {
      const res = await proxyJson<{ recommendation?: Recommendation }>('/vocational/submit', {
        method: 'POST',
        body: JSON.stringify({ responses: payload }),
      });
      setCompleted(true);
      setRecommendation(res.recommendation || null);
      if (!res.recommendation) await loadRecommendation();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el test');
    } finally {
      setLoading(false);
    }
  }

  function choose(option: BinaryOption) {
    if (!q) return;
    const nextResponses = { ...responses, [q.id]: option.value };
    setResponses(nextResponses);

    if (option.next && byId.has(option.next)) {
      setHistory((h) => [...h, q.id]);
      setCurrentId(option.next);
      return;
    }
    submitPath(nextResponses);
  }

  function goBack() {
    if (!history.length) return;
    const prev = history[history.length - 1];
    const dropping = currentId;
    setHistory((h) => h.slice(0, -1));
    setCurrentId(prev);
    if (dropping) {
      setResponses((r) => {
        const copy = { ...r };
        delete copy[dropping];
        delete copy[prev];
        return copy;
      });
    }
  }

  const showResult = completed && recommendation;
  // Prefer ranked list (already sorted by affinity); fall back to top recommended.
  // Cap at 8 so the neural graph stays readable and affinity % remain visible.
  const graphPrograms = (recommendation?.programs?.length
    ? recommendation.programs
    : recommendation?.recommended || []
  ).slice(0, 8);
  const graphFeatures = recommendation?.feature_nodes?.length
    ? recommendation.feature_nodes
    : Object.entries(recommendation?.features || {}).map(([id, weight]) => ({
        id,
        label: id,
        weight,
      }));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 pb-24">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-semibold text-primary">
          <Compass className="h-7 w-7" />
          Test vocacional
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Árbol de decisiones binarias alineado a los pregrados UTB. Cada paso te acerca a una
          familia de programas; la recomendación también usa tu caracterización y el Digital Twin.
        </p>
      </div>

      {showResult ? (
        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-primary">Tu red de afinidad</h2>
              <Button variant="secondary" onClick={() => loadRecommendation()}>
                <RefreshCw className="mr-1 h-4 w-4" />
                Actualizar
              </Button>
            </div>
            <p className="text-sm text-on-surface-variant">
              Fuentes: caracterización {recommendation.sources?.characterization ? '✓' : '—'} ·
              test {recommendation.sources?.vocational ? '✓' : '—'} · chat twin{' '}
              {recommendation.sources?.chat ? '✓' : '—'} · perfil twin{' '}
              {recommendation.sources?.twin ? '✓' : '—'} · embedding{' '}
              {recommendation.sources?.embedding ? '✓' : '—'}
              {typeof recommendation.programs_active_count === 'number' &&
                ` · ${recommendation.programs_active_count} programas activos`}
            </p>
            <p className="text-xs text-on-surface-variant">
              {recommendation.sources?.embedding
                ? 'Alineado a tus respuestas · blend 70% dominio + 30% embedding textual.'
                : 'Alineado a tus respuestas vía vector de dominio (embedding no disponible).'}
              {recommendation.source_weights &&
                ` Pesos: ${Object.entries(recommendation.source_weights)
                  .map(([k, v]) => `${k} ${Math.round((v as number) * 100)}%`)
                  .join(' · ')}.`}
            </p>
            <NeuralProgramGraph features={graphFeatures} programs={graphPrograms} />
          </Card>

          <Card className="space-y-3 p-6">
            <h3 className="font-semibold text-on-surface">Programas sugeridos</h3>
            {(recommendation.recommended || []).length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Aún no hay programas activos o faltan datos. Completa la caracterización y conversa
                con tu Twin.
              </p>
            ) : (
              <ul className="space-y-3">
                {(recommendation.recommended || []).map((p) => (
                  <li
                    key={p.id || p.name}
                    className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest/60 p-4"
                  >
                    <p className="font-semibold text-primary">{p.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      Afinidad {Math.round((p.affinity || 0) * 100)}%
                      {typeof p.embedding_sim === 'number' && p.embedding_sim > 0 &&
                        ` · similitud ${Math.round(p.embedding_sim * 100)}%`}
                    </p>
                    {p.description && (
                      <p className="mt-1 text-sm text-on-surface">{p.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setCompleted(false);
                  loadQuestions();
                }}
              >
                Repetir test
              </Button>
              <Button href="/student/twin/chat" variant="secondary">
                Ir al Digital Twin
              </Button>
              <Link href="/student/programs" className="text-sm font-semibold text-primary underline">
                Ver catálogo de programas
              </Link>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="space-y-5 p-6">
          {loadingQuestions ? (
            <p className="text-sm text-on-surface-variant">Cargando preguntas…</p>
          ) : error && questions.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <Button onClick={loadQuestions}>Reintentar</Button>
            </div>
          ) : q ? (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-on-surface-variant">
                Paso {answeredCount + 1}
                {history.length === 0 && currentId === rootId ? ' · inicio del árbol' : ''}
              </p>
              <p className="text-lg font-medium text-on-surface">{q.text}</p>
              {q.hint && <p className="text-sm text-on-surface-variant">{q.hint}</p>}

              <div className="grid gap-3 sm:grid-cols-2">
                {options.map((opt) => {
                  const selected = responses[q.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={loading}
                      onClick={() => choose(opt)}
                      className={`rounded-xl border px-4 py-4 text-left text-sm transition ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-low'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-2">
                <Button variant="secondary" disabled={!history.length || loading} onClick={goBack}>
                  Atrás
                </Button>
              </div>
            </>
          ) : null}
        </Card>
      )}

      <ActionOverlay show={loading} message="Calculando afinidad…" />
    </div>
  );
}
