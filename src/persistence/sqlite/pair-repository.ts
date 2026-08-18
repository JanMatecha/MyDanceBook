import type { NewPairRecord, PairRepository } from '../../application/pair/pair-repository.js';
import { parseEntityId, type EntityId } from '../../domain/identity.js';
import { toDisplayName, type DisplayName, type Pair, type PairMember } from '../../domain/pair.js';
import type { SqliteDatabase } from './database.js';

interface PairRow {
  readonly id: string;
  readonly created_at: string;
}

interface PairMemberRow {
  readonly id: string;
  readonly pair_id: string;
  readonly role: 'LEADER' | 'FOLLOWER';
  readonly display_name: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export class SqlitePairRepository implements PairRepository {
  public constructor(private readonly database: SqliteDatabase) {}

  public find(): Pair | null {
    const row = this.database
      .prepare('SELECT id, created_at FROM pairs WHERE singleton_key = 1')
      .get() as PairRow | undefined;
    if (!row) return null;

    const pairId = requireEntityId(row.id);
    const members = this.database
      .prepare(
        `SELECT id, pair_id, role, display_name, created_at, updated_at
         FROM pair_members WHERE pair_id = ? ORDER BY role`,
      )
      .all(row.id) as PairMemberRow[];
    const leader = members.find((member) => member.role === 'LEADER');
    const follower = members.find((member) => member.role === 'FOLLOWER');
    if (members.length !== 2 || !leader || !follower) {
      throw new Error('Databáze neobsahuje právě jednoho Leadera a jednoho Followera.');
    }

    return {
      id: pairId,
      leader: mapMember(leader),
      follower: mapMember(follower),
      createdAt: row.created_at,
    };
  }

  public create(record: NewPairRecord): boolean {
    const create = this.database.transaction(() => {
      this.database
        .prepare('INSERT INTO pairs (id, singleton_key, created_at) VALUES (?, 1, ?)')
        .run(record.id, record.createdAt);
      const insertMember = this.database.prepare(
        `INSERT INTO pair_members
          (id, pair_id, role, display_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      insertMember.run(
        record.leader.id,
        record.id,
        record.leader.role,
        record.leader.displayName,
        record.createdAt,
        record.createdAt,
      );
      insertMember.run(
        record.follower.id,
        record.id,
        record.follower.role,
        record.follower.displayName,
        record.createdAt,
        record.createdAt,
      );
    });

    try {
      create();
      return true;
    } catch (cause: unknown) {
      if (isUniquenessError(cause)) return false;
      throw cause;
    }
  }

  public updateDisplayNames(
    pairId: EntityId,
    leaderDisplayName: DisplayName,
    followerDisplayName: DisplayName,
    updatedAt: string,
  ): boolean {
    const update = this.database.transaction(() => {
      const pair = this.database.prepare('SELECT id FROM pairs WHERE id = ?').get(pairId);
      if (!pair) return false;

      const result = this.database
        .prepare(
          `UPDATE pair_members
           SET display_name = CASE role WHEN 'LEADER' THEN ? WHEN 'FOLLOWER' THEN ? END,
               updated_at = ?
           WHERE pair_id = ? AND role IN ('LEADER', 'FOLLOWER')`,
        )
        .run(leaderDisplayName, followerDisplayName, updatedAt, pairId);
      if (result.changes !== 2) {
        throw new Error('Jména nelze uložit, protože členové páru nejsou úplní.');
      }
      return true;
    });

    return update();
  }
}

function mapMember(row: PairMemberRow): PairMember {
  return {
    id: requireEntityId(row.id),
    pairId: requireEntityId(row.pair_id),
    role: row.role,
    displayName: toDisplayName(row.display_name),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireEntityId(value: string): EntityId {
  const id = parseEntityId(value);
  if (!id) throw new Error(`Databáze obsahuje neplatné UUIDv7 „${value}“.`);
  return id;
}

function isUniquenessError(cause: unknown): boolean {
  return (
    cause instanceof Error &&
    'code' in cause &&
    typeof cause.code === 'string' &&
    (cause.code === 'SQLITE_CONSTRAINT_UNIQUE' || cause.code === 'SQLITE_CONSTRAINT_PRIMARYKEY')
  );
}
