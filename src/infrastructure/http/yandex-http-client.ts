import { MetrikaError, isRecord } from '../../core/errors.js';

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;
export interface HttpRequest {
  url: URL;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readOnly: boolean;
  body?: string | FormData;
}
export interface HttpTransport {
  request(input: HttpRequest): Promise<Response>;
  decode(response: Response): Promise<unknown>;
}
export interface HttpOptions {
  token: string;
  timeoutMs: number;
  maxInlineBytes: number;
  fetchImpl?: Fetch;
}

/** The only component that holds the OAuth token or sends HTTP requests. */
export class YandexHttpClient implements HttpTransport {
  readonly #token: string;
  readonly #timeoutMs: number;
  readonly #maxInlineBytes: number;
  readonly #fetch: Fetch;

  constructor({ token, timeoutMs, maxInlineBytes, fetchImpl = fetch }: HttpOptions) {
    this.#token = token;
    this.#timeoutMs = timeoutMs;
    this.#maxInlineBytes = maxInlineBytes;
    this.#fetch = fetchImpl;
  }

  async request({ url, method, readOnly, body }: HttpRequest): Promise<Response> {
    if (url.origin !== 'https://api-metrika.yandex.net' || url.username || url.password) {
      throw new MetrikaError('Недопустимый адрес API.');
    }
    const headers: Record<string, string> = { Authorization: `OAuth ${this.#token}`, Accept: 'application/json' };
    if (typeof body === 'string') headers['Content-Type'] = 'application/json';
    let response: Response;
    try {
      response = await this.#fetch(url.href, {
        method, headers, ...(body === undefined ? {} : { body }),
        redirect: 'error', signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch {
      throw new MetrikaError(readOnly
        ? 'Нет ответа ЯМ: сеть или таймаут.'
        : 'Результат записи в ЯМ неизвестен: сеть или таймаут. Проверьте состояние объекта перед повтором; автоматического повтора нет.');
    }
    if (!response.ok) {
      let details = '';
      try {
        if (response.headers.get('content-type')?.includes('json')) {
          const errorBody: unknown = JSON.parse(await this.#text(response, 16384));
          if (isRecord(errorBody) && Array.isArray(errorBody.errors)) {
            details = errorBody.errors.slice(0, 3).map((item: unknown) =>
              isRecord(item) && typeof item.message === 'string'
                ? item.message.replace(/[\x00-\x1f]/g, ' ').slice(0, 300) : '').filter(Boolean).join('; ');
          }
        } else await response.body?.cancel();
      } catch { /* Diagnostics are optional; raw bodies never become errors. */ }
      const hints: Record<number, string> = {
        400: 'Проверьте параметры и совместимость метрик в get_api_operation.',
        401: 'Недействительный OAuth-токен.', 403: 'Нет нужных прав доступа.', 429: 'Исчерпана квота API.',
      };
      const hint = hints[response.status] ?? 'Запрос не выполнен. Проверьте состояние объекта перед повторной записью.';
      throw new MetrikaError(`ЯМ HTTP ${response.status}: ${hint}${details ? ` ${details}` : ''}`);
    }
    return response;
  }

  async #text(response: Response, maxBytes = this.#maxInlineBytes): Promise<string> {
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      if (response.body) {
        for await (const chunk of response.body) {
          size += chunk.length;
          if (size > maxBytes) throw new MetrikaError('Ответ превышает лимит выдачи. Используйте read_api с output=file или export_report.');
          chunks.push(chunk);
        }
      }
    } catch (error) {
      if (error instanceof MetrikaError) throw error;
      throw new MetrikaError('Не удалось прочитать ответ ЯМ. Для записи результат неизвестен; проверьте состояние объекта перед повтором.');
    }
    return Buffer.concat(chunks).toString('utf8').split(this.#token).join('[REDACTED]');
  }

  async decode(response: Response): Promise<unknown> {
    if (response.status === 204) return { success: true };
    const text = await this.#text(response);
    if (!text) return { success: true };
    if (response.headers.get('content-type')?.includes('json')) {
      try { return JSON.parse(text) as unknown; }
      catch { throw new MetrikaError('Некорректный JSON в ответе ЯМ.'); }
    }
    return { contentType: response.headers.get('content-type'), text };
  }
}
