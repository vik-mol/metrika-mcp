import type { McpServer } from '@modelcontextprotocol/server';
import { registerTool } from '../register-tool.js';
import { fieldSearchSchema, operationSearchSchema, operationInfoSchema, referenceSearchSchema } from '../../modules/api/schemas.js';
import { listOperations, operationInfo, searchReferences, searchFields } from '../../modules/catalog/service.js';

export const registerCatalogTools = (server: McpServer): void => {
  registerTool(server, 'search_report_fields', {
    description: 'Поиск группировок и метрик по идентификатору или русскому описанию: источники, доход, заказы, браузеры, устройства, география, контент, UTM, воронки. Возвращает имена параметризованных полей, описания и ссылки.',
    inputSchema: fieldSearchSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, searchFields);

  registerTool(server, 'list_api_operations', {
    description: 'Поиск всех опубликованных методов API Метрики: счётчики, настройки, любые цели, фильтры, операции, доступы, представители, сегменты, примечания, CRM, импорт расходов/конверсий/звонков/чатов, Logs API. Возвращает operationId для read_api/write_api.',
    inputSchema: operationSearchSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, listOperations);

  registerTool(server, 'get_api_operation', {
    description: 'Официальный контракт метода: HTTP-метод, путь, параметры, тело, описание ответа. Для длинной документации продолжайте с nextOffset. Перед записью проверьте структуру здесь.',
    inputSchema: operationInfoSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, operationInfo);

  registerTool(server, 'search_report_reference', {
    description: 'Поиск официальных справочников группировок, метрик и полей Logs API по теме: трафик, аудитория, ecommerce, устройства, контент и другие. Возвращает ссылки на документацию.',
    inputSchema: referenceSearchSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, searchReferences);
};
