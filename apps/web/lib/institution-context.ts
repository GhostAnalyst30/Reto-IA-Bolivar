/** UTB institution UUID from supabase/003_seed_utb.sql */
export const UTB_INSTITUTION_ID = 'a0000000-0000-4000-8000-000000000001';

/** UTB-only: single tenant; platform admin uses this default institution. */
export function getSelectedInstitutionId(): string {
  return UTB_INSTITUTION_ID;
}

export function setSelectedInstitutionId(_id: string | null) {
  // No-op: producto single-tenant UTB.
}

export function appendInstitutionQuery(path: string): string {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('bolivar_selected_institution');
    } catch {
      /* ignore */
    }
  }
  return path;
}
