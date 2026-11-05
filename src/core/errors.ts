import type { ZodType, output } from 'zod/v4';

export class MetrikaError extends Error {
  override name = 'MetrikaError';
}

export const parseApiResponse = <S extends ZodType>(schema: S, value: unknown): output<S> => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new MetrikaError('Неожиданный формат ответа ЯМ. Перед повторной записью проверьте состояние объекта.');
  }
  return parsed.data;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
