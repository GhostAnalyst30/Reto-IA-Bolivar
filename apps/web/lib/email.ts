import { Resend } from 'resend';
import { getAppUrl, getWeeklyReportEmail, shouldSkipOutgoingEmail } from '@/lib/app-config';

export { getAppUrl, shouldSkipOutgoingEmail, getWeeklyReportEmail };
export { shouldSkipOutgoingEmail as isDemoEmail };

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL || 'UTB Te acompaña <onboarding@resend.dev>';
}

type DeliverResult = { id: string; link?: string; skipped?: boolean };

async function deliverEmail(params: {
  to: string;
  subject: string;
  html: string;
  devLog?: string;
  link?: string;
}): Promise<DeliverResult> {
  if (shouldSkipOutgoingEmail(params.to)) {
    console.warn('[email] Skip cuenta demo:', params.to);
    return { id: 'skipped-demo', link: params.link, skipped: true };
  }

  if (!resend) {
    console.warn('[email] RESEND_API_KEY no configurada.', params.devLog || params.subject);
    if (params.link) console.warn('[email] Enlace:', params.link);
    return { id: 'dev-log', link: params.link };
  }

  const from = getFromAddress();
  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    console.error('[email] Fallo de envío Resend:', params.to, error.message);
    // El remitente de pruebas onboarding@resend.dev solo entrega al dueño de la cuenta.
    if (from.includes('resend.dev')) {
      console.error(
        '[email] Usa un dominio verificado en RESEND_FROM_EMAIL para enviar a cualquier destinatario.'
      );
    }
    throw new Error(error.message);
  }

  console.info('[email] Enviado a', params.to, '· id', data?.id);
  return { id: data?.id || 'sent', link: params.link };
}

export async function sendConfirmationEmail(params: {
  to: string;
  fullName: string;
  confirmLink: string;
}) {
  const appUrl = getAppUrl();
  const html = `
    <div style="font-family: 'DM Sans', system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #000;">
      <h1 style="color: #003A70; font-family: Georgia, serif;">UTB Te acompaña</h1>
      <p>Hola <strong>${params.fullName}</strong>,</p>
      <p>Confirma tu correo para activar tu cuenta en el microservicio de acompañamiento UTB.</p>
      <p style="margin: 28px 0;">
        <a href="${params.confirmLink}"
           style="background: #F28C28; color: #FFFFFF; padding: 14px 28px; border-radius: 2px; text-decoration: none; font-weight: 600; display: inline-block;">
          Confirmar cuenta y continuar
        </a>
      </p>
      <p style="font-size: 12px; color: #666;">UTB Te acompaña · ${appUrl}</p>
    </div>
  `;

  return deliverEmail({
    to: params.to,
    subject: 'Confirma tu cuenta — UTB Te acompaña',
    html,
    devLog: `Confirmación para ${params.to}`,
    link: params.confirmLink,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  fullName: string;
  resetLink: string;
}) {
  const appUrl = getAppUrl();
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto;">
      <h1 style="color: #003A70;">UTB Te acompaña</h1>
      <p>Hola <strong>${params.fullName}</strong>,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p style="margin: 28px 0;">
        <a href="${params.resetLink}"
           style="background: #F28C28; color: #FFFFFF; padding: 14px 28px; border-radius: 2px; text-decoration: none; font-weight: 600; display: inline-block;">
          Restablecer contraseña
        </a>
      </p>
      <p style="font-size: 12px; color: #888;">Si no solicitaste esto, ignora este correo. · ${appUrl}</p>
    </div>
  `;

  return deliverEmail({
    to: params.to,
    subject: 'Restablecer contraseña — UTB Te acompaña',
    html,
    devLog: `Reset para ${params.to}`,
    link: params.resetLink,
  });
}

export async function sendAccountApprovedEmail(params: {
  to: string;
  fullName: string;
  role: string;
}) {
  const appUrl = getAppUrl();
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto;">
      <h1 style="color: #003A70;">UTB Te acompaña</h1>
      <p>Hola <strong>${params.fullName}</strong>,</p>
      <p>Tu solicitud de acceso fue <strong>aprobada</strong> como <strong>${params.role}</strong>.</p>
      <p style="margin: 28px 0;">
        <a href="${appUrl}/login"
           style="background: #F28C28; color: #FFFFFF; padding: 14px 28px; border-radius: 2px; text-decoration: none; font-weight: 600; display: inline-block;">
          Iniciar sesión
        </a>
      </p>
    </div>
  `;

  return deliverEmail({
    to: params.to,
    subject: 'Cuenta aprobada — UTB Te acompaña',
    html,
    devLog: `Aprobación para ${params.to}`,
  });
}

export async function sendAccountRejectedEmail(params: {
  to: string;
  fullName: string;
  reason?: string;
}) {
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto;">
      <h1 style="color: #003A70;">UTB Te acompaña</h1>
      <p>Hola <strong>${params.fullName}</strong>,</p>
      <p>Tu solicitud de acceso no fue aprobada en este momento.</p>
      ${params.reason ? `<p><strong>Motivo:</strong> ${params.reason}</p>` : ''}
      <p style="font-size: 12px; color: #888;">Contacta al administrador si necesitas más información.</p>
    </div>
  `;

  return deliverEmail({
    to: params.to,
    subject: 'Actualización de solicitud — UTB Te acompaña',
    html,
    devLog: `Rechazo para ${params.to}`,
  });
}

export async function sendWeeklyReportEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  return deliverEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    devLog: `Weekly report: ${params.subject}`,
  });
}

export async function sendProfileChangeEmail(params: {
  to: string;
  fullName: string;
  changes: string[];
}) {
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

  return deliverEmail({
    to: params.to,
    subject: 'Cambio en tu perfil — UTB Te acompaña',
    html,
    devLog: `Perfil actualizado: ${params.to}`,
  });
}

export async function sendPasswordChangeEmail(params: { to: string; fullName: string }) {
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto;">
      <h1 style="color: #003A70;">UTB Te acompaña</h1>
      <p>Hola <strong>${params.fullName}</strong>,</p>
      <p>Tu contraseña fue actualizada correctamente.</p>
      <p style="font-size: 12px; color: #888;">Si no realizaste este cambio, contacta al administrador de inmediato.</p>
    </div>
  `;

  return deliverEmail({
    to: params.to,
    subject: 'Contraseña actualizada — UTB Te acompaña',
    html,
    devLog: `Contraseña actualizada: ${params.to}`,
  });
}
