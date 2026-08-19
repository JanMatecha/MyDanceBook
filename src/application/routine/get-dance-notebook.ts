import type { Dance } from '../../domain/dance.js';
import type { EntityId } from '../../domain/identity.js';
import type { FigureRepository } from '../figure/figure-repository.js';
import type { DanceCatalogue } from '../app-state/get-app-state.js';
import type { RoutineRepository } from './routine-repository.js';

export interface DanceNotebook {
  readonly dance: Dance;
  readonly figures: ReturnType<FigureRepository['listByDance']>;
  readonly routines: ReturnType<RoutineRepository['listByDance']>;
}

export class GetDanceNotebookQuery {
  public constructor(
    private readonly dances: DanceCatalogue,
    private readonly figures: FigureRepository,
    private readonly routines: RoutineRepository,
  ) {}

  public execute(danceId: EntityId): DanceNotebook | null {
    const dance = this.dances.list().find((item) => item.id === danceId);
    if (!dance) return null;
    return {
      dance,
      figures: this.figures.listByDance(danceId),
      routines: this.routines.listByDance(danceId),
    };
  }
}
