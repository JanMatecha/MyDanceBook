import { z } from 'zod';

const memberSchema = z.object({
  id: z.string().uuid(),
  pairId: z.string().uuid(),
  role: z.enum(['LEADER', 'FOLLOWER']),
  displayName: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const pairSchema = z.object({
  id: z.string().uuid(),
  leader: memberSchema,
  follower: memberSchema,
  createdAt: z.iso.datetime(),
});

const danceSchema = z.object({
  id: z.string().uuid(),
  code: z.enum([
    'WALTZ',
    'TANGO',
    'VIENNESE_WALTZ',
    'SLOW_FOXTROT',
    'QUICKSTEP',
    'SAMBA',
    'CHA_CHA_CHA',
    'RUMBA',
    'PASO_DOBLE',
    'JIVE',
  ]),
  internalName: z.string(),
  discipline: z.enum(['STANDARD', 'LATIN']),
  order: z.number().int(),
});

const appStateSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('needs_onboarding'),
    pair: z.null(),
    dances: z.array(danceSchema),
  }),
  z.object({ status: z.literal('ready'), pair: pairSchema, dances: z.array(danceSchema) }),
]);

const errorSchema = z.object({ message: z.string() });

export type AppState = z.infer<typeof appStateSchema>;
export type ReadyAppState = Extract<AppState, { status: 'ready' }>;
export type Pair = z.infer<typeof pairSchema>;
export type Dance = z.infer<typeof danceSchema>;
export type DanceCode = Dance['code'];

export interface PairNamesInput {
  readonly leaderDisplayName: string;
  readonly followerDisplayName: string;
}

export async function getAppState(signal?: AbortSignal): Promise<AppState> {
  return request('/api/app-state', undefined, signal);
}

export async function initializePair(input: PairNamesInput): Promise<ReadyAppState> {
  const result = await request('/api/onboarding', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (result.status !== 'ready') throw new Error('Pár se nepodařilo vytvořit.');
  return result;
}

export async function updatePairNames(input: PairNamesInput): Promise<ReadyAppState> {
  const result = await request('/api/pair/names', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (result.status !== 'ready') throw new Error('Jména se nepodařilo uložit.');
  return result;
}

async function request(url: string, init?: RequestInit, signal?: AbortSignal): Promise<AppState> {
  const response = await fetch(url, signal ? { ...init, signal } : init);
  const value: unknown = await response.json();
  if (!response.ok) {
    const error = errorSchema.safeParse(value);
    throw new Error(error.success ? error.data.message : `Požadavek selhal (${response.status}).`);
  }
  return appStateSchema.parse(value);
}
