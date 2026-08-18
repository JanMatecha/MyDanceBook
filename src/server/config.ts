import { resolve } from 'node:path';

import { z } from 'zod';

import { resolveDataPaths, type DataPaths } from '../persistence/data-directories.js';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MYDANCEBOOK_DATA_DIR: z.string().trim().min(1).optional(),
  HOST: z.string().trim().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
});

export interface AppConfig {
  readonly mode: 'development' | 'test' | 'production';
  readonly host: string;
  readonly port: number;
  readonly dataPaths: DataPaths;
  readonly migrationsDirectory: string;
  readonly staticRoot: string | null;
}

export class ConfigurationError extends Error {
  public constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ConfigurationError';
  }
}

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
  workingDirectory = process.cwd(),
): AppConfig {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    throw new ConfigurationError('Konfigurace prostředí není platná.', parsed.error);
  }

  const { NODE_ENV: mode, MYDANCEBOOK_DATA_DIR: configuredDataRoot } = parsed.data;
  if (mode === 'production' && !configuredDataRoot) {
    throw new ConfigurationError(
      'V produkci musí být MYDANCEBOOK_DATA_DIR nastaven na trvalý připojený adresář (v kontejneru /data).',
    );
  }
  if (mode === 'test' && !configuredDataRoot) {
    throw new ConfigurationError(
      'Test musí nastavit MYDANCEBOOK_DATA_DIR na vlastní dočasný adresář.',
    );
  }

  const dataRoot = configuredDataRoot ?? resolve(workingDirectory, '.data', 'development');

  return {
    mode,
    host: parsed.data.HOST,
    port: parsed.data.PORT,
    dataPaths: resolveDataPaths(dataRoot),
    migrationsDirectory: resolve(workingDirectory, 'migrations'),
    staticRoot: mode === 'production' ? resolve(workingDirectory, 'dist', 'frontend') : null,
  };
}
