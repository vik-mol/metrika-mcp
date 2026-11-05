import { readFileSync } from 'node:fs';
import { operationInfoSchema, operationSearchSchema, referenceSearchSchema, fieldSearchSchema } from '../api/schemas.js';
import { MetrikaError } from '../../core/errors.js';

import type * as z from 'zod/v4';
import { catalogSchema } from './schemas.js';

export const catalog = catalogSchema.parse(JSON.parse(readFileSync(new URL('../../api-catalog.json', import.meta.url), 'utf8')) as unknown);
const operations = new Map(catalog.operations.map((operation) => [operation.id, operation]));
export const getOperation = (id: string) => {
  const operation = operations.get(id);
  if (!operation) throw new MetrikaError('Неизвестная операция. Используйте list_api_operations.');
  return operation;
};
const normalize = (value: string) => value.toLocaleLowerCase().replaceAll('ё', 'е');
const matches = (item: unknown, search: string) => normalize(JSON.stringify(item)).includes(normalize(search));
export const listOperations = (input: z.input<typeof operationSearchSchema>) => {
  const { search, category, method, offset, limit } = operationSearchSchema.parse(input);
  const items = catalog.operations.filter((op) => (!category || op.category === category) && (!method || op.method === method))
    .map(({ id, name, method, path, category, readOnly }) => ({ id, name, method, path, category, readOnly }))
    .filter((op) => matches(op, search));
  return { total: items.length, offset, operations: items.slice(offset, offset + limit), source: catalog.source, retrievedAt: catalog.retrievedAt };
};
export const operationInfo = (input: z.input<typeof operationInfoSchema>) => {
  const { operationId, offset, limit } = operationInfoSchema.parse(input);
  const { documentation, ...operation } = getOperation(operationId);
  return { ...operation, documentation: documentation.slice(offset, offset + limit), nextOffset: offset + limit < documentation.length ? offset + limit : null };
};
export const searchReferences = (input: z.input<typeof referenceSearchSchema>) => {
  const { search, offset, limit } = referenceSearchSchema.parse(input);
  const items = catalog.references.filter((item) => matches(item, search));
  return { total: items.length, references: items.slice(offset, offset + limit) };
};

export const searchFields = (input: z.input<typeof fieldSearchSchema>) => {
  const { search, kind, offset, limit } = fieldSearchSchema.parse(input);
  const items = catalog.fields.filter((item) => (!kind || item.kind === kind) && matches(item, search))
    .sort((a, b) => Number(b.name === search) - Number(a.name === search));
  return { total: items.length, offset, fields: items.slice(offset, offset + limit),
    nextOffset: offset + limit < items.length ? offset + limit : null };
};
