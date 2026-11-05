import { resolve } from 'node:path';
import { defaultExportDir, defaultImportDir } from './paths.js';
import { loadToken } from './credentials.js';
import { MetrikaError } from '../core/errors.js';

const positiveInteger = (value: string | undefined, name: string, maximum: number) => {
  if (!/^\d+$/.test(value?.trim() ?? '')) {
    throw new MetrikaError(`Задайте положительный целый ${name} в локальном .env.`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0 || number > maximum) {
    throw new MetrikaError(`Недопустимое значение ${name} в локальном .env.`);
  }
  return number;
};

export const loadConfig = ({ env = process.env }: { env?: NodeJS.ProcessEnv } = {}) => ({
  token: loadToken({ env }),
  counterId: positiveInteger(env.YANDEX_METRIKA_COUNTER_ID, 'YANDEX_METRIKA_COUNTER_ID', Number.MAX_SAFE_INTEGER),
  importDir: env.YANDEX_METRIKA_IMPORT_DIR?.trim() ? resolve(defaultImportDir, '..', env.YANDEX_METRIKA_IMPORT_DIR.trim()) : defaultImportDir,
  maxImportBytes: positiveInteger(env.YANDEX_METRIKA_MAX_IMPORT_BYTES ?? '1073741824', 'YANDEX_METRIKA_MAX_IMPORT_BYTES', Number.MAX_SAFE_INTEGER),
  exportDir: env.YANDEX_METRIKA_EXPORT_DIR?.trim() ? resolve(defaultExportDir, '..', env.YANDEX_METRIKA_EXPORT_DIR.trim()) : defaultExportDir,
  maxInlineBytes: positiveInteger(env.YANDEX_METRIKA_MAX_INLINE_BYTES ?? '10485760', 'YANDEX_METRIKA_MAX_INLINE_BYTES', Number.MAX_SAFE_INTEGER),
  maxExportBytes: positiveInteger(env.YANDEX_METRIKA_MAX_EXPORT_BYTES ?? '1073741824', 'YANDEX_METRIKA_MAX_EXPORT_BYTES', Number.MAX_SAFE_INTEGER),
  maxExportPages: positiveInteger(env.YANDEX_METRIKA_MAX_EXPORT_PAGES ?? '10000', 'YANDEX_METRIKA_MAX_EXPORT_PAGES', Number.MAX_SAFE_INTEGER),
  timeoutMs: positiveInteger(env.YANDEX_METRIKA_TIMEOUT_MS ?? '15000', 'YANDEX_METRIKA_TIMEOUT_MS', 2147483647),
});

export type AppConfig = ReturnType<typeof loadConfig>;
