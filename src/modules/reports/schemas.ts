import * as z from 'zod/v4';

export const pageStatsSchema = z.strictObject({
  dateFrom: z.iso.date(),
  dateTo: z.iso.date(),
  breakdown: z.enum(['pages', 'referrers', 'daily']).default('pages'),
  includeHash: z.boolean().default(true),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(1).max(100000).default(1),
}).refine(({ dateFrom, dateTo }) => dateFrom <= dateTo, 'Начало периода позже окончания');

export const pageStatsResponseSchema = z.looseObject({
  data: z.array(z.looseObject({
    dimensions: z.array(z.looseObject({ name: z.string().nullable(), id: z.string().nullable().optional() })),
    metrics: z.array(z.number().finite()),
  })),
  totals: z.array(z.number().finite()),
  total_rows: z.number().int().nonnegative(),
  sampled: z.boolean(),
  sample_share: z.number().optional(),
  query: z.looseObject({ dimensions: z.array(z.string()).optional(), metrics: z.array(z.string()).optional() }).optional(),
});


const reportDateSchema = z.union([z.iso.date(), z.string().regex(/^(today|yesterday|\d+daysAgo)$/)]);
const reportFieldSchema = z.string().max(150).regex(/^ym:[a-z]{1,4}:[A-Za-z][A-Za-z0-9_<>]*$/);
export const reportSchema = z.strictObject({
  dateFrom: reportDateSchema,
  dateTo: reportDateSchema,
  dimensions: z.array(reportFieldSchema).max(10).default([]),
  metrics: z.array(reportFieldSchema).min(1).max(20),
  filters: z.string().max(10000).optional(),
  accuracy: z.union([z.enum(['low', 'medium', 'high', 'full']), z.number().positive().max(1)]).default('full'),
  timezone: z.string().regex(/^[+-](?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  lang: z.enum(['ru', 'en']).default('ru'),
  attribution: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  includeUndefined: z.boolean().default(true),
  sort: z.array(z.string().max(151).regex(/^-?ym:[a-z]{1,4}:[A-Za-z][A-Za-z0-9_<>]*$/)).max(20).optional(),
  limit: z.number().int().min(1).max(100000).default(100),
  offset: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(1),
}).refine(({ dateFrom, dateTo }) => !/^\d{4}-/.test(dateFrom) || !/^\d{4}-/.test(dateTo) || dateFrom <= dateTo, 'Начало периода позже окончания');

export const reportResponseSchema = z.looseObject({
  data: z.array(z.looseObject({
    dimensions: z.array(z.looseObject({ name: z.string().nullable(), id: z.string().nullable().optional() })).optional(),
    metrics: z.array(z.number().finite().nullable()),
  })),
  totals: z.array(z.number().finite().nullable()),
  total_rows: z.number().int().nonnegative(),
  sampled: z.boolean(),
  sample_share: z.number().optional(),
  sample_size: z.number().optional(),
  sample_space: z.number().optional(),
  data_lag: z.number().optional(),
  query: z.looseObject({ dimensions: z.array(z.string()).optional(), metrics: z.array(z.string()).optional() }).optional(),
});

export const genericReportSchema = z.looseObject({ data: z.array(z.unknown()) });
export type ReportInput = z.input<typeof reportSchema>;
export type PageStatsInput = z.input<typeof pageStatsSchema>;
export type TableReport = z.output<typeof reportResponseSchema>;
