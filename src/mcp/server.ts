import { McpServer } from '@modelcontextprotocol/server';
import type { Application } from '../app/create-application.js';
import { registerManagementTools } from './tools/management.js';
import { registerReportsTools } from './tools/reports.js';
import { registerCatalogTools } from './tools/catalog.js';
import { registerApiTools } from './tools/api.js';

export const createServer = (application: Application): McpServer => {
  const server = new McpServer({ name: 'yandex-metrika', version: '0.3.0' });
  registerManagementTools(server, application);
  registerReportsTools(server, application);
  registerCatalogTools(server);
  registerApiTools(server, application);
  return server;
};
