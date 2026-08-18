import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  DataDirectoryError,
  ensureDataDirectories,
  resolveDataPaths,
} from '../../src/persistence/data-directories.js';
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from '../helpers/temporary-directory.js';

describe('persistent data directories', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(removeTemporaryDirectory));
  });

  it('creates the database, backup and reserved directories below one root', async () => {
    const parent = await createTemporaryDirectory('directories');
    temporaryDirectories.push(parent);
    const paths = resolveDataPaths(join(parent, 'data'));

    await expect(ensureDataDirectories(paths)).resolves.toBeUndefined();
    await expect(ensureDataDirectories(paths)).resolves.toBeUndefined();
  });

  it('fails clearly when the configured root is not a usable directory', async () => {
    const parent = await createTemporaryDirectory('unusable');
    temporaryDirectories.push(parent);
    const filePath = join(parent, 'not-a-directory');
    await writeFile(filePath, 'occupied', 'utf8');

    await expect(ensureDataDirectories(resolveDataPaths(filePath))).rejects.toBeInstanceOf(
      DataDirectoryError,
    );
  });
});
