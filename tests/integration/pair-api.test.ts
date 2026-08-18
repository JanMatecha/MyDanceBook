import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { GetAppStateQuery } from '../../src/application/app-state/get-app-state.js';
import { GetHealthQuery } from '../../src/application/health/get-health.js';
import {
  InitializePairCommand,
  UpdatePairNamesCommand,
} from '../../src/application/pair/pair-use-cases.js';
import { resolveDataPaths } from '../../src/persistence/data-directories.js';
import { initializePersistence } from '../../src/persistence/initialize.js';
import { SqliteDanceCatalogue } from '../../src/persistence/sqlite/dance-catalogue.js';
import { SqlitePairRepository } from '../../src/persistence/sqlite/pair-repository.js';
import { buildServer } from '../../src/server/app.js';
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from '../helpers/temporary-directory.js';

describe('Pair onboarding API', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(removeTemporaryDirectory));
  });

  it('exposes the dance catalogue, creates one Pair, rejects repetition and persists name changes', async () => {
    const root = await createTemporaryDirectory('pair-api');
    temporaryDirectories.push(root);
    const persistence = await initializePersistence({
      paths: resolveDataPaths(root),
      migrationsDirectory: resolve('migrations'),
    });
    const pairs = new SqlitePairRepository(persistence.database);
    const dances = new SqliteDanceCatalogue(persistence.database);
    const app = await buildServer({
      healthQuery: new GetHealthQuery(persistence.healthStatusReader),
      pairServices: {
        getAppState: new GetAppStateQuery(pairs, dances),
        initializePair: new InitializePairCommand(pairs),
        updatePairNames: new UpdatePairNamesCommand(pairs),
      },
    });

    const initial = await app.inject({ method: 'GET', url: '/api/app-state' });
    expect(initial.statusCode).toBe(200);
    expect(initial.json()).toMatchObject({ status: 'needs_onboarding', pair: null });
    expect(initial.json().dances.map((dance: { code: string }) => dance.code)).toEqual([
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
    ]);

    const missingPair = await app.inject({
      method: 'PUT',
      url: '/api/pair/names',
      payload: { leaderDisplayName: 'Jan', followerDisplayName: 'Eva' },
    });
    expect(missingPair.statusCode).toBe(404);
    expect(missingPair.json()).toMatchObject({ error: 'pair_not_found' });

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/onboarding',
      payload: { leaderDisplayName: '', followerDisplayName: 'Eva' },
    });
    expect(invalid.statusCode).toBe(400);
    expect(persistence.database.prepare('SELECT COUNT(*) AS count FROM pairs').get()).toEqual({
      count: 0,
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/onboarding',
      payload: { leaderDisplayName: '  Jan  ', followerDisplayName: '  Eva  ' },
    });
    expect(created.statusCode).toBe(201);
    const createdState = created.json();
    expect(createdState).toMatchObject({
      status: 'ready',
      pair: {
        leader: { role: 'LEADER', displayName: 'Jan' },
        follower: { role: 'FOLLOWER', displayName: 'Eva' },
      },
    });
    expect(createdState.pair.id[14]).toBe('7');
    expect(createdState.pair.leader.id[14]).toBe('7');
    expect(createdState.pair.follower.id[14]).toBe('7');

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/onboarding',
      payload: { leaderDisplayName: 'Jiný', followerDisplayName: 'Pár' },
    });
    expect(duplicate.statusCode).toBe(409);

    const renamed = await app.inject({
      method: 'PUT',
      url: '/api/pair/names',
      payload: { leaderDisplayName: 'Honza', followerDisplayName: 'Eliška' },
    });
    expect(renamed.statusCode).toBe(200);
    expect(renamed.json()).toMatchObject({
      status: 'ready',
      pair: {
        id: createdState.pair.id,
        leader: { id: createdState.pair.leader.id, displayName: 'Honza' },
        follower: { id: createdState.pair.follower.id, displayName: 'Eliška' },
      },
    });

    await app.close();
    persistence.close();
  });
});
