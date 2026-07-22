export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
}

/** Base URL for links inside transactional emails (confirm, reset). */
export function getEmailAppUrl() {
  return process.env.EMAIL_APP_URL || getAppUrl();
}

/**
 * Omite envío a cuentas demo: local-part con "demo" en @utb.edu.co, o dominio @utb.demo.
 * Se puede desactivar globalmente con SKIP_DEMO_EMAILS=false para forzar el envío real
 * (útil para verificar que los correos realmente llegan durante demos/pruebas).
 */
export function shouldSkipOutgoingEmail(email: string): boolean {
  if ((process.env.SKIP_DEMO_EMAILS || '').toLowerCase() === 'false') return false;

  const lower = email.toLowerCase().trim();
  const at = lower.indexOf('@');
  if (at <= 0) return false;

  const local = lower.slice(0, at);
  const domain = lower.slice(at);

  if (domain === '@utb.demo') return true;
  if (domain === '@utb.edu.co' && local.includes('demo')) return true;

  return false;
}

/** @deprecated Usar shouldSkipOutgoingEmail */
export function isDemoEmail(email: string): boolean {
  return shouldSkipOutgoingEmail(email);
}

export function getPortalForSession(role: string): string {
  if (role === 'platform_admin') return 'platform';
  if (role === 'student') return 'student';
  return 'institutional';
}
