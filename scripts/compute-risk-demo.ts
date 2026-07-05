/**
 * Computes and persists risk reports for UTB demo institution.
 * Usage: npx tsx scripts/compute-risk-demo.ts
 */
import { createClient } from '@supabase/supabase-js';

const UTB_INST = 'a0000000-0000-4000-8000-000000000001';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const sb = createClient(url, key);

  const students = await sb.from('users').select('id').eq('institution_id', UTB_INST).eq('role', 'student').eq('status', 'approved');
  if (!students.data?.length) {
    console.log('No approved students found for UTB demo.');
    return;
  }

  let count = 0;
  for (const s of students.data) {
    const factors: { key: string; label: string; weight: number }[] = [];
    let score = Math.floor(Math.random() * 60);

    const psych = await sb.from('psychometric_assessments').select('status').eq('user_id', s.id).maybeSingle();
    if (!psych.data || psych.data.status !== 'completed') {
      score += 25;
      factors.push({ key: 'survey', label: 'Encuesta incompleta', weight: 25 });
    }

    const level = score >= 60 ? 'alto' : score >= 30 ? 'moderado' : 'bajo';
    if (factors.length === 0) {
      factors.push({ key: 'demo', label: 'Evaluación demo', weight: score });
    }

    await sb.from('student_risk_reports').insert({
      user_id: s.id,
      institution_id: UTB_INST,
      risk_level: level,
      risk_score: score,
      factors,
    });
    count++;
  }
  console.log(`Risk reports generated for ${count} students.`);
}

main().catch(console.error);
