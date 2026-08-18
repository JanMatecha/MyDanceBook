import type { Dance } from '../../domain/dance.js';
import type { Pair } from '../../domain/pair.js';
import type { PairRepository } from '../pair/pair-repository.js';

export interface DanceCatalogue {
  list(): readonly Dance[];
}

export type AppState =
  | { readonly status: 'needs_onboarding'; readonly pair: null; readonly dances: readonly Dance[] }
  | { readonly status: 'ready'; readonly pair: Pair; readonly dances: readonly Dance[] };

export class GetAppStateQuery {
  public constructor(
    private readonly pairs: PairRepository,
    private readonly dances: DanceCatalogue,
  ) {}

  public execute(): AppState {
    const pair = this.pairs.find();
    const dances = this.dances.list();
    return pair
      ? { status: 'ready', pair, dances }
      : { status: 'needs_onboarding', pair: null, dances };
  }
}
