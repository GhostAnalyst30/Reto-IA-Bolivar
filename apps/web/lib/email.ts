import {
  getAppUrl,
  getEmailAppUrl,
  getWeeklyReportEmail,
  shouldSkipOutgoingEmail,
} from '@/lib/app-config';

export { getAppUrl, getEmailAppUrl, shouldSkipOutgoingEmail, getWeeklyReportEmail };
export { shouldSkipOutgoingEmail as isDemoEmail };

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function getFromSender(): { name: string; email: string } {
  const raw = process.env.BREVO_FROM_EMAIL || 'UTB Te acompaña <noreply@utb.edu.co>';
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1].trim() || 'UTB Te acompaña', email: match[2].trim() };
  }
  return { name: 'UTB Te acompaña', email: raw.trim() };
}

type DeliverResult = { id: string; link?: string; skipped?: boolean };

function isTransientBrevoError(status: number, message: string): boolean {
  if (status === 429 || status >= 500) return true;
  const lower = message.toLowerCase();
  return lower.includes('ip address') || lower.includes('unrecognised') || lower.includes('rate limit');
}

async function sendViaBrevo(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ messageId?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY no configurada');
  }

  const sender = getFromSender();
  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender,
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.html,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    messageId?: string;
    message?: string;
  };

  if (!res.ok) {
    const message = body.message || `Brevo HTTP ${res.status}`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return body;
}

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

  if (!process.env.BREVO_API_KEY) {
    console.warn('[email] BREVO_API_KEY no configurada.', params.devLog || params.subject);
    if (params.link) console.warn('[email] Enlace:', params.link);
    return { id: 'dev-log', link: params.link };
  }

  const payload = { to: params.to, subject: params.subject, html: params.html };

  try {
    const body = await sendViaBrevo(payload);
    console.info('[email] Enviado a', params.to, '· id', body.messageId);
    return { id: body.messageId || 'sent', link: params.link };
  } catch (firstErr) {
    const firstMessage = firstErr instanceof Error ? firstErr.message : String(firstErr);
    const firstStatus = (firstErr as Error & { status?: number }).status || 0;

    if (!isTransientBrevoError(firstStatus, firstMessage)) {
      console.error('[email] Fallo de envío Brevo:', params.to, firstMessage);
      throw firstErr instanceof Error ? firstErr : new Error(firstMessage);
    }

    console.warn('[email] Reintentando envío Brevo:', params.to);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const body = await sendViaBrevo(payload);
      console.info('[email] Enviado a', params.to, '· id', body.messageId, '(reintento)');
      return { id: body.messageId || 'sent', link: params.link };
    } catch (retryErr) {
      const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
      console.error('[email] Fallo de envío Brevo:', params.to, retryMessage);
      throw retryErr instanceof Error ? retryErr : new Error(retryMessage);
    }
  }
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

export async function sendOutreachEmail(params: {
  to: string;
  fullName: string;
  subject: string;
  bodyIntro: string;
  ctaUrl: string;
  causeHint?: string;
}) {
  const appUrl = getAppUrl();
  const causeLine = params.causeHint
    ? `<p style="font-size:13px;color:#555;">Motivo de acompañamiento: <strong>${params.causeHint}</strong></p>`
    : '';
  const html = `
    <div style="font-family: 'DM Sans', system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #000;">
      <h1 style="color: #003A70; font-family: Georgia, serif;">UTB Te acompaña</h1>
      <p>Hola <strong>${params.fullName}</strong>,</p>
      <p>${params.bodyIntro}</p>
      ${causeLine}
      <p style="margin: 28px 0;">
        <a href="${params.ctaUrl}"
           style="background: #F28C28; color: #FFFFFF; padding: 14px 28px; border-radius: 2px; text-decoration: none; font-weight: 600; display: inline-block;">
          Abrir acompañamiento
        </a>
      </p>
      <p style="font-size: 12px; color: #666;">UTB Te acompaña · ${appUrl}</p>
    </div>
  `;
  return deliverEmail({
    to: params.to,
    subject: params.subject,
    html,
    devLog: `Outreach → ${params.to}`,
    link: params.ctaUrl,
  });
}
