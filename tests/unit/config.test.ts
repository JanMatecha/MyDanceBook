import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ConfigurationError, loadConfig } from '../../src/server/config.js';

describe('runtime configuration', () => {
  it('requires an explicit persistent data root in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' }, 'C:\\application')).toThrow(
      ConfigurationError,
    );
  });

  it('requires each test run to provide its own data root', () => {
    expect(() => loadConfig({ NODE_ENV: 'test' }, 'C:\\application')).toThrow(
      ConfigurationError,
    );
  });

  it('derives every persistent path below the configured root', () => {
    const workingDirectory = resolve('application');
    const dataRoot = resolve('persistent-data');
    const config = loadConfig(
      {
        NODE_ENV: 'production',
        MYDANCEBOOK_DATA_DIR: dataRoot,
        HOST: '127.0.0.1',
        PORT: '3210',
      },
      workingDirectory,
    );

    expect(config.dataPaths.root).toBe(dataRoot);
    expect(config.dataPaths.databaseFile.startsWith(dataRoot)).toBe(true);
    expect(config.dataPaths.backupsDirectory.startsWith(dataRoot)).toBe(true);
    expect(config.dataPaths.attachmentsDirectory.startsWith(dataRoot)).toBe(true);
    expect(config.dataPaths.repositoryDirectory.startsWith(dataRoot)).toBe(true);
    expect(config.port).toBe(3210);
    expect(config.staticRoot).toBe(resolve(workingDirectory, 'dist', 'frontend'));
  });

  it('uses a repository-local development directory only outside production and test', () => {
    const workingDirectory = resolve('application');
    const config = loadConfig({ NODE_ENV: 'development' }, workingDirectory);

    expect(config.dataPaths.root).toBe(resolve(workingDirectory, '.data', 'development'));
  });
});
