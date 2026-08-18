import { access } from 'node:fs/promises';
import { join } from 'node:path';

import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';

import type { GetHealthQuery } from '../application/health/get-health.js';
import { registerHealthRoute } from './routes/health.js';
import { registerPairRoutes, type PairRouteServices } from './routes/pair.js';

export interface ServerOptions {
  readonly healthQuery: GetHealthQuery;
  readonly pairServices?: PairRouteServices;
  readonly staticRoot?: string | null;
  readonly logger?: boolean;
}

export async function buildServer(options: ServerOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  registerHealthRoute(app, options.healthQuery);
  if (options.pairServices) registerPairRoutes(app, options.pairServices);

  if (options.staticRoot) {
    await access(join(options.staticRoot, 'index.html'));
    await app.register(fastifyStatic, {
      root: options.staticRoot,
      wildcard: false,
    });

    app.setNotFoundHandler(async (request, reply) => {
      if (request.raw.method === 'GET' && !request.url.startsWith('/api/')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'not_found' });
    });
  }

  return app;
}
