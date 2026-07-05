export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
}

export function isDemoEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return lower.endsWith('@utb.demo') || lower === 'ascendraemmanuel@gmail.com';
}

export function getWeeklyReportEmail(): string {
  return process.env.WEEKLY_REPORT_EMAIL || 'ascendraemmanuel@gmail.com';
}

export function getPortalForSession(role: string): string {
  if (role === 'platform_admin') return 'platform';
  if (role === 'student') return 'student';
  return 'institutional';
}
