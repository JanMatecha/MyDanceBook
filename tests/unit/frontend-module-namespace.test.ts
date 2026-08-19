import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('frontend module namespace', () => {
  it('keeps top-level source modules outside the backend /api proxy namespace', async () => {
    const entries = await readdir(resolve('src/frontend'), { withFileTypes: true });
    const collisions = entries
      .filter((entry) => entry.name.startsWith('api'))
      .map((entry) => entry.name);

    expect(collisions).toEqual([]);
  });
});
