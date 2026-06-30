import { NextRequest, NextResponse } from 'next/server';
import {
  callBackendRegister,
  createAuthUser,
  sendConfirmLink,
} from '@/lib/register-server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, institution_id } = await request.json();

    if (!email || !password || !full_name || !institution_id) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const userId = await createAuthUser(email, password, full_name);

    await callBackendRegister('/register/student', {
      user_id: userId,
      email,
      full_name,
      institution_id,
    });

    await sendConfirmLink(email, full_name);

    return NextResponse.json({ sent: true, user_id: userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al registrar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
