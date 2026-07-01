'use client';

import { useEffect, useState } from 'react';
import { Select, Label } from '@/components/ui';
import { getSelectedInstitutionId, setSelectedInstitutionId } from '@/lib/institution-context';
import { proxyJson } from '@/lib/proxy';

interface Institution {
  id: string;
  name: string;
}

interface InstitutionSelectorProps {
  showAllOption?: boolean;
}

export function InstitutionSelector({ showAllOption = true }: InstitutionSelectorProps) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    setSelected(getSelectedInstitutionId() || '');
    proxyJson<Institution[]>('/platform/institutions')
      .then((data) => setInstitutions(Array.isArray(data) ? data : []))
      .catch(() => {
        fetch('/api/institutions')
          .then((r) => r.json())
          .then((data) => setInstitutions(Array.isArray(data) ? data : []))
          .catch(() => {});
      });
  }, []);

  function onChange(value: string) {
    setSelected(value);
    setSelectedInstitutionId(value || null);
    window.dispatchEvent(new CustomEvent('institution-context-changed'));
  }

  if (institutions.length === 0) return null;

  return (
    <div className="min-w-[200px]">
      <Label htmlFor="inst-selector" className="sr-only">Institución</Label>
      <Select
        id="inst-selector"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm"
      >
        {showAllOption && <option value="">Todas las instituciones</option>}
        {institutions.map((i) => (
          <option key={i.id} value={i.id}>{i.name}</option>
        ))}
      </Select>
    </div>
  );
}
