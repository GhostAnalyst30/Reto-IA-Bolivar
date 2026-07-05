import { Resend } from 'resend';
import { getAppUrl, getWeeklyReportEmail, isDemoEmail } from '@/lib/app-config';

export { getAppUrl, isDemoEmail, getWeeklyReportEmail };

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendConfirmationEmail(params: {
  to: string;
  fullName: string;
  confirmLink: string;
}) {
  if (isDemoEmail(params.to)) {
    console.warn('[email] Skip demo account:', params.to);
    return { id: 'skipped-demo', link: params.confirmLink };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'UTB Te acompaña <onboarding@resend.dev>';
  const appUrl = getAppUrl();

  const html = `
    <div style="font-family: 'DM Sans', system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #000;">
      <h1 style="color: #003A70; font-family: Georgia, serif;">UTB Te acompaña</h1>
      <p>Hola <strong>${params.fullName}</strong>,</p>
      <p>Confirma tu correo institucional para activar tu cuenta en el microservicio de acompañamiento UTB.</p>
      <p style="margin: 28px 0;">
        <a href="${params.confirmLink}"
           style="background: #F28C28; color: #FFFFFF; padding: 14px 28px; border-radius: 2px; text-decoration: none; font-weight: 600; display: inline-block;">
          Confirmar cuenta y continuar
        </a>
      </p>
      <p style="font-size: 12px; color: #666;">UTB Te acompaña · ${appUrl}</p>
    </div>
  `;

  if (!resend) {
    console.warn('[email] RESEND_API_KEY no configurada. Enlace:', params.confirmLink);
    return { id: 'dev-log', link: params.confirmLink };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: 'Confirma tu cuenta — UTB Te acompaña',
    html,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function sendWeeklyReportEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.warn('[email] Weekly report (dev):', params.subject);
    return { id: 'dev-log' };
  }
  const from = process.env.RESEND_FROM_EMAIL || 'UTB Te acompaña <onboarding@resend.dev>';
  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function sendProfileChangeEmail(params: {
  to: string;
  fullName: string;
  changes: string[];
}) {
  if (isDemoEmail(params.to)) {
    console.warn('[email] Skip demo account:', params.to);
    return { id: 'skipped-demo' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'UTB Te acompaña <onboarding@resend.dev>';
  const changesList = params.changes.map((c) => `<li>${c}</li>`).join('');
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto;">
      <h1 style="color: #003A70;">UTB Te acompaña</h1>
      <p>Hola <strong>${params.fullName}</strong>,</p>
      <p>Se actualizó tu perfil en la plataforma:</p>
      <ul>${changesList}</ul>
      <p style="font-size: 12px; color: #888;">Si no realizaste este cambio, contacta al administrador.</p>
    </div>
  `;

  if (!resend) {
    console.warn('[email] Profile change (dev):', params.changes);
    return { id: 'dev-log' };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: 'Cambio en tu perfil — UTB Te acompaña',
    html,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function sendPasswordChangeEmail(params: { to: string; fullName: string }) {
  if (isDemoEmail(params.to)) {
    console.warn('[email] Skip demo account:', params.to);
    return { id: 'skipped-demo' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'UTB Te acompaña <onboarding@resend.dev>';
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto;">
      <h1 style="color: #003A70;">UTB Te acompaña</h1>
      <p>Hola <strong>${params.fullName}</strong>,</p>
      <p>Tu contraseña fue actualizada correctamente.</p>
      <p style="font-size: 12px; color: #888;">Si no realizaste este cambio, contacta al administrador de inmediato.</p>
    </div>
  `;

  if (!resend) {
    console.warn('[email] Password change (dev):', params.to);
    return { id: 'dev-log' };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: 'Contraseña actualizada — UTB Te acompaña',
    html,
  });
  if (error) throw new Error(error.message);
  return data;
}
