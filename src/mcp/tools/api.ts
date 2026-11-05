import type { McpServer } from '@modelcontextprotocol/server';
import type { Application } from '../../app/create-application.js';
import { registerTool } from '../register-tool.js';
import { apiReadSchema, apiWriteSchema } from '../../modules/api/schemas.js';

export const registerApiTools = (server: McpServer, app: Application): void => {
  registerTool(server, 'read_api', {
    description: 'Выполнить операцию чтения из каталога API. counterId по умолчанию из .env, другой доступный счётчик можно указать в path.counterId. Все поля ответа сохраняются. Для крупных ответов и частей Logs API используйте output=file; файл сохраняется локально.',
    inputSchema: apiReadSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, (args) => app.api.read(args));

  registerTool(server, 'write_api', {
    description: 'Выполнить изменяющую операцию из каталога API (включая генерацию токена через GET): полное управление объектами, доступами, импорт JSON/CSV multipart, создание/отмена/очистка Logs API. Может удалять объекты и менять доступы. Уточните operationId и body через get_api_operation. Записи автоматически не повторяются.',
    inputSchema: apiWriteSchema, annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  }, (args) => app.api.write(args));
};
