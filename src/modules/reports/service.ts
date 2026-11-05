import type { ApiGateway } from '../api/gateway.js';
import { queryReportSchema, scalarString } from '../api/schemas.js';
import type { Parameters, QueryReportInput } from '../api/schemas.js';
import { genericReportSchema, reportSchema, reportResponseSchema, pageStatsSchema, pageStatsResponseSchema } from './schemas.js';
import type { ReportInput, PageStatsInput } from './schemas.js';
import { MetrikaError, parseApiResponse } from '../../core/errors.js';

const reportOperations = {
  table: 'stat_data_1', bytime: 'stat_bytime', drilldown: 'stat_drilldown',
  comparison: 'stat_comparison_1', comparison_drilldown: 'stat_comparison_drilldown', pivot: 'stat_pivot',
} as const;

export class ReportsService {
  constructor(private readonly api: ApiGateway, private readonly counterId: number) {}

  async query(input: QueryReportInput) {
    const { kind, parameters } = queryReportSchema.parse(input);
    const query: Parameters = { accuracy: 'full', lang: 'ru', include_undefined: true, ...parameters };
    if (query.ids === undefined && query.id === undefined) query.ids = this.counterId;
    if (query.ids !== undefined && query.id !== undefined) throw new MetrikaError('Укажите только ids или id.');
    const ids = query.ids ?? query.id;
    if (ids === undefined || !/^\d+(,\d+)*$/.test(scalarString(ids))) throw new MetrikaError('Некорректный список счётчиков.');
    return parseApiResponse(genericReportSchema, await this.api.read({ operationId: reportOperations[kind], query }));
  }

  async getReport(input: ReportInput) {
    const { dateFrom, dateTo, dimensions, metrics, filters, sort, limit, offset,
      accuracy, timezone, lang, attribution, currency, includeUndefined } = reportSchema.parse(input);
    const parameters: Parameters = { date1: dateFrom, date2: dateTo, metrics, accuracy, limit, offset, lang, include_undefined: includeUndefined };
    if (dimensions.length) parameters.dimensions = dimensions;
    if (sort?.length) parameters.sort = sort;
    for (const [name, value] of Object.entries({ filters, timezone, attribution, currency })) {
      if (value !== undefined) parameters[name] = value;
    }
    return parseApiResponse(reportResponseSchema, await this.query({ kind: 'table', parameters }));
  }

  async getPageStats(input: PageStatsInput) {
    const { dateFrom, dateTo, breakdown, includeHash, limit, offset } = pageStatsSchema.parse(input);
    const pageDimension = includeHash ? 'ym:pv:URLHash' : 'ym:pv:URL';
    const dimensions = breakdown === 'referrers' ? `${pageDimension},ym:pv:referer`
      : breakdown === 'daily' ? `ym:pv:date,${pageDimension}` : pageDimension;
    return parseApiResponse(pageStatsResponseSchema, await this.query({ kind: 'table', parameters: {
      date1: dateFrom, date2: dateTo, dimensions,
      metrics: 'ym:pv:pageviews,ym:pv:users', sort: '-ym:pv:pageviews', limit, offset,
    } }));
  }
}
