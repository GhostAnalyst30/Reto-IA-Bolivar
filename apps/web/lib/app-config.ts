export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
}

/** Omite envío a cuentas demo: local-part con "demo" en @utb.edu.co, o dominio @utb.demo. */
export function shouldSkipOutgoingEmail(email: string): boolean {
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

export function getWeeklyReportEmail(): string {
  return process.env.WEEKLY_REPORT_EMAIL || 'ascendraemmanuel@gmail.com';
}

export function getPortalForSession(role: string): string {
  if (role === 'platform_admin') return 'platform';
  if (role === 'student') return 'student';
  return 'institutional';
}
