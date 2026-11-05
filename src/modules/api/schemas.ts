import * as z from 'zod/v4';

const scalar = z.union([z.string(), z.number().finite(), z.boolean()]);
export const parametersSchema = z.record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), z.union([scalar, z.array(scalar)]));
export const operationSearchSchema = z.strictObject({
  search: z.string().default(''),
  category: z.enum(['management', 'stat', 'logs']).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  offset: z.number().int().nonnegative().default(0),
  limit: z.number().int().min(1).max(200).default(50),
});
export const operationInfoSchema = z.strictObject({
  operationId: z.string(),
  offset: z.number().int().nonnegative().default(0),
  limit: z.number().int().min(1).max(30000).default(12000),
});
const requestShape = {
  operationId: z.string(),
  path: parametersSchema.default({}),
  query: parametersSchema.default({}),
};
export const apiReadSchema = z.strictObject({
  ...requestShape,
  output: z.enum(['inline', 'file']).default('inline'),
});
export const apiWriteSchema = z.strictObject({
  ...requestShape,
  body: z.unknown().optional().describe('JSON body в структуре официального API.'),
  files: z.array(z.strictObject({
    field: z.string().min(1),
    filename: z.string().min(1),
    content: z.string().optional(),
    filePath: z.string().optional().describe('Путь CSV/JSON относительно YANDEX_METRIKA_IMPORT_DIR; файл передаётся потоково.'),
    encoding: z.enum(['utf8', 'base64']).default('utf8'),
    contentType: z.string().default('text/csv'),
  }).refine((file) => (file.content !== undefined) !== (file.filePath !== undefined), 'Укажите ровно один источник: content или filePath.')).optional().describe('Файлы multipart: текст/base64 или файл из настроенной папки импорта.'),
  form: parametersSchema.optional(),
});
export const reportKindSchema = z.enum(['table', 'bytime', 'drilldown', 'comparison', 'comparison_drilldown', 'pivot']);
export const queryReportSchema = z.strictObject({
  kind: reportKindSchema.default('table'),
  parameters: parametersSchema.describe('Нативные параметры API: metrics, dimensions, date1/date2, filters, attribution, preset, timezone, ids и другие. row_ids/parent_id передавайте JSON-строкой.'),
});
export const exportReportSchema = z.strictObject({
  parameters: parametersSchema,
  format: z.enum(['jsonl', 'csv']).default('jsonl'),
  pageSize: z.number().int().min(1).max(100000).default(10000),
  maxRows: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
});
export const referenceSearchSchema = z.strictObject({
  search: z.string().default(''),
  offset: z.number().int().nonnegative().default(0),
  limit: z.number().int().min(1).max(100).default(30),
});
export const fieldSearchSchema = referenceSearchSchema.extend({
  kind: z.enum(['metric', 'dimension']).optional(),
});

export type Parameters = z.infer<typeof parametersSchema>;
export type ParameterValue = Parameters[string];
export type ApiReadInput = z.input<typeof apiReadSchema>;
export type ApiWriteInput = z.input<typeof apiWriteSchema>;
export type ApiWriteRequest = z.output<typeof apiWriteSchema>;
export type UploadFile = NonNullable<ApiWriteRequest['files']>[number];
export type QueryReportInput = z.input<typeof queryReportSchema>;
export type ExportReportInput = z.input<typeof exportReportSchema>;
export const scalarString = (value: ParameterValue): string => Array.isArray(value) ? value.join(',') : String(value);
