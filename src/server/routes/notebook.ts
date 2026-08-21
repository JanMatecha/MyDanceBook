import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import type {
  CreateFigureCommand,
  UpdateFigureNamesCommand,
  UpdateFigureVariantTimingCommand,
  AddFigureAliasCommand,
  RemoveFigureAliasCommand,
} from '../../application/figure/figure-use-cases.js';
import type { GetDanceNotebookQuery } from '../../application/routine/get-dance-notebook.js';
import {
  AddRoutineFigurePlaceholderCommand,
  AssignRoutineFigureCommand,
  CreateFigureForRoutineFigureCommand,
  CreateRoutineCommand,
  CreateRoutineSectionCommand,
  MoveRoutineFigureCommand,
  MoveRoutineFigureToSectionCommand,
  RemoveRoutineFigureCommand,
  MoveRoutineSectionCommand,
  RenameRoutineSectionCommand,
} from '../../application/routine/routine-use-cases.js';
import {
  InvalidFigureAliasError,
  InvalidFigureIdentifierError,
  InvalidFigureNameError,
} from '../../domain/figure.js';
import { parseEntityId } from '../../domain/identity.js';
import { InvalidRoutineNameError, InvalidRoutineSectionNameError } from '../../domain/routine.js';

const entityIdSchema = z
  .string()
  .uuid()
  .refine((value) => parseEntityId(value) !== null);
const danceParamsSchema = z.object({ danceId: entityIdSchema });
const figureParamsSchema = z.object({ figureId: entityIdSchema });
const figureAliasParamsSchema = z.object({ figureAliasId: entityIdSchema });
const figureVariantParamsSchema = z.object({ figureVariantId: entityIdSchema });
const routineParamsSchema = z.object({ routineId: entityIdSchema });
const routineSectionParamsSchema = z.object({ routineSectionId: entityIdSchema });
const routineFigureParamsSchema = z.object({ routineFigureId: entityIdSchema });
const nameSchema = z.object({ name: z.string() }).strict();
const figureNamesSchema = z
  .object({
    nameCs: z.string().nullable(),
    nameEn: z.string().nullable(),
    aliases: z.array(z.string()).optional(),
  })
  .strict();
const aliasSchema = z.object({ alias: z.string() }).strict();
const timingNotationSchema = z.object({ timingNotation: z.string().nullable() }).strict();
const assignmentSchema = z
  .object({ figureId: entityIdSchema, figureVariantId: entityIdSchema.nullable().optional() })
  .strict();
const moveSchema = z.object({ beforeRoutineFigureId: entityIdSchema.nullable() }).strict();
const moveSectionSchema = z.object({ beforeRoutineSectionId: entityIdSchema.nullable() }).strict();
const targetSectionSchema = z.object({ routineSectionId: entityIdSchema }).strict();

const danceSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  internalName: z.string(),
  discipline: z.enum(['STANDARD', 'LATIN']),
  order: z.number().int(),
});
const variantSchema = z.object({
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
  variants: z.array(variantSchema).min(1),
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

export interface NotebookRouteServices {
  readonly getDanceNotebook: GetDanceNotebookQuery;
  readonly createFigure: CreateFigureCommand;
  readonly updateFigureNames: UpdateFigureNamesCommand;
  readonly updateFigureVariantTiming: UpdateFigureVariantTimingCommand;
  readonly addFigureAlias?: AddFigureAliasCommand;
  readonly removeFigureAlias?: RemoveFigureAliasCommand;
  readonly createRoutine: CreateRoutineCommand;
  readonly createRoutineSection: CreateRoutineSectionCommand;
  readonly renameRoutineSection: RenameRoutineSectionCommand;
  readonly moveRoutineSection: MoveRoutineSectionCommand;
  readonly addPlaceholder: AddRoutineFigurePlaceholderCommand;
  readonly assignRoutineFigure: AssignRoutineFigureCommand;
  readonly createFigureForRoutineFigure: CreateFigureForRoutineFigureCommand;
  readonly moveRoutineFigure: MoveRoutineFigureCommand;
  readonly moveRoutineFigureToSection: MoveRoutineFigureToSectionCommand;
  readonly removeRoutineFigure: RemoveRoutineFigureCommand;
}

export function registerNotebookRoutes(
  app: FastifyInstance,
  services: NotebookRouteServices,
): void {
  app.get('/api/dances/:danceId/notebook', async (request, reply) => {
    const danceId = readId(danceParamsSchema.safeParse(request.params), reply);
    if (!danceId) return;
    const notebook = services.getDanceNotebook.execute(danceId);
    if (!notebook) return reply.code(404).send(notFound('dance_not_found', 'Tanec nebyl nalezen.'));
    return reply.code(200).send(notebookSchema.parse(notebook));
  });

  app.post('/api/dances/:danceId/figures', async (request, reply) => {
    const danceId = readId(danceParamsSchema.safeParse(request.params), reply);
    const input = figureNamesSchema.safeParse(request.body);
    if (!danceId || !input.success) return sendInvalidRequest(reply);
    if (!services.getDanceNotebook.execute(danceId)) {
      return reply.code(404).send(notFound('dance_not_found', 'Tanec nebyl nalezen.'));
    }
    try {
      return reply
        .code(201)
        .send(figureSchema.parse(services.createFigure.execute({ ...input.data, danceId })));
    } catch (cause: unknown) {
      return sendNotebookError(reply, cause);
    }
  });

  app.put('/api/figures/:figureId/names', async (request, reply) => {
    const figureId = readId(figureParamsSchema.safeParse(request.params), reply);
    const input = figureNamesSchema.safeParse(request.body);
    if (!figureId || !input.success) return sendInvalidRequest(reply);
    try {
      const figure = services.updateFigureNames.execute(figureId, input.data);
      if (!figure)
        return reply.code(404).send(notFound('figure_not_found', 'Figura nebyla nalezena.'));
      return reply.code(200).send(figureSchema.parse(figure));
    } catch (cause: unknown) {
      return sendNotebookError(reply, cause);
    }
  });

  app.post('/api/figures/:figureId/aliases', async (request, reply) => {
    const figureId = readId(figureParamsSchema.safeParse(request.params), reply);
    const input = aliasSchema.safeParse(request.body);
    if (!figureId || !input.success) return sendInvalidRequest(reply);
    try {
      const figure = services.addFigureAlias?.execute(figureId, input.data.alias);
      if (!figure)
        return reply.code(404).send(notFound('figure_not_found', 'Figura nebyla nalezena.'));
      return reply.code(201).send(figureSchema.parse(figure));
    } catch (cause: unknown) {
      return sendNotebookError(reply, cause);
    }
  });
  app.delete('/api/figure-aliases/:figureAliasId', async (request, reply) => {
    const aliasId = readId(figureAliasParamsSchema.safeParse(request.params), reply);
    if (!aliasId) return;
    const result = services.removeFigureAlias?.execute(aliasId);
    if (result === null)
      return reply.code(404).send(notFound('figure_alias_not_found', 'Přezdívka nebyla nalezena.'));
    if (result === 'last_identifier')
      return reply
        .code(400)
        .send({ error: 'invalid_request', message: 'Nelze odebrat poslední označení figury.' });
    return reply.code(200).send(figureSchema.parse(result));
  });

  app.put('/api/figure-variants/:figureVariantId/timing-notation', async (request, reply) => {
    const figureVariantId = readId(figureVariantParamsSchema.safeParse(request.params), reply);
    const input = timingNotationSchema.safeParse(request.body);
    if (!figureVariantId || !input.success) return sendInvalidRequest(reply);
    try {
      const figure = services.updateFigureVariantTiming.execute(
        figureVariantId,
        input.data.timingNotation,
      );
      if (!figure)
        return reply
          .code(404)
          .send(notFound('figure_variant_not_found', 'Varianta nebyla nalezena.'));
      return reply.code(200).send(figureSchema.parse(figure));
    } catch (cause: unknown) {
      return sendNotebookError(reply, cause);
    }
  });

  app.post('/api/dances/:danceId/routines', async (request, reply) => {
    const danceId = readId(danceParamsSchema.safeParse(request.params), reply);
    const input = nameSchema.safeParse(request.body);
    if (!danceId || !input.success) return sendInvalidRequest(reply);
    if (!services.getDanceNotebook.execute(danceId)) {
      return reply.code(404).send(notFound('dance_not_found', 'Tanec nebyl nalezen.'));
    }
    try {
      const routine = services.createRoutine.execute({ ...input.data, danceId });
      return reply.code(201).send(routineSchema.parse(routine));
    } catch (cause: unknown) {
      return sendNotebookError(reply, cause);
    }
  });

  app.post('/api/routines/:routineId/sections', async (request, reply) => {
    const routineId = readId(routineParamsSchema.safeParse(request.params), reply);
    const input = nameSchema.safeParse(request.body);
    if (!routineId || !input.success) return sendInvalidRequest(reply);
    try {
      const section = services.createRoutineSection.execute(routineId, input.data.name);
      if (!section) {
        return reply.code(404).send(notFound('routine_not_found', 'Sestava nebyla nalezena.'));
      }
      return reply.code(201).send(routineSectionBaseSchema.parse(section));
    } catch (cause: unknown) {
      return sendNotebookError(reply, cause);
    }
  });

  app.put('/api/routine-sections/:routineSectionId/name', async (request, reply) => {
    const routineSectionId = readId(routineSectionParamsSchema.safeParse(request.params), reply);
    const input = nameSchema.safeParse(request.body);
    if (!routineSectionId || !input.success) return sendInvalidRequest(reply);
    try {
      const section = services.renameRoutineSection.execute(routineSectionId, input.data.name);
      if (!section) {
        return reply
          .code(404)
          .send(notFound('routine_section_not_found', 'Část sestavy nebyla nalezena.'));
      }
      return reply.code(200).send(routineSectionBaseSchema.parse(section));
    } catch (cause: unknown) {
      return sendNotebookError(reply, cause);
    }
  });

  app.post('/api/routine-sections/:routineSectionId/move', async (request, reply) => {
    const routineSectionId = readId(routineSectionParamsSchema.safeParse(request.params), reply);
    const input = moveSectionSchema.safeParse(request.body);
    if (!routineSectionId || !input.success) return sendInvalidRequest(reply);
    const result = services.moveRoutineSection.execute(
      routineSectionId,
      requireIdOrNull(input.data.beforeRoutineSectionId),
    );
    if (result === 'not_found') {
      return reply
        .code(404)
        .send(notFound('routine_section_not_found', 'Část sestavy nebyla nalezena.'));
    }
    if (result === 'invalid_target') return sendInvalidRequest(reply);
    return reply.code(200).send({ status: 'ok' });
  });

  app.post('/api/routine-sections/:routineSectionId/routine-figures', async (request, reply) => {
    const routineSectionId = readId(routineSectionParamsSchema.safeParse(request.params), reply);
    if (!routineSectionId) return;
    const routineFigure = services.addPlaceholder.execute(routineSectionId);
    if (!routineFigure) {
      return reply
        .code(404)
        .send(notFound('routine_section_not_found', 'Část sestavy nebyla nalezena.'));
    }
    return reply.code(201).send(routineFigureSchema.parse(routineFigure));
  });

  app.put('/api/routine-figures/:routineFigureId/assignment', async (request, reply) => {
    const routineFigureId = readId(routineFigureParamsSchema.safeParse(request.params), reply);
    const input = assignmentSchema.safeParse(request.body);
    if (!routineFigureId || !input.success) return sendInvalidRequest(reply);
    const result = services.assignRoutineFigure.execute(
      routineFigureId,
      requireId(input.data.figureId),
      input.data.figureVariantId === undefined ? null : requireIdOrNull(input.data.figureVariantId),
    );
    return sendAssignmentResult(reply, result);
  });

  app.post('/api/routine-figures/:routineFigureId/figure', async (request, reply) => {
    const routineFigureId = readId(routineFigureParamsSchema.safeParse(request.params), reply);
    const input = figureNamesSchema.safeParse(request.body);
    if (!routineFigureId || !input.success) return sendInvalidRequest(reply);
    try {
      return sendAssignmentResult(
        reply,
        services.createFigureForRoutineFigure.execute(routineFigureId, input.data),
        201,
      );
    } catch (cause: unknown) {
      return sendNotebookError(reply, cause);
    }
  });

  app.post('/api/routine-figures/:routineFigureId/move', async (request, reply) => {
    const routineFigureId = readId(routineFigureParamsSchema.safeParse(request.params), reply);
    const input = moveSchema.safeParse(request.body);
    if (!routineFigureId || !input.success) return sendInvalidRequest(reply);
    const result = services.moveRoutineFigure.execute(
      routineFigureId,
      requireIdOrNull(input.data.beforeRoutineFigureId),
    );
    if (result === 'not_found') {
      return reply
        .code(404)
        .send(notFound('routine_figure_not_found', 'Výskyt figury nebyl nalezen.'));
    }
    if (result === 'invalid_target') return sendInvalidRequest(reply);
    return reply.code(200).send({ status: 'ok' });
  });

  app.put('/api/routine-figures/:routineFigureId/section', async (request, reply) => {
    const routineFigureId = readId(routineFigureParamsSchema.safeParse(request.params), reply);
    const input = targetSectionSchema.safeParse(request.body);
    if (!routineFigureId || !input.success) return sendInvalidRequest(reply);
    const result = services.moveRoutineFigureToSection.execute(
      routineFigureId,
      requireId(input.data.routineSectionId),
    );
    if (result === 'not_found') {
      return reply
        .code(404)
        .send(notFound('routine_figure_not_found', 'Výskyt figury nebyl nalezen.'));
    }
    if (result === 'invalid_target') return sendInvalidRequest(reply);
    return reply.code(200).send({ status: 'ok' });
  });

  app.delete('/api/routine-figures/:routineFigureId', async (request, reply) => {
    const routineFigureId = readId(routineFigureParamsSchema.safeParse(request.params), reply);
    if (!routineFigureId) return;
    const result = services.removeRoutineFigure.execute(routineFigureId);
    if (result === 'not_found') {
      return reply
        .code(404)
        .send(notFound('routine_figure_not_found', 'Výskyt figury nebyl nalezen.'));
    }
    return reply.code(200).send({ status: 'ok' });
  });
}

function readId(
  parsed: z.ZodSafeParseResult<{
    danceId?: string;
    figureId?: string;
    figureAliasId?: string;
    figureVariantId?: string;
    routineId?: string;
    routineSectionId?: string;
    routineFigureId?: string;
  }>,
  reply: FastifyReply,
) {
  if (!parsed.success) {
    sendInvalidRequest(reply);
    return null;
  }
  const value =
    parsed.data.danceId ??
    parsed.data.figureId ??
    parsed.data.figureAliasId ??
    parsed.data.figureVariantId ??
    parsed.data.routineId ??
    parsed.data.routineSectionId ??
    parsed.data.routineFigureId;
  return value === undefined ? null : parseEntityId(value);
}

function requireId(value: string) {
  const id = parseEntityId(value);
  if (!id) throw new Error('Neplatné UUIDv7 v ověřeném vstupu.');
  return id;
}

function requireIdOrNull(value: string | null) {
  return value === null ? null : requireId(value);
}

function sendAssignmentResult(
  reply: FastifyReply,
  result: 'updated' | 'not_found' | 'invalid_assignment',
  successStatus = 200,
) {
  if (result === 'not_found') {
    return reply
      .code(404)
      .send(notFound('routine_figure_not_found', 'Výskyt figury nebyl nalezen.'));
  }
  if (result === 'invalid_assignment') {
    return reply
      .code(400)
      .send(
        notFound('invalid_assignment', 'Vybraná figura nebo varianta nepatří do této sestavy.'),
      );
  }
  return reply.code(successStatus).send({ status: 'ok' });
}

function sendInvalidRequest(reply: FastifyReply) {
  return reply.code(400).send({
    error: 'invalid_request',
    message: 'Zkontrolujte zadané údaje.',
  });
}

function sendNotebookError(reply: FastifyReply, cause: unknown) {
  if (
    cause instanceof InvalidFigureNameError ||
    cause instanceof InvalidFigureAliasError ||
    cause instanceof InvalidFigureIdentifierError ||
    cause instanceof InvalidRoutineNameError ||
    cause instanceof InvalidRoutineSectionNameError
  ) {
    return reply.code(400).send({ error: 'invalid_request', message: cause.message });
  }
  throw cause;
}

function notFound(error: string, message: string) {
  return { error, message };
}
