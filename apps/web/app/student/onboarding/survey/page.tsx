'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { PrivacyBanner } from '@/components/ui/PrivacyBanner';
import { ActionOverlay } from '@/components/ui/ActionOverlay';
import { proxyJson } from '@/lib/proxy';

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
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    proxyJson<{ questions: Question[] }>('/psychometric/questions')
      .then((d) => setQuestions(d.questions || []))
      .catch(() => setError('No se pudieron cargar las preguntas'));
    proxyJson<{ status?: string } | null>('/psychometric/assessment')
      .then((a) => { if (a?.status === 'completed') setDone(true); })
      .catch(() => {});
  }, []);

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
        <p className="text-zinc-500">Tu Digital Twin ha sido generado. Revisa tu resumen personalizado.</p>
        <Button onClick={() => window.location.href = '/student/twin/summary'}>Ver mi Digital Twin</Button>
      </div>
    );
  }

  if (!q) return <p className="text-zinc-500">Cargando encuesta...</p>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <ActionOverlay show={loading} message="Generando tu Digital Twin..." />
      <PrivacyBanner message="Tus respuestas son confidenciales y se usan solo para personalizar tu acompañamiento en la UTB." />
      <div>
        <div className="mb-2 flex justify-between text-sm text-zinc-500">
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
      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>Anterior</Button>
        )}
        <Button onClick={next} disabled={responses[q.id] === undefined || loading}>
          {step === questions.length - 1 ? 'Finalizar' : 'Siguiente'}
        </Button>
      </div>
    </div>
  );
}
