'use client';

import { useState } from 'react';
import { ModuleScaffold } from '@/components/institutional/ModuleScaffold';
import { Button, Card } from '@/components/ui';
import { Brain } from 'lucide-react';

export default function DirectorPage() {
  const [insights, setInsights] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    setError('');
    setInsights('');
    try {
      const res = await fetch('/api/proxy?path=/institutional/director/chat', { method: 'POST', body: '{}' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || 'No se pudo generar el análisis');
        return;
      }
      setInsights(data.insights || '');
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModuleScaffold title="Director de IA" description="Asistente ejecutivo con KPIs institucionales" icon="Brain">
      <Card>
        <Button onClick={analyze} disabled={loading}>
          <Brain className="mr-2 h-4 w-4" />
          {loading ? 'Analizando...' : 'Generar análisis ejecutivo'}
        </Button>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {insights && (
          <div className="mt-6 rounded-lg bg-brand-bg p-4">
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{insights}</p>
          </div>
        )}
      </Card>
    </ModuleScaffold>
  );
}
