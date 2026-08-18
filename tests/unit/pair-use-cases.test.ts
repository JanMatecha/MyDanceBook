import { describe, expect, it } from 'vitest';

import type { NewPairRecord, PairRepository } from '../../src/application/pair/pair-repository.js';
import {
  InitializePairCommand,
  PairAlreadyInitializedError,
  UpdatePairNamesCommand,
} from '../../src/application/pair/pair-use-cases.js';
import { parseEntityId, type EntityId } from '../../src/domain/identity.js';
import type { DisplayName, Pair } from '../../src/domain/pair.js';

const ids = [
  requireId('01a01352-b78a-76fd-8ba8-f6ca29c7aca6'),
  requireId('01a01352-b78c-772b-a92b-8201ea95a250'),
  requireId('01a01352-b78c-772b-a92b-87b63bdd5c24'),
];

describe('pair use cases', () => {
  it('creates exactly one pair with trimmed Leader and Follower names', () => {
    const repository = new MemoryPairRepository();
    let nextId = 0;
    const command = new InitializePairCommand(
      repository,
      () => ids[nextId++]!,
      () => new Date('2026-08-18T06:00:00.000Z'),
    );

    const pair = command.execute({
      leaderDisplayName: '  Jan  ',
      followerDisplayName: '  Eva  ',
    });

    expect(pair.leader.displayName).toBe('Jan');
    expect(pair.follower.displayName).toBe('Eva');
    expect(pair.leader.role).toBe('LEADER');
    expect(pair.follower.role).toBe('FOLLOWER');
    expect(() =>
      command.execute({ leaderDisplayName: 'Jiný', followerDisplayName: 'Pár' }),
    ).toThrow(PairAlreadyInitializedError);
  });

  it('updates both member names while retaining all stable identities', () => {
    const repository = new MemoryPairRepository();
    let nextId = 0;
    const initialize = new InitializePairCommand(repository, () => ids[nextId++]!);
    const original = initialize.execute({ leaderDisplayName: 'Jan', followerDisplayName: 'Eva' });

    const updated = new UpdatePairNamesCommand(
      repository,
      () => new Date('2026-08-18T07:00:00.000Z'),
    ).execute({ leaderDisplayName: 'Honza', followerDisplayName: 'Eliška' });

    expect(updated.id).toBe(original.id);
    expect(updated.leader.id).toBe(original.leader.id);
    expect(updated.follower.id).toBe(original.follower.id);
    expect(updated.leader.displayName).toBe('Honza');
    expect(updated.follower.displayName).toBe('Eliška');
  });
});

class MemoryPairRepository implements PairRepository {
  private pair: Pair | null = null;

  public find(): Pair | null {
    return this.pair;
  }

  public create(record: NewPairRecord): boolean {
    if (this.pair) return false;
    this.pair = {
      id: record.id,
      leader: {
        ...record.leader,
        pairId: record.id,
        createdAt: record.createdAt,
        updatedAt: record.createdAt,
      },
      follower: {
        ...record.follower,
        pairId: record.id,
        createdAt: record.createdAt,
        updatedAt: record.createdAt,
      },
      createdAt: record.createdAt,
    };
    return true;
  }

  public updateDisplayNames(
    pairId: EntityId,
    leaderDisplayName: DisplayName,
    followerDisplayName: DisplayName,
    updatedAt: string,
  ): boolean {
    if (!this.pair || this.pair.id !== pairId) return false;
    this.pair = {
      ...this.pair,
      leader: { ...this.pair.leader, displayName: leaderDisplayName, updatedAt },
      follower: { ...this.pair.follower, displayName: followerDisplayName, updatedAt },
    };
    return true;
  }
}

function requireId(value: string): EntityId {
  const id = parseEntityId(value);
  if (!id) throw new Error('Test UUID musí být UUIDv7.');
  return id;
}
