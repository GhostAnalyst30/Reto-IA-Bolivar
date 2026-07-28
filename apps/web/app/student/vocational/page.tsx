'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { ActionOverlay } from '@/components/ui/ActionOverlay';
import { NeuralProgramGraph } from '@/components/vocational/NeuralProgramGraph';
import { proxyJson } from '@/lib/proxy';
import { Compass, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  tags?: string[];
}

interface Recommendation {
  feature_nodes?: { id: string; label: string; weight: number }[];
  features?: Record<string, number>;
  recommended?: { id?: string; name: string; description?: string; affinity?: number; score?: number }[];
  programs?: { id?: string; name: string; description?: string; affinity?: number; score?: number }[];
  sources?: Record<string, boolean>;
  programs_active_count?: number;
}

export default function VocationalPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [error, setError] = useState('');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [completed, setCompleted] = useState(false);

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
      const d = await proxyJson<{ questions: Question[] }>('/vocational/questions');
      setQuestions(d.questions || []);
      setStep(0);
      setResponses({});
    } catch {
      setError('No se pudieron cargar las preguntas del test vocacional.');
      setQuestions([]);
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

  const q = questions[step];
  const progress = questions.length ? ((step + 1) / questions.length) * 100 : 0;

  function setAnswer(value: unknown) {
    if (!q) return;
    setResponses((r) => ({ ...r, [q.id]: value }));
  }

  async function submitAll(finalResponses: Record<string, unknown>) {
    setLoading(true);
    setError('');
    const payload = questions.map((question) => ({
      question_id: question.id,
      value: finalResponses[question.id],
      tags: question.tags || [],
    }));
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

  function next() {
    if (!q || responses[q.id] === undefined) return;
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    submitAll(responses);
  }

  const showResult = completed && recommendation;
  const graphPrograms = recommendation?.programs?.length
    ? recommendation.programs
    : recommendation?.recommended || [];
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
          Preguntas puntuales (sin IA). La recomendación combina tu encuesta de caracterización,
          este test y tus conversaciones con el Digital Twin. Si los admins cambian los programas
          activos, la red se actualiza.
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
              {recommendation.sources?.twin ? '✓' : '—'}
              {typeof recommendation.programs_active_count === 'number' &&
                ` · ${recommendation.programs_active_count} programas activos`}
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
              <p className="text-sm text-red-600">{error}</p>
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
                Pregunta {step + 1} de {questions.length}
              </p>
              <p className="text-lg font-medium text-on-surface">{q.text}</p>

              {q.type === 'likert' ? (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAnswer(n)}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        responses[q.id] === n
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(q.options || []).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswer(opt)}
                      className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                        responses[q.id] === opt
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-outline-variant/30 hover:bg-surface-container-low'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={step === 0}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  Atrás
                </Button>
                <Button onClick={next} disabled={responses[q.id] === undefined || loading}>
                  {step === questions.length - 1 ? 'Ver resultados' : 'Siguiente'}
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
