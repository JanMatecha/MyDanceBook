import { access, mkdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

export interface DataPaths {
  readonly root: string;
  readonly databaseDirectory: string;
  readonly databaseFile: string;
  readonly backupsDirectory: string;
  readonly attachmentsDirectory: string;
  readonly repositoryDirectory: string;
}

export class DataDirectoryError extends Error {
  public constructor(path: string, cause: unknown) {
    super(`Datový adresář „${path}“ nelze vytvořit nebo do něj zapisovat.`, { cause });
    this.name = 'DataDirectoryError';
  }
}

export function resolveDataPaths(dataRoot: string): DataPaths {
  const root = resolve(dataRoot);
  const databaseDirectory = resolve(root, 'database');

  return {
    root,
    databaseDirectory,
    databaseFile: resolve(databaseDirectory, 'mydancebook.sqlite'),
    backupsDirectory: resolve(root, 'backups'),
    attachmentsDirectory: resolve(root, 'attachments'),
    repositoryDirectory: resolve(root, 'repository'),
  };
}

export async function ensureDataDirectories(paths: DataPaths): Promise<void> {
  const directories = [
    paths.root,
    paths.databaseDirectory,
    paths.backupsDirectory,
    paths.attachmentsDirectory,
    paths.repositoryDirectory,
  ];

  for (const directory of directories) {
    try {
      await mkdir(directory, { recursive: true });
      const details = await stat(directory);
      if (!details.isDirectory()) throw new Error('Cesta není adresář.');
      await access(directory, constants.R_OK | constants.W_OK);
    } catch (cause: unknown) {
      throw new DataDirectoryError(directory, cause);
    }
  }
}
