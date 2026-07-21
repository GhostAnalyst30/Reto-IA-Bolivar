'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';
import { Badge, Button, Input, Label, Select } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { proxyJson } from '@/lib/proxy';
import { ROLE_LABELS, cn } from '@/lib/utils';

export interface InstitutionUser {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  program?: string | null;
  semester?: number | null;
  age?: number | null;
  risk_level?: string | null;
  risk_score?: number | null;
}

interface UsersAccordionPanelProps {
  defaultRole?: string;
  studentOnly?: boolean;
  directivoOnly?: boolean;
  detailBasePath?: string;
}

const DIRECTIVO_ROLES = ['admin', 'psychologist'];

export function UsersAccordionPanel({
  defaultRole,
  studentOnly,
  directivoOnly,
  detailBasePath = '/institutional/students',
}: UsersAccordionPanelProps) {
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [program, setProgram] = useState('');
  const [roleFilter, setRoleFilter] = useState(defaultRole || '');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (name) params.set('name', name);
      if (program) params.set('program', program);
      if (roleFilter) params.set('role', roleFilter);
      if (ageMin) params.set('age_min', ageMin);
      if (ageMax) params.set('age_max', ageMax);
      const qs = params.toString();
      const data = await proxyJson<{ users: InstitutionUser[]; programs: string[] }>(
        `/institutional/users${qs ? `?${qs}` : ''}`
      );
      let list = data.users || [];
      if (studentOnly) list = list.filter((u) => u.role === 'student');
      if (directivoOnly) list = list.filter((u) => DIRECTIVO_ROLES.includes(u.role));
      setUsers(list);
      setPrograms(data.programs || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [name, program, roleFilter, ageMin, ageMax, studentOnly, directivoOnly]);

  const skipDebounce = useRef(true);

  useEffect(() => {
    if (skipDebounce.current) {
      skipDebounce.current = false;
      load();
      return;
    }
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [name, program, roleFilter, ageMin, ageMax, load]);

  return (
    <div className="space-y-4">
      <PortalCard className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>Nombre o email</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted" />
            <Input className="pl-8" value={name} onChange={(e) => setName(e.target.value)} placeholder="Buscar..." />
          </div>
        </div>
        {!studentOnly && !directivoOnly && (
          <div>
            <Label>Rol</Label>
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
        )}
        {directivoOnly && (
          <div>
            <Label>Rol directivo</Label>
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Todos</option>
              {DIRECTIVO_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </Select>
          </div>
        )}
        {(studentOnly || !directivoOnly) && (
          <div>
            <Label>Programa</Label>
            <Select value={program} onChange={(e) => setProgram(e.target.value)}>
              <option value="">Todos</option>
              {programs.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>
        )}
        {studentOnly && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Edad mín.</Label>
              <Input type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
            </div>
            <div>
              <Label>Edad máx.</Label>
              <Input type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
            </div>
          </div>
        )}
      </PortalCard>

      {loading ? (
        <p className="text-muted">Cargando usuarios...</p>
      ) : users.length === 0 ? (
        <PortalCard><p className="text-muted">No se encontraron usuarios.</p></PortalCard>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const open = expanded === u.user_id;
            return (
              <PortalCard key={u.user_id} className="p-0 overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-brand-bg/50"
                  onClick={() => setExpanded(open ? null : u.user_id)}
                >
                  <div>
                    <p className="font-semibold">{u.full_name}</p>
                    <p className="text-sm text-muted">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="amber">{ROLE_LABELS[u.role] || u.role}</Badge>
                    {u.risk_level && (
                      <Badge variant={u.risk_level === 'alto' ? 'red' : u.risk_level === 'moderado' ? 'amber' : 'green'}>
                        Riesgo {u.risk_level}
                      </Badge>
                    )}
                    <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
                  </div>
                </button>
                {open && (
                  <div className="border-t border-brand-border px-4 py-3 text-sm space-y-2 bg-brand-bg/30">
                    <p><span className="text-muted">Estado:</span> {u.status}</p>
                    {u.program && <p><span className="text-muted">Programa:</span> {u.program} {u.semester ? `(S${u.semester})` : ''}</p>}
                    {u.age != null && <p><span className="text-muted">Edad:</span> {u.age} años</p>}
                    {u.risk_score != null && <p><span className="text-muted">Score riesgo:</span> {u.risk_score}</p>}
                    {u.role === 'student' && (
                      <Link href={`${detailBasePath}/${u.user_id}`} className="text-[var(--portal-accent)] hover:underline">
                        Ver detalle completo →
                      </Link>
                    )}
                  </div>
                )}
              </PortalCard>
            );
          })}
        </div>
      )}
      <Button variant="secondary" size="sm" onClick={load}>Actualizar</Button>
    </div>
  );
}
