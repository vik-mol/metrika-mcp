// Compatibility entry point for existing MCP configurations.
try {
  await import('../dist/index.js');
} catch {
  console.error('Не удалось запустить MCP. Выполните npm ci --ignore-scripts и npm run build в папке сервера.');
  process.exitCode = 1;
}
