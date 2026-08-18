import type { EntityId } from './identity.js';

export type DanceDiscipline = 'STANDARD' | 'LATIN';

export type DanceCode =
  | 'WALTZ'
  | 'TANGO'
  | 'VIENNESE_WALTZ'
  | 'SLOW_FOXTROT'
  | 'QUICKSTEP'
  | 'SAMBA'
  | 'CHA_CHA_CHA'
  | 'RUMBA'
  | 'PASO_DOBLE'
  | 'JIVE';

export interface Dance {
  readonly id: EntityId;
  readonly code: DanceCode;
  readonly internalName: string;
  readonly discipline: DanceDiscipline;
  readonly order: number;
}
