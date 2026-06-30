import { NextRequest, NextResponse } from 'next/server';
import { sendConfirmLink } from '@/lib/register-server';

export async function POST(request: NextRequest) {
  try {
    const { email, full_name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Correo requerido' }, { status: 400 });
    }

    await sendConfirmLink(email, full_name || email.split('@')[0]);

    return NextResponse.json({ sent: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al enviar correo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
