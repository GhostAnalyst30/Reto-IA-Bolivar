/**
 * In-memory caches for middleware — avoids repeated Supabase reads per navigation.
 * Scoped per server instance (same pattern as proxy role cache).
 */

const PROFILE_TTL_MS = 120_000;
/** Pending/rejected must refresh fast so approve/reject is visible without waiting full TTL. */
const PROFILE_PENDING_TTL_MS = 5_000;
const PSYCH_TTL_MS = 300_000;

interface ProfileEntry {
  role: string;
  status: string;
  institution_id: string | null;
  expires: number;
}

interface PsychEntry {
  completed: boolean;
  expires: number;
}

const profileCache = new Map<string, ProfileEntry>();
const psychCache = new Map<string, PsychEntry>();

export function getCachedProfile(userId: string): ProfileEntry | null {
  const entry = profileCache.get(userId);
  if (!entry || entry.expires <= Date.now()) {
    if (entry) profileCache.delete(userId);
    return null;
  }
  return entry;
}

export function setCachedProfile(
  userId: string,
  profile: { role: string; status: string; institution_id?: string | null },
) {
  const status = profile.status || '';
  const ttl =
    status === 'pending' || status === 'rejected'
      ? PROFILE_PENDING_TTL_MS
      : PROFILE_TTL_MS;
  profileCache.set(userId, {
    role: profile.role,
    status,
    institution_id: profile.institution_id ?? null,
    expires: Date.now() + ttl,
  });
}

export function getCachedPsychCompleted(userId: string): boolean | null {
  const entry = psychCache.get(userId);
  if (!entry || entry.expires <= Date.now()) {
    if (entry) psychCache.delete(userId);
    return null;
  }
  return entry.completed;
}

export function setCachedPsychCompleted(userId: string, completed: boolean) {
  psychCache.set(userId, {
    completed,
    expires: Date.now() + PSYCH_TTL_MS,
  });
}

export function invalidateProfileCache(userId: string) {
  profileCache.delete(userId);
  psychCache.delete(userId);
}
