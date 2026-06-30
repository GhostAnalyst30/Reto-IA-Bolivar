import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
}

export async function sendConfirmationEmail(params: {
  to: string;
  fullName: string;
  confirmLink: string;
}) {
  const from = process.env.RESEND_FROM_EMAIL || 'Bolívar IA <onboarding@resend.dev>';
  const appUrl = getAppUrl();

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
      <h1 style="color: #C9A227;">Bolívar IA</h1>
      <p>Hola <strong>${params.fullName}</strong>,</p>
      <p>Confirma tu correo para activar tu cuenta y continuar con la solicitud de acceso a la plataforma.</p>
      <p style="margin: 28px 0;">
        <a href="${params.confirmLink}"
           style="background: #C9A227; color: #0A0A0B; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
          Confirmar cuenta y continuar
        </a>
      </p>
      <p style="font-size: 14px; color: #555;">
        Este enlace funciona como un token de acceso único. Tras confirmar, podrás iniciar sesión con:
      </p>
      <ul style="font-size: 14px; color: #555;">
        <li><strong>Correo:</strong> ${params.to}</li>
        <li><strong>Contraseña:</strong> la que elegiste al registrarte</li>
      </ul>
      <p style="font-size: 12px; color: #888;">
        Si el botón no funciona, copia este enlace en tu navegador:<br/>
        <a href="${params.confirmLink}">${params.confirmLink}</a>
      </p>
      <p style="font-size: 12px; color: #888;">Plataforma Bolívar IA · ${appUrl}</p>
    </div>
  `;

  if (!resend) {
    console.warn('[email] RESEND_API_KEY no configurada. Enlace de confirmación:', params.confirmLink);
    return { id: 'dev-log', link: params.confirmLink };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: 'Confirma tu cuenta — Bolívar IA',
    html,
  });

  if (error) throw new Error(error.message);
  return data;
}
