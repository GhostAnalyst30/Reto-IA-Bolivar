import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/api';
import { sendOutreachEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/app-config';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Target = {
  user_id: string;
  email: string;
  full_name: string;
  segment: string;
  dominant_cause?: string;
};

type OutreachPayload = {
  institution_id: string;
  segments: Record<string, Target[]>;
  copy: Record<string, { subject: string; body_intro: string; cta_path: string }>;
  counts: Record<string, number>;
};

function cronAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const headerSecret = request.headers.get('x-cron-secret');
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return headerSecret === expected || bearer === expected;
}

async function runOutreach() {
  const secret = process.env.CRON_SECRET!;
  const res = await fetch(`${API_URL}/admin/cron/outreach-targets`, {
    headers: { 'x-cron-secret': secret },
  });
  const payload = (await res.json().catch(() => ({}))) as OutreachPayload;
  if (!res.ok) {
    return NextResponse.json(payload, { status: res.status });
  }

  const appUrl = getAppUrl();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const [segment, targets] of Object.entries(payload.segments || {})) {
    const copy = payload.copy?.[segment];
    if (!copy) continue;
    for (const t of targets) {
      const cta = `${appUrl}${copy.cta_path}`;
      try {
        const result = await sendOutreachEmail({
          to: t.email,
          fullName: t.full_name,
          subject: copy.subject,
          bodyIntro: copy.body_intro,
          ctaUrl: cta,
          causeHint: t.dominant_cause,
        });
        const status = result.skipped ? 'skipped' : 'sent';
        if (result.skipped) skipped += 1;
        else sent += 1;

        await fetch(`${API_URL}/admin/cron/outreach-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': secret,
          },
          body: JSON.stringify({
            institution_id: payload.institution_id,
            user_id: t.user_id,
            segment,
            subject: copy.subject,
            status,
            brevo_id: result.id,
          }),
        });
      } catch {
        failed += 1;
        await fetch(`${API_URL}/admin/cron/outreach-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': secret,
          },
          body: JSON.stringify({
            institution_id: payload.institution_id,
            user_id: t.user_id,
            segment,
            subject: copy.subject,
            status: 'failed',
          }),
        }).catch(() => null);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    counts: payload.counts,
    sent,
    skipped,
    failed,
  });
}

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return await runOutreach();
  } catch {
    return NextResponse.json({ error: 'Outreach failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
