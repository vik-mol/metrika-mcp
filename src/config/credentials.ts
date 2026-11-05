import { loadEnvFile } from 'node:process';
import { localEnvPath } from './paths.js';
export { localEnvPath } from './paths.js';

import { MetrikaError } from '../core/errors.js';


export const loadLocalEnv = ({ path = localEnvPath, load = loadEnvFile }: { path?: string; load?: typeof loadEnvFile } = {}) => {
  try {
    load(path);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
      throw new MetrikaError('Не удалось прочитать локальный .env MCP-сервера.');
    }
  }
};

export const loadToken = ({ env = process.env }: { env?: NodeJS.ProcessEnv } = {}) => {
  const token = env.YANDEX_METRIKA_TOKEN?.trim();
  if (!token || /\s/.test(token)) {
    throw new MetrikaError(
      'Задайте YANDEX_METRIKA_TOKEN в локальном .env MCP-сервера.'
    );
  }
  return token;
};
