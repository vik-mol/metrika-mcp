# MCP для Яндекс Метрики

Локальный stdio MCP-сервер для управления Метрикой, импорта данных и построения отчётов.
TypeScript, Node.js 22.17+. Каждый пользователь хранит свой OAuth-токен и настройки в локальном `.env`.

Сервер предоставляет **15 инструментов**, через которые доступны **108 методов**
официального справочника API (снимок от 5 ноября 2026), и поиск по **1222 группировкам и метрикам**.
Покрытие: счётчики, настройки, доступы, представители, фильтры доступа, цели всех типов,
фильтры, операции, сегменты, примечания, метки, CRM, импорт расходов, звонков, чатов,
офлайн-конверсий, параметров посетителей, Measurement-токены и Logs API.
Полный список методов — в [API-COVERAGE.md](API-COVERAGE.md).

Это покрытие опубликованного API на дату снимка. Возможности интерфейса Метрики,
не предоставленные публичным API, через этот сервер недоступны. Фактические права,
квоты, поддерживаемые сочетания метрик и доступность данных определяет Яндекс.

## Установка из Git

```sh
git clone https://github.com/vik-mol/metrika-mcp.git
cd metrika-mcp
npm ci --ignore-scripts
npm run build
cp .env.example .env
chmod 600 .env
```

Откройте `.env` в редакторе и заполните токен и ID своего счётчика.
`cp` и `chmod` выше — команды для macOS/Linux. На Windows скопируйте `.env.example`
в `.env` в редакторе или командой `Copy-Item .env.example .env` в PowerShell.

| Переменная | Назначение / значение по умолчанию |
| --- | --- |
| `YANDEX_METRIKA_TOKEN` | Обязательный OAuth-токен |
| `YANDEX_METRIKA_COUNTER_ID` | Обязательный ID счётчика по умолчанию |
| `YANDEX_METRIKA_TIMEOUT_MS` | Таймаут одного API-запроса, `15000` мс |
| `YANDEX_METRIKA_EXPORT_DIR` | Папка отчётов, `exports` |
| `YANDEX_METRIKA_MAX_INLINE_BYTES` | Лимит ответа внутри MCP, `10485760` байт |
| `YANDEX_METRIKA_MAX_EXPORT_BYTES` | Лимит одного файла выгрузки, `1073741824` байт |
| `YANDEX_METRIKA_MAX_EXPORT_PAGES` | Лимит страниц одной выгрузки, `10000` |
| `YANDEX_METRIKA_IMPORT_DIR` | Папка CSV/JSON для импорта, `imports` |
| `YANDEX_METRIKA_MAX_IMPORT_BYTES` | Лимит одного файла импорта, `1073741824` байт |

Относительные пути отсчитываются от корня проекта. `.env` загружается независимо
от папки запуска. Уже заданные переменные окружения процесса имеют приоритет.
`.env`, `exports/`, `imports/` и `node_modules/` исключены из Git. Если настроены другие
папки внутри репозитория, добавьте их в `.gitignore`. В Git передаётся `.env.example` без секретов.

Для токена создайте [OAuth-приложение Яндекса](https://oauth.yandex.ru/), запросите
права `metrika:read` и `metrika:write` и авторизуйтесь под нужным аккаунтом.
Для аккаунта организации может потребоваться `passport:business`.
[Официальная инструкция по авторизации](https://yandex.ru/dev/metrika/ru/intro/authorization).

```sh
npm test
npm start
```

`npm start` ожидает MCP-клиента по stdin/stdout. Сам запуск не обращается к Яндексу.
Диагностика направляется в stderr, stdout используется только для MCP.

## Подключение MCP

В [config.example.toml](config.example.toml) находится пример для Codex.
Укажите абсолютный путь к `dist/index.js` на своей машине и путь к Node.js,
если `node` недоступен в PATH приложения. Настройки ЯМ берутся из `.env` рядом с сервером.
Для других MCP-клиентов используйте те же command/args.

После обновления исходников выполните `npm ci --ignore-scripts` и `npm run build`,
затем перезапустите MCP-подключение. Старый путь `src/index.js` работает как
совместимый запуск собранного `dist/index.js`. В старой конфигурации удалите
`enabled_tools`, если он содержит только прежние семь инструментов: иначе новые
инструменты будут скрыты. Для длительных выгрузок увеличьте таймаут MCP-клиента;
в примере указан `tool_timeout_sec = 600`.

## Инструменты

| Инструмент | Назначение |
| --- | --- |
| `list_api_operations` | Найти метод по названию, пути, категории или HTTP-методу |
| `get_api_operation` | Получить параметры, тело запроса, контракт ответа и ссылку на документацию |
| `read_api` | Выполнить операцию чтения; сохранить большой ответ или часть Logs API в файл |
| `write_api` | Выполнить изменяющую операцию, в том числе импорт JSON/CSV multipart |
| `search_report_fields` | Найти метрики и группировки по имени или русскому описанию |
| `search_report_reference` | Найти официальные справочники, включая поля Logs API |
| `query_report` | Шесть форм отчётов со всеми нативными параметрами API |
| `export_report` | Выгрузить все страницы таблицы в JSONL/CSV с метаданными |
| `get_counter` | Информация о счётчике по умолчанию |
| `get_report` | Упрощённый табличный отчёт с dateFrom/dateTo, metrics и dimensions |
| `get_page_stats` | Просмотры и посетители по URL, датам или реферерам |
| `list_goals` | Список целей счётчика по умолчанию |
| `ensure_event_goal` | Создать точную JavaScript-цель, если её ещё нет |
| `update_goal` | Изменить пользовательскую JavaScript-цель |
| `delete_goal` | Удалить JS-цель после сверки ID и единственного точного события |

Универсальные инструменты не ограничены целями или одним счётчиком. Для другого
доступного счётчика задайте `path.counterId`, для отчёта — `parameters.ids`.
В специализированных инструментах используется счётчик из `.env`.

## Управление и импорт

Обычный порядок: `list_api_operations` → `get_api_operation` → `read_api` или `write_api`.
В `search` можно передать `счетчик`, `filter`, `grant`, `segment`, `expense`, `schema`, `logs` и т. п.
Для длинного описания `get_api_operation` возвращает `nextOffset`.

Получить все настройки счётчика, включая дополнительные поля (`read_api`):

```json
{
  "operationId": "management_counter_counter",
  "query": { "field": "goals,mirrors,grants,filters,operation,counter_flags" }
}
```

Изменить настройки счётчика (`write_api`):

```json
{
  "operationId": "management_counter_editCounter",
  "body": { "counter": { "name": "Название счётчика" } }
}
```

`body` передаётся в нативном формате API: можно создавать любые поддерживаемые типы целей,
редактировать доступы, фильтры, операции, сегменты и остальные объекты из каталога.
Перед изменением прочитайте текущее состояние и контракт метода; правила сохранения
неуказанных полей зависят от метода Яндекса.

Импорт CSV из папки `imports/` (`write_api`):

```json
{
  "operationId": "management_offline_conversions_upload_1",
  "files": [{
    "field": "file",
    "filename": "conversions.csv",
    "filePath": "conversions.csv",
    "contentType": "text/csv"
  }]
}
```

Вместо `filePath` можно передать `content` — текст файла, либо base64 с `encoding: "base64"`.
Файлы с `filePath` читаются потоково только из настроенной папки импорта; переходы
и симлинки за её пределы отклоняются. Необходимые столбцы CSV и JSON-структуры
описаны в `get_api_operation` и официальной документации соответствующего импорта.

Записи выполняются последовательно внутри одного процесса. После сетевого сбоя
результат изменения может быть неизвестен: проверьте объект перед повтором.
Автоматических повторов записей нет. `write_api` отмечен как изменяющий и потенциально
разрушительный инструмент. Генерация Measurement-токена тоже относится к записи,
хотя API использует GET.

## Полные отчёты

`query_report.kind` поддерживает:

- `table` — таблицу;
- `bytime` — динамику по времени;
- `drilldown` — ветвь иерархического отчёта;
- `comparison` — сравнение сегментов или периодов;
- `comparison_drilldown` — иерархическое сравнение;
- `pivot` — сводную таблицу.

`parameters` принимает нативные параметры соответствующего метода: `metrics`,
`dimensions`, `date1/date2`, `filters`, `sort`, `accuracy`, `attribution`, `currency`,
`timezone`, `preset`, `direct_client_logins`, `group`, `row_ids`, `top_keys`,
`parent_id`, `date1_a/date2_a/date1_b/date2_b`, `filters_a/filters_b`,
`pivot_dimensions`, `pivot_limit`, `pivot_offset` и другие параметры API.
Простые списки можно передавать массивом или строкой через запятую; вложенные
значения (`row_ids`, `parent_id`) передавайте JSON-строкой.

Для подбора полей используйте `search_report_fields`, например с `search: "доход"`,
`"utm"`, `"браузер"`, `"возраст"` или `"ym:s:visits"`.
Поля с `<attribution>`, `<currency>`, `<goal_id>` параметризуются по правилам API.
Один запрос допускает до 20 метрик и до 10 группировок; совместимость проверяет Яндекс.
По умолчанию сервер запрашивает `accuracy=full` и включает неопределённые группировки.

Динамика источников трафика за месяц (`query_report`):

```json
{
  "kind": "bytime",
  "parameters": {
    "date1": "30daysAgo", "date2": "yesterday", "group": "day",
    "dimensions": ["ym:s:<attribution>TrafficSource"],
    "metrics": ["ym:s:visits", "ym:s:users", "ym:s:bounceRate"],
    "attribution": "last", "top_keys": 30
  }
}
```

Сравнение двух периодов (`query_report`):

```json
{
  "kind": "comparison",
  "parameters": {
    "date1_a": "2026-10-01", "date2_a": "2026-10-15",
    "date1_b": "2026-10-16", "date2_b": "2026-10-31",
    "dimensions": ["ym:s:deviceCategory"],
    "metrics": ["ym:s:visits", "ym:s:users", "ym:s:bounceRate"]
  }
}
```

Полная выгрузка таблицы (`export_report`):

```json
{
  "parameters": {
    "date1": "2026-10-01", "date2": "2026-10-31",
    "dimensions": ["ym:s:UTMSource", "ym:s:UTMCampaign", "ym:s:deviceCategory"],
    "metrics": ["ym:s:visits", "ym:s:users", "ym:s:bounceRate"],
    "sort": ["ym:s:UTMSource", "ym:s:UTMCampaign", "ym:s:deviceCategory"]
  },
  "format": "csv",
  "pageSize": 10000
}
```

Экспорт последовательно читает страницы, а не возвращает только первые 100 строк.
`pageSize` допускает до 100000 строк. `maxRows` необязателен и явно ограничивает выгрузку.
Файлы создаются с правами `600`. JSONL сохраняет строки API целиком; CSV содержит
ID и название каждой группировки и значения метрик. Отдельный `.metadata.json`
содержит исходный запрос, итоги, метаданные каждой страницы и статус полноты.

`complete=true` означает, что получены все страницы запрошенной таблицы. Это не
гарантия отсутствия семплирования или ограничений приватности. Проверяйте `warnings`,
`sampled`, `sample_share`, `sample_size`, `sample_space`, `contains_sensitive_data`,
`total_rows_rounded` и `data_lag`. При достижении maxRows/лимита страниц или неожиданно
короткой странице возвращаются `complete=false`, `stopReason` и `nextOffset`.
При ошибке запроса или превышении размера незавершённый файл удаляется.

Итоги (`totals`) берутся из API: уникальные посетители, проценты и средние не суммируются
по страницам. Изменение итогов или семплирования между страницами отмечается предупреждением.
API не предоставляет снимок на всю выгрузку: для воспроизводимости используйте закрытые
периоды и сортировку по всем группировкам. У bytime есть собственные ограничения
`top_keys`, а pivot и drilldown требуют явного обхода столбцов/ветвей; автоматический
экспорт всех страниц реализован для формы `table`.

## Сырые данные: Logs API

Для данных по отдельным визитам и просмотрам используйте методы `logs_*`:

1. Найдите поля через `search_report_reference` и изучите справочники hits/visits.
2. `read_api` → `logs_evaluate`: оцените возможность запроса, задав `date1`, `date2`, `source`, `fields`.
3. `write_api` → `logs_createLogRequest_1` с теми же query-параметрами.
4. `read_api` → `logs_getLogRequest`, указав `path.requestId`, до готовности запроса.
5. Для каждой части вызовите `read_api` → `logs_download` с `path.requestId`, `path.partNumber`, `output: "file"`.
6. После использования `write_api` → `logs_clean` освобождает квоту на стороне Яндекса.

Очистка и отмена не выполняются автоматически. Logs API имеет собственные квоты,
не выдаёт текущий день и допускает период до одного года на запрос.
Данные Logs API могут отличаться от агрегированных отчётов вследствие обработки в Метрике.
[Ограничения и правила Logs API](https://yandex.ru/dev/metrika/ru/logs/index).

## Разработка и архитектура

Выбрана модульная слоистая архитектура: [ARCHITECTURE.md](ARCHITECTURE.md).
В ней описаны границы модулей, зависимости и рассмотренные альтернативы.

```sh
npm run typecheck  # строгая проверка TypeScript
npm run build      # компиляция в dist/ и копирование каталога API
npm test           # сборка и тесты на собранном JavaScript
npm run check      # typecheck + сборка + тесты
```

`src/` содержит реализацию на TypeScript; `src/index.js` — только совместимый запуск.
Тесты в `test/` сохранены на JavaScript и проверяют исполняемый результат сборки,
включая проверку некорректных входных данных. `dist/` не добавляется в Git.
Секреты из `.env` не входят в сборку.

## Проверки и обновление каталога

`npm test` собирает TypeScript и проверяет маршрутизацию всех методов на подставном HTTP-клиенте,
импорт, шесть форм отчётов, пагинацию, метаданные полноты, выгрузку файлов, ошибки,
разделение чтения/записи и настоящий stdio/MCP-процесс. Тесты не обращаются к
реальному аккаунту, не создают объекты и не подтверждают доступность каждого метода
для конкретного токена.

Каталог хранится в `src/api-catalog.json`. Для обновления из официального справочника
нужен Python 3.9+ только на машине разработчика:

```sh
python3 scripts/update-api-catalog.py
npm test
```

Новые методы и изменения API требуют проверки обновлённого каталога и тестов.
OAuth-токен передаётся только в заголовке к `api-metrika.yandex.net`, перенаправления
отключены. Произвольные URL, заголовки авторизации и callback через инструменты не принимаются.

Источники: [API управления](https://yandex.ru/dev/metrika/ru/management/index),
[табличные отчёты](https://yandex.ru/dev/metrika/ru/stat/openapi/data_1),
[формы отчётов](https://yandex.ru/dev/metrika/ru/stat/index),
[метрики и группировки](https://yandex.ru/dev/metrika/ru/stat/attrandmetr/dim_all),
[импорт данных](https://yandex.ru/dev/metrika/ru/data-import/index).
