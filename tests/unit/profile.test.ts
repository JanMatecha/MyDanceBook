import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Pair } from '../../src/frontend/client/app-state.js';
import {
  loadActiveProfile,
  saveActiveProfile,
  type ActiveProfile,
} from '../../src/frontend/profile.js';

const pair: Pair = {
  id: '01a01352-b78a-76fd-8ba8-f6ca29c7aca6',
  leader: {
    id: '01a01352-b78c-772b-a92b-8201ea95a250',
    pairId: '01a01352-b78a-76fd-8ba8-f6ca29c7aca6',
    role: 'LEADER',
    displayName: 'Jan',
    createdAt: '2026-08-18T06:00:00.000Z',
    updatedAt: '2026-08-18T06:00:00.000Z',
  },
  follower: {
    id: '01a01352-b78c-772b-a92b-87b63bdd5c24',
    pairId: '01a01352-b78a-76fd-8ba8-f6ca29c7aca6',
    role: 'FOLLOWER',
    displayName: 'Eva',
    createdAt: '2026-08-18T06:00:00.000Z',
    updatedAt: '2026-08-18T06:00:00.000Z',
  },
  createdAt: '2026-08-18T06:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('active profile browser state', () => {
  it('persists member and Host selections when storage is available', () => {
    const storage = createStorage();
    vi.stubGlobal('localStorage', storage);
    const follower: ActiveProfile = { kind: 'member', memberId: pair.follower.id };

    saveActiveProfile(follower);
    expect(loadActiveProfile(pair)).toEqual(follower);

    saveActiveProfile({ kind: 'host' });
    expect(loadActiveProfile(pair)).toEqual({ kind: 'host' });
  });

  it('falls back to the current Leader when the stored member is stale', () => {
    const storage = createStorage(
      JSON.stringify({ kind: 'member', memberId: '01a01352-b78c-772b-a92b-889ae4043f7b' }),
    );
    vi.stubGlobal('localStorage', storage);

    expect(loadActiveProfile(pair)).toEqual({ kind: 'member', memberId: pair.leader.id });
  });

  it('keeps working when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage unavailable');
      },
      setItem: () => {
        throw new Error('storage unavailable');
      },
    });

    expect(loadActiveProfile(pair)).toEqual({ kind: 'member', memberId: pair.leader.id });
    expect(() => saveActiveProfile({ kind: 'host' })).not.toThrow();
  });
});

function createStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem: () => value,
    setItem: (_key: string, nextValue: string) => {
      value = nextValue;
    },
  };
}
