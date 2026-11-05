import { getOperation } from '../catalog/service.js';
import type { ApiOperation } from '../catalog/schemas.js';
import { MetrikaError } from '../../core/errors.js';
import type { SerialExecutor } from '../../core/serial-executor.js';
import type { HttpTransport } from '../../infrastructure/http/yandex-http-client.js';
import type { FileStore } from '../../infrastructure/files/local-file-store.js';
import { apiReadSchema, apiWriteSchema, scalarString } from './schemas.js';
import type { ApiReadInput, ApiWriteInput, ApiWriteRequest, Parameters, ParameterValue } from './schemas.js';

export interface ApiRequest {
  operationId: string;
  path?: Parameters;
  query?: Parameters;
  body?: unknown;
  files?: ApiWriteRequest['files'];
  form?: Parameters | undefined;
}
const safeSegment = (value: ParameterValue): string => {
  const text = scalarString(value);
  if (!text || text === '.' || text === '..' || /[/\\%?#\x00-\x1f]/.test(text)) throw new MetrikaError('Недопустимый параметр пути API.');
  return encodeURIComponent(text);
};

export class ApiGateway {
  constructor(
    private readonly http: HttpTransport,
    private readonly files: FileStore,
    private readonly writes: SerialExecutor,
    private readonly options: { counterId: number; maxImportBytes: number },
  ) {}

  #url(operation: ApiOperation, path: Parameters, query: Parameters): URL {
    const names = [...operation.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
    if (Object.keys(path).some((key) => !names.includes(key))) throw new MetrikaError('Лишний параметр пути API.');
    const pathname = operation.path.replace(/\{([^}]+)\}/g, (_match: string, name: string) => {
      const value = path[name] ?? (name === 'counterId' ? this.options.counterId : undefined);
      if (value === undefined) throw new MetrikaError(`Не задан параметр пути ${name}.`);
      if (name === 'counterId' && !/^[1-9]\d*$/.test(String(value))) throw new MetrikaError('Некорректный counterId.');
      return safeSegment(value);
    });
    const url = new URL(pathname, 'https://api-metrika.yandex.net');
    if (url.origin !== 'https://api-metrika.yandex.net' || !/^\/(?:(?:management|stat|export)\/v\d+|cdp\/api\/v\d+)\//.test(url.pathname)) {
      throw new MetrikaError('Недопустимый адрес API.');
    }
    for (const [name, value] of Object.entries(query)) {
      if (/^(?:oauth_token|access_token|authorization|callback)$/i.test(name)) throw new MetrikaError('Параметры авторизации и callback не принимаются через инструмент.');
      url.searchParams.set(name, scalarString(value));
    }
    return url;
  }

  async #body(operation: ApiOperation, input: ApiRequest): Promise<string | FormData | undefined> {
    if (input.files || input.form) {
      if (!operation.bodyContentTypes.includes('multipart/form-data')) throw new MetrikaError('Операция не поддерживает multipart/form-data.');
      if (input.body !== undefined) throw new MetrikaError('Передайте либо body, либо files/form.');
      const body = new FormData();
      for (const [name, value] of Object.entries(input.form ?? {})) body.append(name, scalarString(value));
      for (const file of input.files ?? []) {
        if (file.filePath !== undefined) {
          body.append(file.field, await this.files.openUpload(file.filePath, file.contentType), file.filename);
          continue;
        }
        if (file.content === undefined) throw new MetrikaError('Не указано содержимое файла.');
        if (file.encoding === 'base64' && !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content)) throw new MetrikaError('Некорректный base64 в файле.');
        const bytes = Buffer.from(file.content, file.encoding === 'base64' ? 'base64' : 'utf8');
        if (bytes.length > this.options.maxImportBytes) throw new MetrikaError('Файл превышает YANDEX_METRIKA_MAX_IMPORT_BYTES.');
        body.append(file.field, new Blob([bytes], { type: file.contentType }), file.filename);
      }
      return body;
    }
    return input.body === undefined ? undefined : JSON.stringify(input.body);
  }

  /** Internal primitive; callers compose write workflows under the shared queue. */
  async execute(input: ApiRequest, output: 'inline' | 'file' = 'inline'): Promise<unknown> {
    const operation = getOperation(input.operationId);
    const url = this.#url(operation, input.path ?? {}, input.query ?? {});
    const body = await this.#body(operation, input);
    const response = await this.http.request({ url, method: operation.method, readOnly: operation.readOnly, ...(body === undefined ? {} : { body }) });
    return output === 'file' ? this.files.download(response) : this.http.decode(response);
  }
  async read(input: ApiReadInput): Promise<unknown> {
    const args = apiReadSchema.parse(input);
    if (!getOperation(args.operationId).readOnly) throw new MetrikaError('Для этой операции используйте write_api.');
    return this.execute(args, args.output);
  }
  async write(input: ApiWriteInput): Promise<unknown> {
    const args = apiWriteSchema.parse(input);
    if (getOperation(args.operationId).readOnly) throw new MetrikaError('Для чтения используйте read_api.');
    return this.writes.run(() => this.execute(args));
  }
}
