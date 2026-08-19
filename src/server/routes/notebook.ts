import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { CreateFigureCommand } from '../../application/figure/figure-use-cases.js';
import type { GetDanceNotebookQuery } from '../../application/routine/get-dance-notebook.js';
import {
  AddRoutineFigurePlaceholderCommand,
  AssignRoutineFigureCommand,
  CreateFigureForRoutineFigureCommand,
  CreateRoutineCommand,
  MoveRoutineFigureCommand,
  SetRoutineFigureDoneCommand,
} from '../../application/routine/routine-use-cases.js';
import { InvalidFigureNameError } from '../../domain/figure.js';
import { parseEntityId } from '../../domain/identity.js';
import { InvalidRoutineNameError } from '../../domain/routine.js';

const entityIdSchema = z
  .string()
  .uuid()
  .refine((value) => parseEntityId(value) !== null);
const danceParamsSchema = z.object({ danceId: entityIdSchema });
const routineParamsSchema = z.object({ routineId: entityIdSchema });
const routineFigureParamsSchema = z.object({ routineFigureId: entityIdSchema });
const nameSchema = z.object({ name: z.string().trim().min(1).max(200) }).strict();
const assignmentSchema = z
  .object({ figureId: entityIdSchema, figureVariantId: entityIdSchema.nullable().optional() })
  .strict();
const moveSchema = z.object({ beforeRoutineFigureId: entityIdSchema.nullable() }).strict();
const doneSchema = z.object({ done: z.boolean() }).strict();

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
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const figureSchema = z.object({
  id: z.string().uuid(),
  danceId: z.string().uuid(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  variants: z.array(variantSchema).min(1),
});
const routineFigureSchema = z.object({
  id: z.string().uuid(),
  routineId: z.string().uuid(),
  position: z.number().int().min(1),
  figureId: z.string().uuid().nullable(),
  figureVariantId: z.string().uuid().nullable(),
  figureName: z.string().nullable(),
  figureVariantName: z.string().nullable(),
  done: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const routineSchema = z.object({
  id: z.string().uuid(),
  danceId: z.string().uuid(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  routineFigures: z.array(routineFigureSchema),
});
const notebookSchema = z.object({
  dance: danceSchema,
  figures: z.array(figureSchema),
  routines: z.array(routineSchema),
});

export interface NotebookRouteServices {
  readonly getDanceNotebook: GetDanceNotebookQuery;
  readonly createFigure: CreateFigureCommand;
  readonly createRoutine: CreateRoutineCommand;
  readonly addPlaceholder: AddRoutineFigurePlaceholderCommand;
  readonly assignRoutineFigure: AssignRoutineFigureCommand;
  readonly createFigureForRoutineFigure: CreateFigureForRoutineFigureCommand;
  readonly moveRoutineFigure: MoveRoutineFigureCommand;
  readonly setRoutineFigureDone: SetRoutineFigureDoneCommand;
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
    const input = nameSchema.safeParse(request.body);
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

  app.post('/api/dances/:danceId/routines', async (request, reply) => {
    const danceId = readId(danceParamsSchema.safeParse(request.params), reply);
    const input = nameSchema.safeParse(request.body);
    if (!danceId || !input.success) return sendInvalidRequest(reply);
    if (!services.getDanceNotebook.execute(danceId)) {
      return reply.code(404).send(notFound('dance_not_found', 'Tanec nebyl nalezen.'));
    }
    try {
      const routine = services.createRoutine.execute({ ...input.data, danceId });
      return reply.code(201).send(routineSchema.parse({ ...routine, routineFigures: [] }));
    } catch (cause: unknown) {
      return sendNotebookError(reply, cause);
    }
  });

  app.post('/api/routines/:routineId/routine-figures', async (request, reply) => {
    const routineId = readId(routineParamsSchema.safeParse(request.params), reply);
    if (!routineId) return;
    const routineFigure = services.addPlaceholder.execute(routineId);
    if (!routineFigure) {
      return reply.code(404).send(notFound('routine_not_found', 'Sestava nebyla nalezena.'));
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
    const input = nameSchema.safeParse(request.body);
    if (!routineFigureId || !input.success) return sendInvalidRequest(reply);
    try {
      return sendAssignmentResult(
        reply,
        services.createFigureForRoutineFigure.execute(routineFigureId, input.data.name),
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

  app.put('/api/routine-figures/:routineFigureId/done', async (request, reply) => {
    const routineFigureId = readId(routineFigureParamsSchema.safeParse(request.params), reply);
    const input = doneSchema.safeParse(request.body);
    if (!routineFigureId || !input.success) return sendInvalidRequest(reply);
    const routineFigure = services.setRoutineFigureDone.execute(routineFigureId, input.data.done);
    if (!routineFigure) {
      return reply
        .code(404)
        .send(notFound('routine_figure_not_found', 'Výskyt figury nebyl nalezen.'));
    }
    return reply.code(200).send(routineFigureSchema.parse(routineFigure));
  });
}

function readId(
  parsed: z.ZodSafeParseResult<{ danceId?: string; routineId?: string; routineFigureId?: string }>,
  reply: FastifyReply,
) {
  if (!parsed.success) {
    sendInvalidRequest(reply);
    return null;
  }
  const value = parsed.data.danceId ?? parsed.data.routineId ?? parsed.data.routineFigureId;
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
  if (cause instanceof InvalidFigureNameError || cause instanceof InvalidRoutineNameError) {
    return reply.code(400).send({ error: 'invalid_request', message: cause.message });
  }
  throw cause;
}

function notFound(error: string, message: string) {
  return { error, message };
}
