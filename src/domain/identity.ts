import { v7 as uuidv7, validate as validateUuid, version as uuidVersion } from 'uuid';

declare const entityIdBrand: unique symbol;

export type EntityId = string & { readonly [entityIdBrand]: true };

export function createEntityId(): EntityId {
  return uuidv7() as EntityId;
}

export function parseEntityId(value: string): EntityId | null {
  return validateUuid(value) && uuidVersion(value) === 7 ? (value as EntityId) : null;
}
