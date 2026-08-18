import type { EntityId } from '../../domain/identity.js';
import type { DisplayName, Pair } from '../../domain/pair.js';

export interface NewPairMemberRecord {
  readonly id: EntityId;
  readonly role: 'LEADER' | 'FOLLOWER';
  readonly displayName: DisplayName;
}

export interface NewPairRecord {
  readonly id: EntityId;
  readonly leader: NewPairMemberRecord;
  readonly follower: NewPairMemberRecord;
  readonly createdAt: string;
}

export interface PairRepository {
  find(): Pair | null;
  create(record: NewPairRecord): boolean;
  updateDisplayNames(
    pairId: EntityId,
    leaderDisplayName: DisplayName,
    followerDisplayName: DisplayName,
    updatedAt: string,
  ): boolean;
}
