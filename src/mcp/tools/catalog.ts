import type { McpServer } from '@modelcontextprotocol/server';
import { registerTool } from '../register-tool.js';
import { fieldSearchSchema, operationSearchSchema, operationInfoSchema, referenceSearchSchema } from '../../modules/api/schemas.js';
import { listOperations, operationInfo, searchReferences, searchFields } from '../../modules/catalog/service.js';

export const registerCatalogTools = (server: McpServer): void => {
  registerTool(server, 'search_report_fields', {
    description: 'Поиск группировок и метрик аналитики сайта по идентификатору или русскому описанию: посещаемость, страницы, события, цели, браузеры, устройства, география, контент, источники и UTM. Каталог без рекламы и электронной коммерции. Возвращает имена параметризованных полей, описания и ссылки.',
    inputSchema: fieldSearchSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, searchFields);

  registerTool(server, 'list_api_operations', {
    description: 'Поиск методов API для аналитики сайта: счётчики, настройки, цели, фильтры, операции, доступы, представители, сегменты, примечания, контакты CRM, импорт конверсий/звонков/чатов, Logs API. Каталог без рекламных расходов, клиентов Директа, заказов и товаров. Возвращает operationId для read_api/write_api.',
    inputSchema: operationSearchSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, listOperations);

  registerTool(server, 'get_api_operation', {
    description: 'Официальный контракт метода: HTTP-метод, путь, параметры, тело, описание ответа. Для длинной документации продолжайте с nextOffset. Перед записью проверьте структуру здесь.',
    inputSchema: operationInfoSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, operationInfo);

  registerTool(server, 'search_report_reference', {
    description: 'Поиск официальных справочников группировок, метрик и полей Logs API по теме: трафик, аудитория, страницы, события, цели, устройства, контент. Каталог без рекламы и электронной коммерции. Возвращает ссылки на документацию.',
    inputSchema: referenceSearchSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, searchReferences);
};
