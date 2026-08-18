import { z } from 'zod';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  application: z.literal('MyDanceBook'),
  database: z.object({
    status: z.literal('ok'),
    migrationVersion: z.number().int().nonnegative(),
  }),
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', { signal });

  if (!response.ok) {
    throw new Error(`Kontrola služby selhala se stavem ${response.status}.`);
  }

  const value: unknown = await response.json();
  return healthResponseSchema.parse(value);
}
