import type { McpServer } from '@modelcontextprotocol/server';
import type { Application } from '../../app/create-application.js';
import { registerTool } from '../register-tool.js';
import * as z from 'zod/v4';
import { deleteGoalSchema, ensureGoalSchema, updateGoalSchema } from '../../modules/management/schemas.js';

export const registerManagementTools = (server: McpServer, app: Application): void => {
  const counterId = app.counterId;
  registerTool(server,
    'get_counter',
    {
      description: `Настройки и доступ к счётчику ЯМ ${counterId}. Только чтение.`,
      inputSchema: z.strictObject({}),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (async () => ({ counter: await app.management.getCounter() }))
  );

  registerTool(server,
    'list_goals',
    {
      description: `Список действующих целей счётчика ${counterId}. Проверьте его перед изменениями.`,
      inputSchema: z.strictObject({}),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (async () => ({ goals: await app.management.listGoals() }))
  );

  registerTool(server,
    'ensure_event_goal',
    {
      description: `Создать JavaScript-цель счётчика ${counterId}, если точного события ещё нет. Существующая цель возвращается без изменений. После сетевой ошибки сначала повторно сверьте список целей.`,
      inputSchema: ensureGoalSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    ((args) => app.management.ensureEventGoal(args))
  );

  registerTool(server,
    'update_goal',
    {
      description: `Изменить пользовательскую JavaScript-цель по goalId в счётчике ${counterId}. Указание event заменяет ВСЕ её условия одним точным событием. Неуказанные поля сохраняются.`,
      inputSchema: updateGoalSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    ((args) => app.management.updateGoal(args))
  );

  registerTool(server,
    'delete_goal',
    {
      description: `Удалить пользовательскую JavaScript-цель счётчика ${counterId}. Перед удалением проверяются goalId и единственное точное событие event. Сначала сверьте list_goals.`,
      inputSchema: deleteGoalSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    ((args) => app.management.deleteGoal(args))
  );
};
