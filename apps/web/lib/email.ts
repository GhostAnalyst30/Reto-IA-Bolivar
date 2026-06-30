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

  const from = process.env.RESEND_FROM_EMAIL || 'Bolívar IA <onboarding@resend.dev>';
  const appUrl = getAppUrl();

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
      <h1 style="color: #C9A227;">Bolívar IA — UTB</h1>
      <p>Hola <strong>${params.fullName}</strong>,</p>
      <p>Confirma tu correo para activar tu cuenta y continuar con la solicitud de acceso a la plataforma.</p>
      <p style="margin: 28px 0;">
        <a href="${params.confirmLink}"
           style="background: #C9A227; color: #0A0A0B; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
          Confirmar cuenta y continuar
        </a>
      </p>
      <p style="font-size: 12px; color: #888;">Plataforma Bolívar IA · ${appUrl}</p>
    </div>
  `;

  if (!resend) {
    console.warn('[email] RESEND_API_KEY no configurada. Enlace:', params.confirmLink);
    return { id: 'dev-log', link: params.confirmLink };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: 'Confirma tu cuenta — Bolívar IA UTB',
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
  const from = process.env.RESEND_FROM_EMAIL || 'Bolívar IA <onboarding@resend.dev>';
  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  if (error) throw new Error(error.message);
  return data;
}
