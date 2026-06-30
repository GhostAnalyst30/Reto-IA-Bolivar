export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
}

export function isDemoEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@utb.demo');
}

export function getWeeklyReportEmail(): string {
  return process.env.WEEKLY_REPORT_EMAIL || 'ascendraemmanuel@gmail.com';
}
