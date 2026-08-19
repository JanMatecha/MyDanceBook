import type { Routine, RoutineFigure, RoutineSection } from './client/notebook';

export interface FlattenedRoutineFigure {
  readonly routineSection: RoutineSection;
  readonly routineFigure: RoutineFigure;
  readonly displayPosition: number;
  readonly sectionIndex: number;
}

export function flattenRoutineFigures(routine: Routine): readonly FlattenedRoutineFigure[] {
  let displayPosition = 0;
  return routine.sections.flatMap((routineSection) =>
    routineSection.routineFigures.map((routineFigure, sectionIndex) => ({
      routineSection,
      routineFigure,
      displayPosition: (displayPosition += 1),
      sectionIndex,
    })),
  );
}
