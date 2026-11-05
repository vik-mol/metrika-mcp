import { randomUUID } from 'node:crypto';
import { openAsBlob } from 'node:fs';
import { mkdir, open, rename, unlink, realpath, stat } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { MetrikaError } from '../../core/errors.js';

export interface FileOptions {
  exportDir: string;
  importDir: string;
  maxExportBytes: number;
  maxImportBytes: number;
}
export interface FileStore {
  create(extension: string): Promise<OutputFile>;
  openUpload(path: string, contentType: string): Promise<Blob>;
  download(response: Response): Promise<{ file: string; bytes: number; contentType: string | null; complete: true }>;
}
export interface OutputFile {
  readonly path: string;
  readonly bytes: number;
  write(data: string | Uint8Array): Promise<void>;
  commit(): Promise<void>;
  abort(): Promise<void>;
}

class LocalOutputFile implements OutputFile {
  #bytes = 0;
  readonly #handle: FileHandle;
  readonly #limit: number;
  readonly #temporary: string;
  readonly path: string;

  constructor(path: string, handle: FileHandle, limit: number) {
    this.path = path;
    this.#handle = handle;
    this.#limit = limit;
    this.#temporary = `${path}.partial`;
  }
  get bytes(): number { return this.#bytes; }
  async write(data: string | Uint8Array): Promise<void> {
    const length = typeof data === 'string' ? Buffer.byteLength(data) : data.byteLength;
    if (this.#bytes + length > this.#limit) throw new MetrikaError('Выгрузка превышает YANDEX_METRIKA_MAX_EXPORT_BYTES.');
    await this.#handle.writeFile(data);
    this.#bytes += length;
  }
  async commit(): Promise<void> {
    await this.#handle.close();
    await rename(this.#temporary, this.path);
  }
  async abort(): Promise<void> {
    await this.#handle.close().catch(() => undefined);
    await Promise.all([this.#temporary, this.path].map((path) => unlink(path).catch(() => undefined)));
  }
}

export class LocalFileStore implements FileStore {
  readonly #options: FileOptions;
  constructor(options: FileOptions) { this.#options = options; }

  async create(extension: string): Promise<OutputFile> {
    if (!/^[a-z.]+$/.test(extension)) throw new MetrikaError('Недопустимый формат файла.');
    await mkdir(this.#options.exportDir, { recursive: true, mode: 0o700 });
    const path = resolve(this.#options.exportDir, `metrika-${randomUUID()}.${extension}`);
    return new LocalOutputFile(path, await open(`${path}.partial`, 'wx', 0o600), this.#options.maxExportBytes);
  }

  async openUpload(filePath: string, contentType: string): Promise<Blob> {
    try {
      const root = await realpath(this.#options.importDir);
      const path = await realpath(resolve(root, filePath));
      const inside = relative(root, path);
      if (!inside || inside === '..' || inside.startsWith('../') || inside.startsWith('..\\') || isAbsolute(inside) || isAbsolute(filePath)) {
        throw new Error('Outside import directory');
      }
      const info = await stat(path);
      if (!info.isFile() || info.size > this.#options.maxImportBytes) throw new Error('Invalid upload file');
      return await openAsBlob(path, { type: contentType });
    } catch {
      throw new MetrikaError('Файл недоступен, находится вне YANDEX_METRIKA_IMPORT_DIR или превышает YANDEX_METRIKA_MAX_IMPORT_BYTES.');
    }
  }

  async download(response: Response) {
    const file = await this.create('data');
    try {
      if (response.body) for await (const chunk of response.body) await file.write(chunk);
      await file.commit();
      return { file: file.path, bytes: file.bytes, contentType: response.headers.get('content-type'), complete: true as const };
    } catch (error) {
      await file.abort();
      if (error instanceof MetrikaError) throw error;
      throw new MetrikaError('Не удалось сохранить выгрузку. Незавершённый файл удалён.');
    }
  }
}
