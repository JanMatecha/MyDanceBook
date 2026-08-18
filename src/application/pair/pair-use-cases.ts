import { createEntityId, type EntityId } from '../../domain/identity.js';
import { toDisplayName, type Pair } from '../../domain/pair.js';
import type { PairRepository } from './pair-repository.js';

export interface PairNamesInput {
  readonly leaderDisplayName: string;
  readonly followerDisplayName: string;
}

export class PairAlreadyInitializedError extends Error {
  public constructor() {
    super('Pár už byl vytvořen.');
    this.name = 'PairAlreadyInitializedError';
  }
}

export class PairNotFoundError extends Error {
  public constructor() {
    super('Pár nebyl nalezen.');
    this.name = 'PairNotFoundError';
  }
}

export class InitializePairCommand {
  public constructor(
    private readonly repository: PairRepository,
    private readonly createId: () => EntityId = createEntityId,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(input: PairNamesInput): Pair {
    if (this.repository.find()) throw new PairAlreadyInitializedError();

    const createdAt = this.now().toISOString();
    const record = {
      id: this.createId(),
      leader: {
        id: this.createId(),
        role: 'LEADER' as const,
        displayName: toDisplayName(input.leaderDisplayName),
      },
      follower: {
        id: this.createId(),
        role: 'FOLLOWER' as const,
        displayName: toDisplayName(input.followerDisplayName),
      },
      createdAt,
    };

    if (!this.repository.create(record)) throw new PairAlreadyInitializedError();
    const pair = this.repository.find();
    if (!pair) throw new Error('Vytvořený pár nelze znovu načíst.');
    return pair;
  }
}

export class UpdatePairNamesCommand {
  public constructor(
    private readonly repository: PairRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(input: PairNamesInput): Pair {
    const pair = this.repository.find();
    if (!pair) throw new PairNotFoundError();

    const updated = this.repository.updateDisplayNames(
      pair.id,
      toDisplayName(input.leaderDisplayName),
      toDisplayName(input.followerDisplayName),
      this.now().toISOString(),
    );
    if (!updated) throw new PairNotFoundError();

    const current = this.repository.find();
    if (!current) throw new PairNotFoundError();
    return current;
  }
}
