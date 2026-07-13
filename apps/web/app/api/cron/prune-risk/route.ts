import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/api';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/admin/cron/prune-risk?keep_days=90`, {
      method: 'POST',
      headers: { 'x-cron-secret': secret },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Prune failed' }, { status: 500 });
  }
}
