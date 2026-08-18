import { mkdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';

import Database from 'better-sqlite3';
import { v7 as uuidv7 } from 'uuid';

import type { SqliteDatabase } from './database.js';
import { readCurrentMigrationVersion } from './migrations.js';

export interface BackupOptions {
  readonly database: SqliteDatabase;
  readonly backupDirectory: string;
  readonly reason: string;
  readonly now?: () => Date;
}

export interface VerifiedBackup {
  readonly path: string;
  readonly migrationVersion: number;
  readonly reason: string;
  readonly createdAt: string;
}

export class BackupError extends Error {
  public constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = 'BackupError';
  }
}

export async function createVerifiedBackup(options: BackupOptions): Promise<VerifiedBackup> {
  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  const timestamp = createdAt.replaceAll('-', '').replaceAll(':', '').replace('.', '');
  const baseName = `mydancebook-${timestamp}-${uuidv7()}`;
  const temporaryPath = join(options.backupDirectory, `.${baseName}.incomplete`);
  const finalPath = join(options.backupDirectory, `${baseName}.sqlite`);

  try {
    await mkdir(options.backupDirectory, { recursive: true });
    const expectedVersion = readCurrentMigrationVersion(options.database);
    await options.database.backup(temporaryPath);
    const verifiedVersion = verifyBackup(temporaryPath, expectedVersion);
    await rename(temporaryPath, finalPath);

    return {
      path: finalPath,
      migrationVersion: verifiedVersion,
      reason: options.reason,
      createdAt,
    };
  } catch (cause: unknown) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw new BackupError('Ověřenou SQLite zálohu se nepodařilo vytvořit.', cause);
  }
}

function verifyBackup(path: string, expectedVersion: number): number {
  const backup = new Database(path, { readonly: true, fileMustExist: true });

  try {
    const integrity = backup.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') {
      throw new Error(`SQLite integrity_check vrátil „${String(integrity)}“.`);
    }

    const table = backup
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
      .get() as { name: string } | undefined;
    if (!table) throw new Error('Záloha neobsahuje historii migrací.');

    const version = readCurrentMigrationVersion(backup);
    if (version !== expectedVersion) {
      throw new Error(
        `Verze migrací v záloze ${version} neodpovídá očekávané verzi ${expectedVersion}.`,
      );
    }

    return version;
  } finally {
    backup.close();
  }
}
