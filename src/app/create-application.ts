import { defaultExportDir, defaultImportDir } from '../config/paths.js';
import type { AppConfig } from '../config/env.js';
import { MetrikaError } from '../core/errors.js';
import { SerialExecutor } from '../core/serial-executor.js';
import { YandexHttpClient } from '../infrastructure/http/yandex-http-client.js';
import type { Fetch, HttpTransport } from '../infrastructure/http/yandex-http-client.js';
import { LocalFileStore } from '../infrastructure/files/local-file-store.js';
import type { FileStore } from '../infrastructure/files/local-file-store.js';
import { ApiGateway } from '../modules/api/gateway.js';
import { ManagementService } from '../modules/management/service.js';
import { ReportsService } from '../modules/reports/service.js';
import { ReportExporter } from '../modules/reports/exporter.js';

export type ApplicationOptions = Pick<AppConfig, 'token' | 'counterId'> & Partial<Omit<AppConfig, 'token' | 'counterId'>> & { fetchImpl?: Fetch };
export interface ApplicationDependencies { http?: HttpTransport; files?: FileStore }

/** Composition root: modules receive dependencies, never construct them. */
export const createApplication = (options: ApplicationOptions, dependencies: ApplicationDependencies = {}) => {
  const { token, counterId, timeoutMs = 15000, maxInlineBytes = 10485760,
    exportDir = defaultExportDir, importDir = defaultImportDir,
    maxExportBytes = 1073741824, maxImportBytes = 1073741824, maxExportPages = 10000 } = options;
  if (typeof token !== 'string' || !token.trim() || /\s/.test(token.trim())) throw new MetrikaError('Задайте YANDEX_METRIKA_TOKEN в локальном .env MCP-сервера.');
  if (!Number.isSafeInteger(counterId) || counterId <= 0) throw new MetrikaError('Задайте положительный целый YANDEX_METRIKA_COUNTER_ID в локальном .env.');
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) throw new MetrikaError('YANDEX_METRIKA_TIMEOUT_MS должен быть целым числом от 1 до 2147483647.');
  const http = dependencies.http ?? new YandexHttpClient({ token: token.trim(), timeoutMs, maxInlineBytes, ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}) });
  const files = dependencies.files ?? new LocalFileStore({ exportDir, importDir, maxExportBytes, maxImportBytes });
  const writes = new SerialExecutor();
  const api = new ApiGateway(http, files, writes, { counterId, maxImportBytes });
  const management = new ManagementService(api, writes, counterId);
  const reports = new ReportsService(api, counterId);
  const exporter = new ReportExporter(reports, files, maxExportPages);
  return { counterId, management, reports, api, exporter };
};
export type Application = ReturnType<typeof createApplication>;
