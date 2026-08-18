import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveDataPaths } from '../../src/persistence/data-directories.js';
import { initializePersistence } from '../../src/persistence/initialize.js';
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from '../helpers/temporary-directory.js';

describe('SQLite initialization', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(removeTemporaryDirectory));
  });

  it('enables safety pragmas and applies the migration history exactly once', async () => {
    const root = await createTemporaryDirectory('sqlite-init');
    temporaryDirectories.push(root);
    const options = {
      paths: resolveDataPaths(root),
      migrationsDirectory: resolve('migrations'),
    };

    const first = await initializePersistence(options);
    expect(first.database.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(first.database.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(first.database.pragma('busy_timeout', { simple: true })).toBe(5000);
    expect(first.database.pragma('integrity_check', { simple: true })).toBe('ok');
    expect(first.database.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get()).toEqual(
      { count: 2 },
    );
    expect(first.database.prepare('SELECT COUNT(*) AS count FROM dances').get()).toEqual({
      count: 10,
    });
    first.close();

    const second = await initializePersistence(options);
    expect(
      second.database.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get(),
    ).toEqual({ count: 2 });
    second.close();
  });
});
