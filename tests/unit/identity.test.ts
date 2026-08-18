import { describe, expect, it } from 'vitest';

import { createEntityId, parseEntityId } from '../../src/domain/identity.js';

describe('EntityId', () => {
  it('creates UUIDv7 identifiers and accepts only UUIDv7 values', () => {
    const id = createEntityId();

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(id[14]).toBe('7');
    expect(parseEntityId(id)).toBe(id);
    expect(parseEntityId('00000000-0000-4000-8000-000000000000')).toBeNull();
    expect(parseEntityId('not-an-id')).toBeNull();
  });
});
