import { z } from 'zod';

const danceSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  internalName: z.string(),
  discipline: z.enum(['STANDARD', 'LATIN']),
  order: z.number().int(),
});
const figureVariantSchema = z.object({
  id: z.string().uuid(),
  figureId: z.string().uuid(),
  name: z.string(),
  timingNotation: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const figureSchema = z.object({
  id: z.string().uuid(),
  danceId: z.string().uuid(),
  nameCs: z.string().nullable(),
  nameEn: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  aliases: z.array(
    z.object({
      id: z.string().uuid(),
      figureId: z.string().uuid(),
      value: z.string(),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
    }),
  ),
  variants: z.array(figureVariantSchema).min(1),
});
const routineFigureSchema = z.object({
  id: z.string().uuid(),
  sectionId: z.string().uuid(),
  position: z.number().int().min(1),
  figureId: z.string().uuid().nullable(),
  figureVariantId: z.string().uuid().nullable(),
  figureNameCs: z.string().nullable(),
  figureNameEn: z.string().nullable(),
  figureVariantName: z.string().nullable(),
  figureVariantTimingNotation: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const routineSectionBaseSchema = z.object({
  id: z.string().uuid(),
  routineId: z.string().uuid(),
  name: z.string(),
  position: z.number().int().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const routineSectionSchema = routineSectionBaseSchema.extend({
  routineFigures: z.array(routineFigureSchema),
});
const routineSchema = z.object({
  id: z.string().uuid(),
  danceId: z.string().uuid(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  sections: z.array(routineSectionSchema).min(1),
});
const notebookSchema = z.object({
  dance: danceSchema,
  figures: z.array(figureSchema),
  routines: z.array(routineSchema),
});
const errorSchema = z.object({ message: z.string() });

export type DanceNotebook = z.infer<typeof notebookSchema>;
export type Figure = z.infer<typeof figureSchema>;
export type Routine = z.infer<typeof routineSchema>;
export type RoutineSection = z.infer<typeof routineSectionSchema>;
export type RoutineFigure = z.infer<typeof routineFigureSchema>;

export async function getDanceNotebook(
  danceId: string,
  signal?: AbortSignal,
): Promise<DanceNotebook> {
  return request(`/api/dances/${danceId}/notebook`, undefined, notebookSchema, signal);
}

export interface FigureNamesInput {
  readonly nameCs: string | null;
  readonly nameEn: string | null;
  readonly aliases?: readonly string[];
}
export async function addFigureAlias(figureId: string, alias: string): Promise<Figure> {
  return request(`/api/figures/${figureId}/aliases`, jsonPost({ alias }), figureSchema);
}
export async function removeFigureAlias(aliasId: string): Promise<Figure> {
  return request(`/api/figure-aliases/${aliasId}`, { method: 'DELETE' }, figureSchema);
}

export async function createFigure(danceId: string, names: FigureNamesInput): Promise<Figure> {
  return request(`/api/dances/${danceId}/figures`, jsonPost(names), figureSchema);
}

export async function updateFigureNames(
  figureId: string,
  names: FigureNamesInput,
): Promise<Figure> {
  return request(`/api/figures/${figureId}/names`, jsonPut(names), figureSchema);
}

export async function updateFigureVariantTiming(
  figureVariantId: string,
  timingNotation: string | null,
): Promise<Figure> {
  return request(
    `/api/figure-variants/${figureVariantId}/timing-notation`,
    jsonPut({ timingNotation }),
    figureSchema,
  );
}

export async function createRoutine(danceId: string, name: string): Promise<Routine> {
  return request(`/api/dances/${danceId}/routines`, jsonPost({ name }), routineSchema);
}

export async function createRoutineSection(
  routineId: string,
  name: string,
): Promise<z.infer<typeof routineSectionBaseSchema>> {
  return request(
    `/api/routines/${routineId}/sections`,
    jsonPost({ name }),
    routineSectionBaseSchema,
  );
}

export async function renameRoutineSection(
  routineSectionId: string,
  name: string,
): Promise<z.infer<typeof routineSectionBaseSchema>> {
  return request(
    `/api/routine-sections/${routineSectionId}/name`,
    jsonPut({ name }),
    routineSectionBaseSchema,
  );
}

export async function moveRoutineSection(
  routineSectionId: string,
  beforeRoutineSectionId: string | null,
): Promise<void> {
  await request(
    `/api/routine-sections/${routineSectionId}/move`,
    jsonPost({ beforeRoutineSectionId }),
    z.object({ status: z.literal('ok') }),
  );
}

export async function addPlaceholder(routineSectionId: string): Promise<RoutineFigure> {
  return request(
    `/api/routine-sections/${routineSectionId}/routine-figures`,
    { method: 'POST' },
    routineFigureSchema,
  );
}

export async function moveRoutineFigureToSection(
  routineFigureId: string,
  routineSectionId: string,
): Promise<void> {
  await request(
    `/api/routine-figures/${routineFigureId}/section`,
    jsonPut({ routineSectionId }),
    z.object({ status: z.literal('ok') }),
  );
}

export async function assignRoutineFigure(
  routineFigureId: string,
  figureId: string,
  figureVariantId: string | null,
): Promise<void> {
  await request(
    `/api/routine-figures/${routineFigureId}/assignment`,
    jsonPut({ figureId, figureVariantId }),
    z.object({ status: z.literal('ok') }),
  );
}

export async function createFigureForRoutineFigure(
  routineFigureId: string,
  names: FigureNamesInput,
): Promise<void> {
  await request(
    `/api/routine-figures/${routineFigureId}/figure`,
    jsonPost(names),
    z.object({ status: z.literal('ok') }),
  );
}

export async function moveRoutineFigure(
  routineFigureId: string,
  beforeRoutineFigureId: string | null,
): Promise<void> {
  await request(
    `/api/routine-figures/${routineFigureId}/move`,
    jsonPost({ beforeRoutineFigureId }),
    z.object({ status: z.literal('ok') }),
  );
}

export async function removeRoutineFigure(routineFigureId: string): Promise<void> {
  await request(
    `/api/routine-figures/${routineFigureId}`,
    { method: 'DELETE' },
    z.object({ status: z.literal('ok') }),
  );
}

function jsonPost(value: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  };
}

function jsonPut(value: unknown): RequestInit {
  return {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  };
}

async function request<T>(
  url: string,
  init: RequestInit | undefined,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, signal ? { ...init, signal } : init);
  const value: unknown = await response.json();
  if (!response.ok) {
    const error = errorSchema.safeParse(value);
    throw new Error(error.success ? error.data.message : `Požadavek selhal (${response.status}).`);
  }
  return schema.parse(value);
}
