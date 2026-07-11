'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { PrivacyBanner } from '@/components/ui/PrivacyBanner';
import { ActionOverlay } from '@/components/ui/ActionOverlay';
import { proxyJson } from '@/lib/proxy';
import { RefreshCw } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  tags?: string[];
}

export default function SurveyPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [done, setDone] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [error, setError] = useState('');

  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    setError('');
    try {
      const d = await proxyJson<{ questions: Question[] }>('/psychometric/questions');
      const qs = d.questions || [];
      if (qs.length === 0) {
        setError('No se pudieron cargar las preguntas. Intenta de nuevo.');
        setQuestions([]);
      } else {
        setQuestions(qs);
        setStep(0);
        setResponses({});
        setDone(false);
      }
    } catch {
      setError('No se pudieron cargar las preguntas. Intenta de nuevo.');
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
    proxyJson<{ status?: string } | null>('/psychometric/assessment')
      .then((a) => setHasPrevious(a?.status === 'completed'))
      .catch(() => setHasPrevious(false));
  }, [loadQuestions]);

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
      await proxyJson('/psychometric/submit', {
        method: 'POST',
        body: JSON.stringify({ responses: payload }),
      });
      setDone(true);
      setHasPrevious(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar');
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (!q || responses[q.id] === undefined) return;
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      submitAll(responses);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <h1 className="font-display text-2xl font-bold">¡Encuesta completada!</h1>
        <p className="text-muted">Tu Digital Twin ha sido actualizado con tus respuestas.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => { window.location.href = '/student/twin/summary'; }}>
            Ver mi Digital Twin
          </Button>
          <Button variant="secondary" onClick={loadQuestions}>
            <RefreshCw className="mr-2 h-4 w-4 inline" />
            Realizar encuesta de nuevo
          </Button>
        </div>
      </div>
    );
  }

  if (loadingQuestions) {
    return <p className="text-muted">Cargando encuesta...</p>;
  }

  if (!q) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="text-red-400">{error || 'No hay preguntas disponibles.'}</p>
        <Button onClick={loadQuestions}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <ActionOverlay show={loading} message="Generando tu Digital Twin..." />
      <PrivacyBanner message="Tus respuestas son confidenciales y se usan solo para personalizar tu acompañamiento en la UTB." />

      {hasPrevious && (
        <p className="text-sm text-muted rounded-lg border border-brand-border bg-brand-bg px-3 py-2">
          Ya completaste esta encuesta antes. Puedes repetirla cuando quieras; tu Digital Twin se actualizará.
        </p>
      )}

      <div>
        <div className="mb-2 flex justify-between text-sm text-muted">
          <span>Pregunta {step + 1} de {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-brand-border">
          <div className="h-2 rounded-full bg-brand-amber transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">{q.text}</h2>
        <div className="mt-6 space-y-3">
          {q.type === 'likert' && (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAnswer(n)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    responses[q.id] === n ? 'border-brand-amber bg-brand-amber/20 text-brand-amber' : 'border-brand-border'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          {q.type === 'choice' && q.options && (
            <div className="space-y-2">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswer(opt)}
                  className={`block w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    responses[q.id] === opt ? 'border-brand-amber bg-brand-amber/20' : 'border-brand-border hover:bg-brand-bg'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>Anterior</Button>
        )}
        <Button onClick={next} disabled={responses[q.id] === undefined || loading}>
          {step === questions.length - 1 ? 'Finalizar' : 'Siguiente'}
        </Button>
        <Button variant="ghost" size="sm" onClick={loadQuestions} disabled={loading}>
          <RefreshCw className="mr-1 h-3 w-3 inline" />
          Nuevas preguntas
        </Button>
      </div>
    </div>
  );
}
