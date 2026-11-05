import * as z from 'zod/v4';

export const eventSchema = z
  .string()
  .min(1)
  .max(16384)
  .regex(/^[^/\\&#?="+\s]+$/, 'Недопустимый идентификатор JS-события');

export const nameSchema = z.string().trim().min(1).max(255);

export const ensureGoalSchema = z.strictObject({
  event: eventSchema.describe('Точный идентификатор из analytics.reachGoal'),
  name: nameSchema.describe('Название цели в интерфейсе ЯМ'),
});

export const deleteGoalSchema = z.strictObject({
  goalId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  event: eventSchema,
});

export const deleteGoalResponseSchema = z.object({ success: z.literal(true) });

export const updateGoalSchema = z
  .strictObject({
    goalId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    name: nameSchema.optional(),
    event: eventSchema.optional(),
    defaultPrice: z.number().nonnegative().finite().optional(),
    isFavorite: z.boolean().optional(),
  })
  .refine(
    ({ name, event, defaultPrice, isFavorite }) =>
      [name, event, defaultPrice, isFavorite].some(
        (value) => value !== undefined
      ),
    'Укажите хотя бы одно изменяемое поле'
  );

export const goalSchema = z.looseObject({
  id: z.number().int().positive(),
  name: z.string(),
  type: z.string(),
  goal_source: z.string().optional(),
  conditions: z.array(z.unknown()).optional(),
  default_price: z.number().optional(),
  is_favorite: z
    .union([z.boolean(), z.literal(0), z.literal(1)])
    .transform((value) => Boolean(value))
    .optional(),
});

export const goalsResponseSchema = z.object({ goals: z.array(goalSchema) });
export const goalResponseSchema = z.object({ goal: goalSchema });
export const counterResponseSchema = z.object({
  counter: z.looseObject({
    id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    name: z.string(),
    site: z.string().optional(),
    permission: z.string().optional(),
    status: z.string().optional(),
    code_status: z.string().optional(),
    code_options: z.record(z.string(), z.unknown()).optional(),
    webvisor: z.record(z.string(), z.unknown()).optional(),
  }),
});


export type Goal = z.infer<typeof goalSchema>;
export type EnsureGoalInput = z.input<typeof ensureGoalSchema>;
export type UpdateGoalInput = z.input<typeof updateGoalSchema>;
export type DeleteGoalInput = z.input<typeof deleteGoalSchema>;
