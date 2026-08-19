import { z } from 'zod';

import type { Pair } from './client/app-state';

const storageKey = 'mydancebook.activeProfile';
const activeProfileSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('member'), memberId: z.string().uuid() }),
  z.object({ kind: z.literal('host') }),
]);

export type ActiveProfile = z.infer<typeof activeProfileSchema>;

export function loadActiveProfile(pair: Pair): ActiveProfile {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    const parsed = activeProfileSchema.safeParse(value);
    if (parsed.success) {
      if (parsed.data.kind === 'host') return parsed.data;
      if ([pair.leader.id, pair.follower.id].includes(parsed.data.memberId)) return parsed.data;
    }
  } catch {
    // An invalid browser preference is disposable operational state.
  }
  return { kind: 'member', memberId: pair.leader.id };
}

export function saveActiveProfile(profile: ActiveProfile): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(profile));
  } catch {
    // The server remains the source of truth when browser preference storage is unavailable.
  }
}
