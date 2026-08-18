import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { GetHealthQuery } from '../../application/health/get-health.js';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  application: z.literal('MyDanceBook'),
  database: z.object({
    status: z.literal('ok'),
    migrationVersion: z.number().int().nonnegative(),
  }),
  timestamp: z.iso.datetime(),
});

export function registerHealthRoute(app: FastifyInstance, query: GetHealthQuery): void {
  app.get('/api/health', async (_request, reply) => {
    const response = healthResponseSchema.parse(query.execute());
    return reply.code(200).send(response);
  });
}
