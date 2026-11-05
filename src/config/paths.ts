import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// src/config and dist/config are at the same depth below the project root.
export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export const localEnvPath = resolve(projectRoot, '.env');
export const defaultExportDir = resolve(projectRoot, 'exports');
export const defaultImportDir = resolve(projectRoot, 'imports');
