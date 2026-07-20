'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, LoadingState, EmptyState } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { proxyJson } from '@/lib/proxy';
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';

interface CareTicket {
  id: string;
  student_id: string;
  student_name?: string;
  student_email?: string;
  source: string;
  status: string;
  urgency: string;
  priority_score: number;
  dominant_cause?: string;
  risk_level?: string;
  risk_score?: number;
  summary?: string;
  chat_id?: string;
  sla_due_at?: string;
  sla_overdue?: boolean;
}

interface PlanStep {
  step: number;
  action: string;
  owner?: string;
  done?: boolean;
}

interface ActionPlan {
  id: string;
  title?: string;
  dominant_cause?: string;
  plan_steps?: PlanStep[];
  status?: string;
}

const STATUS_FLOW = ['nuevo', 'contactado', 'seguimiento', 'resuelto'] as const;

export default function CareQueuePage() {
  const [tickets, setTickets] = useState<CareTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [brief, setBrief] = useState<string>('');
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await proxyJson<{ tickets: CareTicket[] }>('/institutional/care-queue?sync_risk=true');
    const list = data?.tickets || [];
    setTickets(list);
    setActiveId((cur) => cur ?? list[0]?.id ?? null);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!activeId) {
      setBrief('');
      return;
    }
    proxyJson<{ brief: string }>(`/institutional/care-queue/${activeId}/brief`)
      .then((d) => setBrief(d.brief || ''))
      .catch(() => setBrief(''));
  }, [activeId]);

  const active = tickets.find((t) => t.id === activeId) || null;

  async function setStatus(status: string) {
    if (!activeId || busy) return;
    setBusy(true);
    try {
      await proxyJson(`/institutional/care-queue/${activeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function generatePlan() {
    if (!active || busy) return;
    setBusy(true);
    try {
      const created = await proxyJson<ActionPlan>('/institutional/action-plans', {
        method: 'POST',
        body: JSON.stringify({
          student_id: active.student_id,
          dominant_cause: active.dominant_cause,
          care_ticket_id: active.id,
        }),
      });
      setPlan(created);
      await setStatus('contactado');
    } finally {
      setBusy(false);
    }
  }

  async function completeStep(step: number) {
    if (!plan?.id || busy) return;
    setBusy(true);
    try {
      const updated = await proxyJson<ActionPlan>(
        `/institutional/action-plans/${plan.id}/steps/complete`,
        { method: 'POST', body: JSON.stringify({ step }) },
      );
      setPlan(updated);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">CareQueue</h1>
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">CareQueue — intervención</h1>
        <p className="text-muted text-sm">
          Cola unificada de riesgo alto, handoffs y alertas Sentinel (SLA 24h en urgencia alta).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <PortalCard className="max-h-[70vh] overflow-y-auto p-0">
          {tickets.length === 0 ? (
            <EmptyState title="Sin tickets abiertos" description="Los estudiantes en riesgo alto aparecerán aquí." />
          ) : (
            <ul className="divide-y divide-brand-border">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => { setActiveId(t.id); setPlan(null); }}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                      activeId === t.id ? 'bg-[color-mix(in_srgb,var(--portal-accent)_10%,transparent)]' : 'hover:bg-brand-bg'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{t.student_name || t.student_email}</span>
                      {t.sla_overdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {t.urgency} · {t.risk_level || 'n/d'} ({t.risk_score ?? '—'}) · {t.source}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-muted">{t.status}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PortalCard>

        <div className="space-y-4">
          {!active ? (
            <EmptyState title="Selecciona un caso" />
          ) : (
            <>
              <PortalCard>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-lg">{active.student_name}</h2>
                    <p className="text-sm text-muted">{active.student_email}</p>
                    <p className="mt-2 text-sm">{active.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_FLOW.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={active.status === s ? 'primary' : 'secondary'}
                        disabled={busy}
                        onClick={() => setStatus(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
                {active.chat_id && (
                  <p className="mt-3 text-sm">
                    <Link
                      href="/institutional/counselor/inbox"
                      className="text-[var(--portal-accent)] underline"
                    >
                      Abrir inbox de chat (handoff)
                    </Link>
                  </p>
                )}
              </PortalCard>

              <PortalCard>
                <h3 className="font-semibold mb-2">Resumen del caso</h3>
                <pre className="whitespace-pre-wrap text-sm text-muted font-sans">{brief || 'Cargando…'}</pre>
              </PortalCard>

              <PortalCard>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" /> ActionPlan
                  </h3>
                  <Button size="sm" onClick={generatePlan} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generar plan IA'}
                  </Button>
                </div>
                {!plan ? (
                  <p className="text-sm text-muted">Genera un plan por causa dominante para este estudiante.</p>
                ) : (
                  <ul className="space-y-2">
                    {(plan.plan_steps || []).map((s) => (
                      <li
                        key={s.step}
                        className="flex items-start justify-between gap-3 rounded border border-brand-border px-3 py-2 text-sm"
                      >
                        <span className={s.done ? 'line-through text-muted' : ''}>
                          {s.step}. {s.action}
                        </span>
                        {s.done ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                        ) : (
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => completeStep(s.step)}>
                            Hecho
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </PortalCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
