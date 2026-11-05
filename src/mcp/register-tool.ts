import type { McpServer, CallToolResult, ToolAnnotations, StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import type { ZodType, output } from 'zod/v4';
import { MetrikaError, isRecord } from '../core/errors.js';

export const registerTool = <S extends ZodType>(
  server: McpServer,
  name: string,
  config: { description: string; inputSchema: S; annotations: ToolAnnotations },
  operation: (input: output<S>) => unknown | Promise<unknown>,
): void => {
  const schema: StandardSchemaWithJSON = config.inputSchema;
  server.registerTool(name, { ...config, inputSchema: schema }, async (args): Promise<CallToolResult> => {
    try {
      const result: unknown = await operation(config.inputSchema.parse(args));
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: isRecord(result) ? result : { result },
      };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof MetrikaError
        ? error.message : 'Не удалось выполнить запрос. Проверьте входные данные по get_api_operation и состояние объекта.' }] };
    }
  });
};
