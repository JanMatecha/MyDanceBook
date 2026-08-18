import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { GetAppStateQuery } from '../../application/app-state/get-app-state.js';
import {
  InitializePairCommand,
  PairAlreadyInitializedError,
  PairNotFoundError,
  UpdatePairNamesCommand,
} from '../../application/pair/pair-use-cases.js';
import { InvalidDisplayNameError } from '../../domain/pair.js';

const namesSchema = z
  .object({
    leaderDisplayName: z.string().trim().min(1).max(100),
    followerDisplayName: z.string().trim().min(1).max(100),
  })
  .strict();

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
  order: z.number().int().min(1).max(5),
});

const appStateSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('needs_onboarding'),
    pair: z.null(),
    dances: z.array(danceSchema).length(10),
  }),
  z.object({
    status: z.literal('ready'),
    pair: pairSchema,
    dances: z.array(danceSchema).length(10),
  }),
]);

export interface PairRouteServices {
  readonly getAppState: GetAppStateQuery;
  readonly initializePair: InitializePairCommand;
  readonly updatePairNames: UpdatePairNamesCommand;
}

export function registerPairRoutes(app: FastifyInstance, services: PairRouteServices): void {
  app.get('/api/app-state', async (_request, reply) => {
    return reply.code(200).send(appStateSchema.parse(services.getAppState.execute()));
  });

  app.post('/api/onboarding', async (request, reply) => {
    const input: unknown = request.body;
    const parsed = namesSchema.safeParse(input);
    if (!parsed.success) return sendInvalidRequest(reply);

    try {
      services.initializePair.execute(parsed.data);
      return reply.code(201).send(appStateSchema.parse(services.getAppState.execute()));
    } catch (cause: unknown) {
      return sendPairError(reply, cause);
    }
  });

  app.put('/api/pair/names', async (request, reply) => {
    const input: unknown = request.body;
    const parsed = namesSchema.safeParse(input);
    if (!parsed.success) return sendInvalidRequest(reply);

    try {
      services.updatePairNames.execute(parsed.data);
      return reply.code(200).send(appStateSchema.parse(services.getAppState.execute()));
    } catch (cause: unknown) {
      return sendPairError(reply, cause);
    }
  });
}

function sendInvalidRequest(reply: FastifyReply) {
  return reply.code(400).send({
    error: 'invalid_request',
    message: 'Vyplňte obě jména; každé může mít nejvýše 100 znaků.',
  });
}

function sendPairError(reply: FastifyReply, cause: unknown) {
  if (cause instanceof PairAlreadyInitializedError) {
    return reply.code(409).send({ error: 'pair_already_initialized', message: cause.message });
  }
  if (cause instanceof PairNotFoundError) {
    return reply.code(404).send({ error: 'pair_not_found', message: cause.message });
  }
  if (cause instanceof InvalidDisplayNameError) {
    return reply.code(400).send({ error: 'invalid_display_name', message: cause.message });
  }
  throw cause;
}
