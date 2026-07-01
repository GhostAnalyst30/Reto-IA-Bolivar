const STORAGE_KEY = 'bolivar_selected_institution';

const INSTITUTION_SCOPED_PREFIXES = ['/institutional', '/admin'];

export function getSelectedInstitutionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setSelectedInstitutionId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) localStorage.setItem(STORAGE_KEY, id);
  else localStorage.removeItem(STORAGE_KEY);
}

export function appendInstitutionQuery(path: string): string {
  const inst = getSelectedInstitutionId();
  if (!inst) return path;
  if (!INSTITUTION_SCOPED_PREFIXES.some((p) => path.startsWith(p))) return path;
  if (path.includes('institution_id=')) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}institution_id=${encodeURIComponent(inst)}`;
}
