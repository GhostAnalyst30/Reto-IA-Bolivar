'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Label, Select } from '@/components/ui';
import { BentoGrid, BentoCell } from '@/components/ui/BentoGrid';
import { createClient } from '@/lib/supabase/client';

interface Institution {
  id: string;
  name: string;
  slug: string;
}

export default function StudentOnboardingPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionId, setInstitutionId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetch('/api/institutions').then((r) => r.json()).then(setInstitutions).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!institutionId) return;
    setLoading(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { error: upd } = await supabase.from('users').update({ institution_id: institutionId }).eq('id', user.id);
    if (upd) {
      setError('No se pudo vincular. Contacte al administrador.');
      setLoading(false);
      return;
    }
    router.push('/student/chat');
  }

  return (
    <BentoGrid cols={1} className="max-w-lg mx-auto">
      <BentoCell>
        <h1 className="text-xl font-semibold">Vincular institución</h1>
        <p className="mt-2 text-sm text-zinc-500">Seleccione la Universidad Tecnológica de Bolívar u otra institución.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="inst">Institución</Label>
            <Select id="inst" value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} required>
              <option value="">Seleccionar...</option>
              {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Vincular y continuar'}</Button>
        </form>
      </BentoCell>
    </BentoGrid>
  );
}
