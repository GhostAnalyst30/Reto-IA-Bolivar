import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import {
  callBackendRegister,
  createAuthUser,
  sendConfirmLink,
} from '@/lib/register-server';

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().min(2).max(200),
  institution_id: z.string().uuid().nullish(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const { email, password, full_name, institution_id } = body;

    const userId = await createAuthUser(email, password, full_name);

    await callBackendRegister('/register/student', {
      user_id: userId,
      email,
      full_name,
      institution_id: institution_id ?? null,
    });

    await sendConfirmLink(email, full_name);

    return NextResponse.json({ sent: true, user_id: userId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Error al registrar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
