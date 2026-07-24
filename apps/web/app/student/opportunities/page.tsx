'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronDown,
  Compass,
  Filter,
  SlidersHorizontal,
  Sparkles,
  Star,
} from 'lucide-react';
import { LoadingState } from '@/components/ui';
import { Reveal } from '@/components/front/reveal';
import { proxyJson } from '@/lib/proxy';

interface Opportunity {
  id: string;
  type: string;
  title: string;
  description?: string;
  area?: string;
  deadline?: string;
  match_score?: number;
  match_reasons?: string[];
  external_url?: string;
}

const TYPE_LABELS: Record<string, string> = {
  beca: 'Beca de Excelencia',
  convocatoria: 'Convocatoria',
  evento: 'Evento',
  investigacion: 'Investigación',
  bienestar: 'Bienestar',
  movilidad: 'Movilidad',
  emprendimiento: 'Emprendimiento',
  cultura: 'Cultura',
};

const TYPE_CLASS: Record<string, string> = {
  beca: 'bg-primary/90 text-on-primary',
  convocatoria: 'bg-tertiary-container text-on-tertiary-container',
  evento: 'bg-primary-container text-on-primary',
  investigacion: 'bg-tertiary-container text-on-tertiary-container',
  bienestar: 'bg-on-tertiary-fixed-variant text-white',
  movilidad: 'bg-primary/90 text-on-primary',
  emprendimiento: 'bg-tertiary text-on-tertiary',
  cultura: 'bg-primary-container text-on-primary',
};

const FALLBACK_IMAGES = [
  '/front/opp-scholarship.png',
  '/front/opp-robotics.png',
  '/front/opp-dining.png',
  '/front/opp-exchange.png',
  '/front/opp-makerspace.png',
  '/front/opp-piano.png',
];

function deadlineBefore(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const DEADLINE_OPTIONS: Record<string, number> = {
  week: 7,
  month: 30,
  quarter: 90,
};

function imageFor(opp: Opportunity, index: number) {
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

function asOppList(value: unknown): Opportunity[] {
  return Array.isArray(value) ? (value as Opportunity[]) : [];
}

export default function OpportunitiesPage() {
  const [all, setAll] = useState<Opportunity[]>([]);
  const [recommended, setRecommended] = useState<Opportunity[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [typeFilter, areaFilter, deadlineFilter]);

  function load() {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (areaFilter) params.set('area', areaFilter);
    if (deadlineFilter && DEADLINE_OPTIONS[deadlineFilter]) {
      params.set('deadline_before', deadlineBefore(DEADLINE_OPTIONS[deadlineFilter]));
    }
    const qs = params.toString() ? `?${params}` : '';
    Promise.all([
      proxyJson<Opportunity[]>(`/opportunities${qs}`),
      proxyJson<Opportunity[]>('/opportunities/recommended'),
    ])
      .then(([allData, recData]) => {
        setAll(asOppList(allData));
        setRecommended(asOppList(recData));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }

  const list = useMemo(() => {
    const rec = asOppList(recommended);
    const rest = asOppList(all);
    const ids = new Set(rec.map((r) => r.id));
    return [...rec, ...rest.filter((o) => !ids.has(o.id))];
  }, [all, recommended]);

  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-24 md:px-8 md:pb-16">
      <Reveal className="mb-12">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <Sparkles className="h-6 w-6" />
          <span className="text-sm font-semibold uppercase tracking-wider">Para ti</span>
        </div>
        <h1 className="mb-4 text-balance text-4xl font-bold text-primary md:text-5xl">
          Oportunidades y Becas
        </h1>
        <p className="max-w-2xl text-pretty text-lg text-on-surface-variant">
          Descubre programas de apoyo financiero, convocatorias académicas y eventos diseñados para
          potenciar tu crecimiento universitario.
        </p>
      </Reveal>

      <Reveal className="glass-card mb-12 flex flex-col items-end gap-6 rounded-2xl p-6 shadow-sm md:flex-row">
        <Field label="Tipo de Oportunidad">
          <Select value={typeFilter} onChange={setTypeFilter}>
            <option value="">Todas las categorías</option>
            <option value="beca">Becas</option>
            <option value="convocatoria">Convocatorias</option>
            <option value="evento">Eventos</option>
          </Select>
        </Field>
        <Field label="Área Académica">
          <Select value={areaFilter} onChange={setAreaFilter}>
            <option value="">Cualquier Facultad</option>
            <option value="ingenieria">Ingeniería</option>
            <option value="bienestar">Bienestar</option>
            <option value="general">General</option>
            <option value="tecnologia">Tecnología</option>
          </Select>
        </Field>
        <Field label="Cierre de Convocatoria">
          <Select value={deadlineFilter} onChange={setDeadlineFilter}>
            <option value="">Cualquier fecha</option>
            <option value="week">Próximas 2 semanas</option>
            <option value="month">Este mes</option>
            <option value="quarter">Este semestre</option>
          </Select>
        </Field>
        <button
          type="button"
          onClick={load}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-on-primary transition-all hover:shadow-lg active:scale-95 md:w-auto"
        >
          <Filter className="h-5 w-5" />
          Filtrar
        </button>
      </Reveal>

      {error && <p className="mb-6 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <LoadingState />
      ) : list.length === 0 && !error ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-2xl p-16 text-center">
          <SlidersHorizontal className="h-10 w-10 text-primary" />
          <p className="text-lg font-semibold text-on-surface">
            No hay convocatorias con esos filtros
          </p>
          <p className="text-on-surface-variant">
            Ajusta la categoría o el área académica para ver más resultados.
          </p>
          <Compass className="mt-2 h-8 w-8 text-outline" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {list.map((opp, i) => (
            <Reveal key={opp.id} delay={i * 60}>
              <article className="glass-card animate-card-hover group flex h-full flex-col overflow-hidden rounded-2xl">
                <div className="relative h-48 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageFor(opp, i)}
                    alt={opp.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div
                    className={`absolute left-4 top-4 rounded-full px-3 py-1 text-sm font-medium backdrop-blur-md ${
                      TYPE_CLASS[opp.type] || 'bg-primary/90 text-on-primary'
                    }`}
                  >
                    {TYPE_LABELS[opp.type] || opp.type}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-xl font-semibold text-primary">{opp.title}</h3>
                    {opp.match_score != null && opp.match_score > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        <Star className="h-3 w-3" />
                        {opp.match_score}%
                      </span>
                    )}
                  </div>
                  <p className="mb-6 flex-1 text-on-surface-variant line-clamp-3">
                    {opp.description}
                  </p>
                  <div className="mb-6 flex items-center justify-between text-on-surface-variant">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-[18px] w-[18px]" />
                      <span className="text-xs font-medium">
                        {opp.deadline ? `Cierra: ${opp.deadline}` : 'Sin fecha límite'}
                      </span>
                    </div>
                    {opp.area && (
                      <span className="text-xs font-medium capitalize">{opp.area}</span>
                    )}
                  </div>
                  <Link
                    href={`/student/opportunities/${opp.id}`}
                    className="w-full rounded-xl bg-primary py-3 text-center text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container active:scale-[0.98]"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="w-full flex-1">
      <label className="mb-2 block text-xs font-medium text-on-surface-variant">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-on-surface transition-colors focus:border-primary focus:outline-none"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
    </div>
  );
}
