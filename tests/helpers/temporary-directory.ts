import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function createTemporaryDirectory(label: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `mydancebook-${label}-`));
}

export async function removeTemporaryDirectory(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}
