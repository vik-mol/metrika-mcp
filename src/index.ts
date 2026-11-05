import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { loadLocalEnv } from './config/credentials.js';
import { loadConfig } from './config/env.js';
import { MetrikaError } from './core/errors.js';
import { createApplication } from './app/create-application.js';
import { createServer } from './mcp/server.js';

try {
  loadLocalEnv();
  const application = createApplication(loadConfig());
  serveStdio(() => createServer(application));
} catch (error) {
  console.error(error instanceof MetrikaError
    ? `Metrika MCP не запущен. ${error.message}`
    : 'Metrika MCP не запущен. Проверьте настройки локального .env.');
  process.exitCode = 1;
}
