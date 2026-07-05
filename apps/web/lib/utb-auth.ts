/** Validación de credenciales UTB Te acompaña */

export const UTB_EMAIL_DOMAIN = '@utb.edu.co';
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,29}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function isUtbEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(UTB_EMAIL_DOMAIN);
}

export function suggestUsernames(base: string, taken: string[]): string[] {
  const normalized = normalizeUsername(base).replace(/[^a-z0-9_]/g, '');
  const root = normalized.slice(0, USERNAME_MAX - 2) || 'usuario';
  const suggestions: string[] = [];
  for (let i = 1; i <= 5 && suggestions.length < 3; i++) {
    const candidate = `${root}${i}`;
    if (!taken.includes(candidate) && isValidUsername(candidate)) {
      suggestions.push(candidate);
    }
  }
  if (suggestions.length === 0) {
    suggestions.push(`${root}_${Date.now().toString(36).slice(-4)}`);
  }
  return suggestions;
}
