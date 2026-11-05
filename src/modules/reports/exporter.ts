import type { FileStore, OutputFile } from '../../infrastructure/files/local-file-store.js';
import { MetrikaError, parseApiResponse } from '../../core/errors.js';
import { exportReportSchema, scalarString } from '../api/schemas.js';
import type { ExportReportInput } from '../api/schemas.js';
import { reportResponseSchema } from './schemas.js';
import type { TableReport } from './schemas.js';
import type { ReportsService } from './service.js';

const metadata = (report: TableReport): Record<string, unknown> => Object.fromEntries(Object.entries(report).filter(([key]) => key !== 'data'));
const csvCell = (value: unknown): string => `"${String(value ?? '').replaceAll('"', '""')}"`;

export class ReportExporter {
  constructor(private readonly reports: ReportsService, private readonly files: FileStore, private readonly maxPages: number) {}

  async exportReport(input: ExportReportInput) {
    const { parameters, format, pageSize, maxRows } = exportReportSchema.parse(input);
    if (parameters.offset !== undefined || parameters.limit !== undefined) throw new MetrikaError('Для export_report используйте pageSize/maxRows; offset/limit не принимаются.');
    const file = await this.files.create(format);
    let rows = 0, pages = 0, offset = 1, complete = false;
    let first: TableReport | undefined, last: TableReport | undefined;
    let stopReason = 'max_pages';
    let metadataFile: OutputFile | undefined;
    const warnings = new Set<string>();
    const pageMetadata: Record<string, unknown>[] = [];
    try {
      while (pages < this.maxPages) {
        const limit = Math.min(pageSize, maxRows === undefined ? pageSize : maxRows - rows);
        if (limit <= 0) { stopReason = 'max_rows'; break; }
        const report = parseApiResponse(reportResponseSchema, await this.reports.query({ kind: 'table', parameters: { ...parameters, limit, offset } }));
        if (report.data.length > limit) throw new MetrikaError('ЯМ вернул больше строк, чем запрошено. Выгрузка отменена.');
        first ??= report;
        last = report;
        pages++;
        pageMetadata.push({ offset, rows: report.data.length, ...metadata(report) });
        if (report.sampled) warnings.add('sampled');
        if (report.contains_sensitive_data) warnings.add('contains_sensitive_data');
        if (report.total_rows_rounded) warnings.add('total_rows_rounded');
        if (report.sample_share !== first.sample_share || report.total_rows !== first.total_rows || JSON.stringify(report.totals) !== JSON.stringify(first.totals)) warnings.add('data_changed_between_pages');
        if (format === 'csv' && pages === 1) {
          const dimensionNames = report.query?.dimensions ?? scalarString(parameters.dimensions ?? '').split(',').filter(Boolean);
          const metricNames = report.query?.metrics ?? scalarString(parameters.metrics ?? '').split(',').filter(Boolean);
          if (dimensionNames.length !== (report.data[0]?.dimensions?.length ?? dimensionNames.length) || metricNames.length !== (report.data[0]?.metrics?.length ?? metricNames.length)) {
            throw new MetrikaError('Не удалось определить колонки CSV. Используйте jsonl.');
          }
          await file.write([...dimensionNames.flatMap((name) => [`${name}.id`, `${name}.name`]), ...metricNames].map(csvCell).join(',') + '\r\n');
        }
        for (const row of report.data) {
          await file.write(format === 'jsonl' ? JSON.stringify(row) + '\n' :
            [...(row.dimensions ?? []).flatMap((dimension) => [dimension.id, dimension.name]), ...row.metrics].map(csvCell).join(',') + '\r\n');
        }
        rows += report.data.length;
        offset += report.data.length;
        const exactTotal = Number.isSafeInteger(report.total_rows) && !report.total_rows_rounded;
        if ((exactTotal && rows >= report.total_rows) || (!exactTotal && report.data.length < limit)) {
          complete = true; stopReason = 'end'; break;
        }
        if (report.data.length < limit) { stopReason = 'unexpected_short_page'; warnings.add(stopReason); break; }
      }
      const summary = { file: file.path, format, rows, pages, bytes: file.bytes, complete, stopReason,
        nextOffset: complete ? null : offset, warnings: [...warnings],
        firstPage: first ? metadata(first) : null, lastPage: last ? metadata(last) : null };
      metadataFile = await this.files.create('metadata.json');
      await metadataFile.write(JSON.stringify({ ...summary, request: parameters, pageMetadata }, null, 2));
      await file.commit();
      await metadataFile.commit();
      return { ...summary, metadataFile: metadataFile.path };
    } catch (error) {
      await file.abort();
      await metadataFile?.abort();
      if (error instanceof MetrikaError) throw error;
      throw new MetrikaError('Не удалось выгрузить отчёт. Незавершённые файлы удалены.');
    }
  }
}
