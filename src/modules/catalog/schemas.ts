import * as z from 'zod/v4';

const parameterSchema = z.object({ name: z.string(), required: z.boolean(), description: z.string() });
export const operationSchema = z.object({
  id: z.string(), category: z.enum(['management', 'stat', 'logs']), name: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']), readOnly: z.boolean(),
  path: z.string(), documentationUrl: z.url(),
  parameters: z.object({ path: z.array(parameterSchema), query: z.array(parameterSchema) }),
  bodyContentTypes: z.array(z.string()), documentation: z.string(), note: z.string().optional(),
});
export const catalogSchema = z.object({
  source: z.url(), revision: z.string(), retrievedAt: z.string(),
  operations: z.array(operationSchema),
  references: z.array(z.object({ name: z.string(), url: z.url() })),
  fields: z.array(z.object({ name: z.string(), kind: z.enum(['metric', 'dimension']), description: z.string(), url: z.url() })),
});
export type ApiOperation = z.infer<typeof operationSchema>;
export type ApiCatalog = z.infer<typeof catalogSchema>;
