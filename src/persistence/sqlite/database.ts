import Database from 'better-sqlite3';

export type SqliteDatabase = Database.Database;

export function openDatabase(databaseFile: string): SqliteDatabase {
  const database = new Database(databaseFile);

  try {
    database.pragma('foreign_keys = ON');
    database.pragma('journal_mode = WAL');
    database.pragma('busy_timeout = 5000');
    return database;
  } catch (cause: unknown) {
    database.close();
    throw new Error(`SQLite databázi „${databaseFile}“ se nepodařilo inicializovat.`, {
      cause,
    });
  }
}
