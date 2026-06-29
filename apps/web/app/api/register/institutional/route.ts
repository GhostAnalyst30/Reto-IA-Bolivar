import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/api';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${API_URL}/register/institutional`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: 'Error de servidor' }));
  if (!res.ok) {
    return NextResponse.json({ error: data.detail || data.error || 'Clave inválida' }, { status: res.status });
  }
  return NextResponse.json(data);
}
