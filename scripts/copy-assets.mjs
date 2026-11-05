import { copyFile, mkdir } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
await mkdir(output, { recursive: true });
await copyFile(new URL('../src/api-catalog.json', import.meta.url), new URL('api-catalog.json', output));
