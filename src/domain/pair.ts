import type { EntityId } from './identity.js';

declare const displayNameBrand: unique symbol;

export type DisplayName = string & { readonly [displayNameBrand]: true };
export type PairMemberRole = 'LEADER' | 'FOLLOWER';

export interface PairMember {
  readonly id: EntityId;
  readonly pairId: EntityId;
  readonly role: PairMemberRole;
  readonly displayName: DisplayName;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Pair {
  readonly id: EntityId;
  readonly leader: PairMember;
  readonly follower: PairMember;
  readonly createdAt: string;
}

export class InvalidDisplayNameError extends Error {
  public constructor() {
    super('Zobrazované jméno musí obsahovat 1 až 100 znaků.');
    this.name = 'InvalidDisplayNameError';
  }
}

export function toDisplayName(value: string): DisplayName {
  const normalized = value.trim();
  const length = Array.from(normalized).length;
  if (length < 1 || length > 100) throw new InvalidDisplayNameError();
  return normalized as DisplayName;
}
