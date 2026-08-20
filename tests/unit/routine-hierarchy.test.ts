import { describe, expect, it } from 'vitest';

import type { Routine } from '../../src/frontend/client/notebook.js';
import { flattenRoutineFigures } from '../../src/frontend/routine-hierarchy.js';

const timestamp = '2026-08-19T08:00:00.000Z';

describe('Routine hierarchy numbering', () => {
  it('derives one sequential display order from ordered Sections and their local occurrence order', () => {
    const routine = {
      id: '0198c400-0000-7000-8000-000000000001',
      danceId: '0198c400-0000-7000-8000-000000000002',
      name: 'Waltz E',
      createdAt: timestamp,
      updatedAt: timestamp,
      sections: [
        section('0198c400-0000-7000-8000-000000000003', 'První dlouhá strana', [
          occurrence('0198c400-0000-7000-8000-000000000005', 1),
          occurrence('0198c400-0000-7000-8000-000000000006', 2),
        ]),
        section('0198c400-0000-7000-8000-000000000004', 'První krátká strana', [
          occurrence('0198c400-0000-7000-8000-000000000007', 1),
          occurrence('0198c400-0000-7000-8000-000000000008', 2),
        ]),
      ],
    } satisfies Routine;

    expect(
      flattenRoutineFigures(routine).map(
        ({ routineSection, routineFigure, displayPosition, sectionIndex }) => ({
          section: routineSection.name,
          id: routineFigure.id,
          localPosition: routineFigure.position,
          displayPosition,
          sectionIndex,
        }),
      ),
    ).toEqual([
      {
        section: 'První dlouhá strana',
        id: '0198c400-0000-7000-8000-000000000005',
        localPosition: 1,
        displayPosition: 1,
        sectionIndex: 0,
      },
      {
        section: 'První dlouhá strana',
        id: '0198c400-0000-7000-8000-000000000006',
        localPosition: 2,
        displayPosition: 2,
        sectionIndex: 1,
      },
      {
        section: 'První krátká strana',
        id: '0198c400-0000-7000-8000-000000000007',
        localPosition: 1,
        displayPosition: 3,
        sectionIndex: 0,
      },
      {
        section: 'První krátká strana',
        id: '0198c400-0000-7000-8000-000000000008',
        localPosition: 2,
        displayPosition: 4,
        sectionIndex: 1,
      },
    ]);
  });
});

function section(
  id: string,
  name: string,
  routineFigures: Routine['sections'][number]['routineFigures'],
) {
  return {
    id,
    routineId: '0198c400-0000-7000-8000-000000000001',
    name,
    position: name === 'První dlouhá strana' ? 1 : 2,
    createdAt: timestamp,
    updatedAt: timestamp,
    routineFigures,
  };
}

function occurrence(id: string, position: number) {
  return {
    id,
    sectionId:
      id < '0198c400-0000-7000-8000-000000000007'
        ? '0198c400-0000-7000-8000-000000000003'
        : '0198c400-0000-7000-8000-000000000004',
    position,
    figureId: null,
    figureVariantId: null,
    figureNameCs: null,
    figureNameEn: null,
    figureVariantName: null,
    figureVariantTimingNotation: null,
    done: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
