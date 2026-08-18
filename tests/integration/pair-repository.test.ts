import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  InitializePairCommand,
  PairAlreadyInitializedError,
  UpdatePairNamesCommand,
} from '../../src/application/pair/pair-use-cases.js';
import { parseEntityId } from '../../src/domain/identity.js';
import { toDisplayName } from '../../src/domain/pair.js';
import { resolveDataPaths } from '../../src/persistence/data-directories.js';
import { initializePersistence } from '../../src/persistence/initialize.js';
import { SqlitePairRepository } from '../../src/persistence/sqlite/pair-repository.js';
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from '../helpers/temporary-directory.js';

describe('SQLite pair repository', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(removeTemporaryDirectory));
  });

  it('creates one complete Pair transactionally and updates names without changing identities', async () => {
    const root = await createTemporaryDirectory('pair-repository');
    temporaryDirectories.push(root);
    const persistence = await initializePersistence({
      paths: resolveDataPaths(root),
      migrationsDirectory: resolve('migrations'),
    });
    const repository = new SqlitePairRepository(persistence.database);
    const original = new InitializePairCommand(repository).execute({
      leaderDisplayName: 'Jan',
      followerDisplayName: 'Eva',
    });

    expect(persistence.database.prepare('SELECT COUNT(*) AS count FROM pairs').get()).toEqual({
      count: 1,
    });
    expect(
      persistence.database.prepare('SELECT role FROM pair_members ORDER BY role').all(),
    ).toEqual([{ role: 'FOLLOWER' }, { role: 'LEADER' }]);
    expect(() =>
      new InitializePairCommand(repository).execute({
        leaderDisplayName: 'Jiný',
        followerDisplayName: 'Pár',
      }),
    ).toThrow(PairAlreadyInitializedError);
    expect(
      persistence.database.prepare('SELECT COUNT(*) AS count FROM pair_members').get(),
    ).toEqual({ count: 2 });

    const updated = new UpdatePairNamesCommand(repository).execute({
      leaderDisplayName: 'Honza',
      followerDisplayName: 'Eliška',
    });
    expect(updated.id).toBe(original.id);
    expect(updated.leader.id).toBe(original.leader.id);
    expect(updated.follower.id).toBe(original.follower.id);
    expect(updated.leader.displayName).toBe('Honza');
    expect(updated.follower.displayName).toBe('Eliška');
    expect(persistence.database.pragma('foreign_key_check')).toEqual([]);
    persistence.close();
  });

  it('rejects orphan members and a second singleton Pair at the database boundary', async () => {
    const root = await createTemporaryDirectory('pair-constraints');
    temporaryDirectories.push(root);
    const persistence = await initializePersistence({
      paths: resolveDataPaths(root),
      migrationsDirectory: resolve('migrations'),
    });

    expect(() =>
      persistence.database
        .prepare(
          `INSERT INTO pair_members
            (id, pair_id, role, display_name, created_at, updated_at)
           VALUES (?, ?, 'LEADER', 'Jan', ?, ?)`,
        )
        .run(
          '01a01352-b78a-76fd-8ba8-f6ca29c7aca6',
          '01a01352-b78c-772b-a92b-8201ea95a250',
          '2026-08-18T06:00:00.000Z',
          '2026-08-18T06:00:00.000Z',
        ),
    ).toThrow();

    persistence.database
      .prepare('INSERT INTO pairs (id, singleton_key, created_at) VALUES (?, 1, ?)')
      .run('01a01352-b78a-76fd-8ba8-f6ca29c7aca6', '2026-08-18T06:00:00.000Z');
    expect(() =>
      persistence.database
        .prepare('INSERT INTO pairs (id, singleton_key, created_at) VALUES (?, 1, ?)')
        .run('01a01352-b78c-772b-a92b-8201ea95a250', '2026-08-18T06:00:00.000Z'),
    ).toThrow();
    persistence.close();
  });

  it('rolls back the whole Pair when either member cannot be inserted', async () => {
    const root = await createTemporaryDirectory('pair-create-rollback');
    temporaryDirectories.push(root);
    const persistence = await initializePersistence({
      paths: resolveDataPaths(root),
      migrationsDirectory: resolve('migrations'),
    });
    const repository = new SqlitePairRepository(persistence.database);
    const duplicatedMemberId = requireEntityId('01a01352-b78c-772b-a92b-8201ea95a250');

    expect(
      repository.create({
        id: requireEntityId('01a01352-b78a-76fd-8ba8-f6ca29c7aca6'),
        leader: {
          id: duplicatedMemberId,
          role: 'LEADER',
          displayName: toDisplayName('Jan'),
        },
        follower: {
          id: duplicatedMemberId,
          role: 'FOLLOWER',
          displayName: toDisplayName('Eva'),
        },
        createdAt: '2026-08-18T06:00:00.000Z',
      }),
    ).toBe(false);
    expect(persistence.database.prepare('SELECT COUNT(*) AS count FROM pairs').get()).toEqual({
      count: 0,
    });
    expect(
      persistence.database.prepare('SELECT COUNT(*) AS count FROM pair_members').get(),
    ).toEqual({ count: 0 });
    persistence.close();
  });

  it('rolls back the first name update when both members cannot be updated', async () => {
    const root = await createTemporaryDirectory('pair-update-rollback');
    temporaryDirectories.push(root);
    const persistence = await initializePersistence({
      paths: resolveDataPaths(root),
      migrationsDirectory: resolve('migrations'),
    });
    const repository = new SqlitePairRepository(persistence.database);
    const pair = new InitializePairCommand(repository).execute({
      leaderDisplayName: 'Jan',
      followerDisplayName: 'Eva',
    });
    persistence.database
      .prepare("DELETE FROM pair_members WHERE pair_id = ? AND role = 'FOLLOWER'")
      .run(pair.id);

    expect(() =>
      repository.updateDisplayNames(
        pair.id,
        toDisplayName('Honza'),
        toDisplayName('Eliška'),
        '2026-08-18T07:00:00.000Z',
      ),
    ).toThrow('Jména nelze uložit, protože členové páru nejsou úplní.');
    expect(
      persistence.database
        .prepare("SELECT display_name FROM pair_members WHERE pair_id = ? AND role = 'LEADER'")
        .get(pair.id),
    ).toEqual({ display_name: 'Jan' });
    persistence.close();
  });
});

function requireEntityId(value: string) {
  const id = parseEntityId(value);
  if (!id) throw new Error(`Testovací hodnota ${value} není UUIDv7.`);
  return id;
}
