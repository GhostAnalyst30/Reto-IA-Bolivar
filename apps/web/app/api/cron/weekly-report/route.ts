import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { API_URL } from '@/lib/api';
import { getWeeklyReportEmail, sendWeeklyReportEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/admin/reports/weekly-data`, {
      headers: { Authorization: `Bearer ${process.env.INTERNAL_CRON_TOKEN || ''}` },
    });
    const data = await res.json().catch(() => ({}));

    const kpis = (data.kpis || []) as { metric_name: string; metric_value: number }[];
    const rows = kpis.map((k) => `<li><strong>${k.metric_name}</strong>: ${k.metric_value}</li>`).join('');

    await sendWeeklyReportEmail({
      to: getWeeklyReportEmail(),
      subject: 'Reporte semanal UTB Bolívar IA — admin@utb.demo',
      html: `
        <h1>Reporte semanal — Bolívar IA UTB</h1>
        <p>Destinatario lógico: admin@utb.demo</p>
        <ul>${rows || '<li>Sin actividad registrada</li>'}</ul>
        <p>Generado: ${new Date().toISOString()}</p>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    return NextResponse.json({ error: 'Report failed' }, { status: 500 });
  }
}
