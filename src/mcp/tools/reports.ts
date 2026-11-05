import type { McpServer } from '@modelcontextprotocol/server';
import type { Application } from '../../app/create-application.js';
import { registerTool } from '../register-tool.js';
import { queryReportSchema, exportReportSchema } from '../../modules/api/schemas.js';
import { pageStatsSchema, reportSchema } from '../../modules/reports/schemas.js';

export const registerReportsTools = (server: McpServer, app: Application): void => {
  const counterId = app.counterId;
  registerTool(server,
    'get_page_stats',
    {
      description: `Статистика страниц счётчика ${counterId}: просмотры и посетители по URL, дням или реферерам. Даты YYYY-MM-DD. По умолчанию URL с hash. Реферер не гарантирует предыдущий экран SPA. Только чтение.`,
      inputSchema: pageStatsSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ((args) => app.reports.getPageStats(args))
  );

  registerTool(server,
    'get_report',
    {
      description: `Универсальный отчёт статистики счётчика ${counterId}: группировки dimensions и метрики metrics API Яндекс Метрики, даты, фильтры, сортировка и пагинация. Подходит для устройств, географии, экранов, браузеров, ОС, трафика, целей и динамики. Возвращает метаданные выборки. Только чтение.`,
      inputSchema: reportSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ((args) => app.reports.getReport(args))
  );

  registerTool(server, 'query_report', {
    description: 'Все шесть форм отчётов Метрики: table, bytime, drilldown, comparison, comparison_drilldown, pivot. Любые нативные параметры API, метрики, сегменты, атрибуция, timezone, preset, ecommerce, несколько ids. accuracy=full по умолчанию. Сохраняет весь ответ, включая семплирование и ограничения данных. Одна страница; для всей таблицы используйте export_report.',
    inputSchema: queryReportSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, (args) => app.reports.query(args));

  registerTool(server, 'export_report', {
    description: 'Выгрузить все страницы табличного отчёта в локальный JSONL/CSV и отдельный файл метаданных. Полные параметры API. Не суммирует uniques/проценты: сохраняет API totals. complete означает только получение всех строк; warnings показывают семплирование, приватность и изменение данных. maxRows ограничивает объём явно.',
    inputSchema: exportReportSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, (args) => app.exporter.exportReport(args));
};
