import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/api';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Falta username' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${API_URL}/auth/username/lookup?username=${encodeURIComponent(username)}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'No se pudo resolver el usuario' }, { status: 503 });
  }
}
