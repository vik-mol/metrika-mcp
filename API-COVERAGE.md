# Покрытие API Яндекс Метрики

Снимок официального справочника: 2026-11-05, revision `r21770580`.

Всего: 108 методов. Методы доступны через `read_api` / `write_api`;
контракт и параметры — через `get_api_operation`. Новые методы после даты снимка требуют обновления каталога.

Проверка маршрутизации выполняется на подставном HTTP-клиенте; доступность для реального аккаунта определяется правами и квотами API.

| operationId | Метод | Действие | Чтение / запись | Документация |
| --- | --- | --- | --- | --- |
| `management_label_getLabel` | GET | Информация о метке | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/label/getLabel) |
| `management_label_updateLabel` | PUT | Изменение метки | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/label/updateLabel) |
| `management_label_deleteLabel` | DELETE | Удаление метки | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/label/deleteLabel) |
| `management_label_getLabels` | GET | Список меток пользователя | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/label/getLabels) |
| `management_label_createLabel` | POST | Создание метки | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/label/createLabel) |
| `management_counter_counter` | GET | Информация о счетчике | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/counter/counter) |
| `management_counter_editCounter` | PUT | Изменение счетчика | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/counter/editCounter) |
| `management_counter_deleteCounter` | DELETE | Удаление счетчика | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/counter/deleteCounter) |
| `management_counter_counters` | GET | Список доступных счетчиков | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/counter/counters) |
| `management_counter_addCounter` | POST | Создание счетчика | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/counter/addCounter) |
| `management_counter_undeleteCounter` | POST | Восстановление счетчика | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/counter/undeleteCounter) |
| `management_operation_operation` | GET | Информация о операции | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/operation/operation) |
| `management_operation_editOperation` | PUT | Изменение операции | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/operation/editOperation) |
| `management_operation_deleteOperation` | DELETE | Удаление операции | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/operation/deleteOperation) |
| `management_operation_operations` | GET | Список операций | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/operation/operations) |
| `management_operation_addOperation` | POST | Создание операции | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/operation/addOperation) |
| `management_grant_grants` | GET | Список разрешений | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/grant/grants) |
| `management_grant_grant` | GET | Информация о разрешении | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/grant/grant) |
| `management_grant_myGrant` | GET | Информация о разрешении текущего пользователя | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/grant/myGrant) |
| `management_grant_addPublicGrant` | POST | Создание публичного разрешения | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/grant/addPublicGrant) |
| `management_grant_deletePublicGrant` | DELETE | Удаление публичного разрешения | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/grant/deletePublicGrant) |
| `management_grant_addGrant` | POST | Создание разрешения | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/grant/addGrant) |
| `management_grant_editGrant` | PUT | Изменение разрешения | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/grant/editGrant) |
| `management_grant_deleteGrant` | DELETE | Удаление разрешения | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/grant/deleteGrant) |
| `management_access_filter_getAccessFilter` | GET | Информация о фильтре доступа | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/access_filter/getAccessFilter) |
| `management_access_filter_getAccessFiltersForCounter` | GET | Список фильтров доступа для счетчика | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/access_filter/getAccessFiltersForCounter) |
| `management_access_filter_createAccessFilter` | POST | Создание фильтра доступа | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/access_filter/createAccessFilter) |
| `management_access_filter_updateAccessFilter` | PUT | Изменение фильтра доступа | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/access_filter/updateAccessFilter) |
| `management_access_filter_deleteAccessFilter` | DELETE | Удаление фильтра доступа | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/access_filter/deleteAccessFilter) |
| `management_goal_goal` | GET | Информация о цели | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/goal/goal) |
| `management_goal_editGoal` | PUT | Изменение цели | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/goal/editGoal) |
| `management_goal_deleteGoal` | DELETE | Удаление цели | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/goal/deleteGoal) |
| `management_goal_goals` | GET | Список целей | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/goal/goals) |
| `management_goal_addGoal` | POST | Создание цели | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/goal/addGoal) |
| `management_goal_getSocialNetworks` | GET | Список социальных сетей | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/goal/getSocialNetworks) |
| `management_goal_getMessengers` | GET | Список мессенджеров | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/goal/getMessengers) |
| `management_filter_filter` | GET | Информация о фильтре | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/filter/filter) |
| `management_filter_editFilter` | PUT | Изменение фильтра | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/filter/editFilter) |
| `management_filter_deleteFilter` | DELETE | Удаление фильтра | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/filter/deleteFilter) |
| `management_filter_filters` | GET | Список фильтров | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/filter/filters) |
| `management_filter_addFilter` | POST | Создание фильтра | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/filter/addFilter) |
| `management_chart_annotation_get` | GET | Информация о примечании | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/chart_annotation/get) |
| `management_chart_annotation_update_1` | PUT | Изменение примечания | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/chart_annotation/update_1) |
| `management_chart_annotation_delete` | DELETE | Удаление примечания | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/chart_annotation/delete) |
| `management_chart_annotation_findAll_3` | GET | Список примечаний | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/chart_annotation/findAll_3) |
| `management_chart_annotation_create` | POST | Создание примечания | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/chart_annotation/create) |
| `management_segment_getSegment` | GET | Информация о сегменте | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/segment/getSegment) |
| `management_segment_updateSegment` | PUT | Изменение сегмента | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/segment/updateSegment) |
| `management_segment_deleteSegment` | DELETE | Удаление сегмента | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/segment/deleteSegment) |
| `management_segment_getSegmentsForCounter` | GET | Список сегментов для счетчика | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/segment/getSegmentsForCounter) |
| `management_segment_createSegment` | POST | Создание сегмента | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/segment/createSegment) |
| `management_account_accounts` | GET | Список аккаунтов | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/account/accounts) |
| `management_account_updateAccounts` | PUT | Изменение списка аккаунтов | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/account/updateAccounts) |
| `management_account_deleteAccount` | DELETE | Удаление аккаунта | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/account/deleteAccount) |
| `management_delegates_delegates` | GET | Список представителей | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/delegates/delegates) |
| `management_delegates_addDelegate` | POST | Добавление представителя | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/delegates/addDelegate) |
| `management_delegates_deleteDelegate` | DELETE | Удаление представителя | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/delegates/deleteDelegate) |
| `management_counter-label_setCounterLabel` | POST | Привязать счетчик к метке | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/counter-label/setCounterLabel) |
| `management_counter-label_unsetCounterLabel` | DELETE | Отменить привязку счетчика к метке | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/counter-label/unsetCounterLabel) |
| `management_clients_getClients` | GET | Список доступных клиентов | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/clients/getClients) |
| `management_cloud_getExportsByCounter` | GET | Получение информации об объектах, которые экспортируются в Yandex Cloud | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/cloud/getExportsByCounter) |
| `management_cloud_removeCounter` | DELETE | Отключение экспорта на счетчике | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/cloud/removeCounter) |
| `management_expense_uploadMultipart` | POST | Загрузка расходов как multipart/form-data | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/expense/uploadMultipart) |
| `management_expense_uploadRemoveSingleLine` | POST | Удаление данных о расходах в запросе | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/expense/uploadRemoveSingleLine) |
| `management_expense_uploadRemoveBody_1` | POST | Удаление данных о расходах как multipart/form-data | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/expense/uploadRemoveBody_1) |
| `management_expense_findAll_2` | GET | Список загрузок расходов | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/expense/findAll_2) |
| `management_expense_findById_2` | GET | Информация о загрузке расходов | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/expense/findById_2) |
| `management_schema_uploadSimpleOrders` | POST | Загрузка упрощенных данных о клиентах и заказах (CSV) | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/uploadSimpleOrders) |
| `management_schema_mapOrderStatuses` | POST | Сопоставление статусов заказов | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/mapOrderStatuses) |
| `management_schema_getOrderStatuses` | GET | Список сопоставленных статусов заказов | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/getOrderStatuses) |
| `management_schema_uploadContacts` | POST | Загрузка данных о клиентах (CSV) | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/uploadContacts) |
| `management_schema_uploadContactJson_1` | POST | Загрузка данных о клиентах (JSON) | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/uploadContactJson_1) |
| `management_schema_uploadOrders` | POST | Загрузка заказов (CSV) | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/uploadOrders) |
| `management_schema_uploadOrdersJson_1` | POST | Загрузка заказов (JSON) | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/uploadOrdersJson_1) |
| `management_schema_createAttributes` | POST | Создание атрибутов | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/createAttributes) |
| `management_schema_createProducts` | POST | Создание списка товаров | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/createProducts) |
| `management_schema_getAttributes` | GET | Информация о всех атрибутах | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/getAttributes) |
| `management_schema_getPredefinedTypes` | GET | Информация о типах пользовательских атрибутов | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/getPredefinedTypes) |
| `management_schema_getTypes` | GET | Информация о типах системных атрибутов | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/getTypes) |
| `management_schema_getLastUploadings` | GET | Информация о последних загрузках | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/schema/getLastUploadings) |
| `management_call_uploadCalls` | POST | Загрузка информации о звонках | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/call/uploadCalls) |
| `management_call_findAllCallUploadings` | GET | Список загрузок информации о звонках | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/call/findAllCallUploadings) |
| `management_call_findCallUploadingById` | GET | Информация о загрузке звонков | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/call/findCallUploadingById) |
| `management_offline_conversions_upload_1` | POST | Загрузка офлайн-конверсий | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/offline_conversions/upload_1) |
| `management_offline_conversions_findAll_1` | GET | Список загрузок офлайн-конверсий | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/offline_conversions/findAll_1) |
| `management_offline_conversions_findById_1` | GET | Информация о загрузке офлайн-конверсий | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/offline_conversions/findById_1) |
| `management_chats_upload_chats` | POST | Загрузка информации о чатах | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/chats/upload_chats) |
| `management_chats_findAll_chats` | GET | Список загрузок информации о чатах | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/chats/findAll_chats) |
| `management_chats_findById_chats` | GET | Информация о загрузке чатов | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/chats/findById_chats) |
| `management_user_params_findById` | GET | Информация о загрузке параметров | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/user_params/findById) |
| `management_user_params_upload` | POST | Загрузка параметров | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/user_params/upload) |
| `management_user_params_confirm` | POST | Подтверждение загрузки параметров | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/user_params/confirm) |
| `management_user_params_findAll` | GET | Список загрузок параметров | чтение | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/user_params/findAll) |
| `management_measurement_generateToken` | GET | Генерация дополнительных токенов | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/measurement/generateToken) |
| `management_measurement_deleteToken` | POST | Удаление токена | запись | [Источник](https://yandex.ru/dev/metrika/ru/management/openapi/measurement/deleteToken) |
| `stat_pivot` | GET | Получение сводной таблицы | чтение | [Источник](https://yandex.ru/dev/metrika/ru/stat/openapi/pivot) |
| `stat_drilldown` | GET | Drill down | чтение | [Источник](https://yandex.ru/dev/metrika/ru/stat/openapi/drilldown) |
| `stat_comparison_drilldown` | GET | Сравнение - drill down | чтение | [Источник](https://yandex.ru/dev/metrika/ru/stat/openapi/comparison_drilldown) |
| `stat_comparison_1` | GET | Сравнение сегментов | чтение | [Источник](https://yandex.ru/dev/metrika/ru/stat/openapi/comparison_1) |
| `stat_bytime` | GET | Получение данных по времени | чтение | [Источник](https://yandex.ru/dev/metrika/ru/stat/openapi/bytime) |
| `stat_data_1` | GET | Таблица | чтение | [Источник](https://yandex.ru/dev/metrika/ru/stat/openapi/data_1) |
| `logs_getLogRequests_1` | GET | Список запросов логов | чтение | [Источник](https://yandex.ru/dev/metrika/ru/logs/openapi/getLogRequests_1) |
| `logs_createLogRequest_1` | POST | Создание запроса логов | запись | [Источник](https://yandex.ru/dev/metrika/ru/logs/openapi/createLogRequest_1) |
| `logs_clean` | POST | Очистка подготовленных для загрузки логов обработанного запроса | запись | [Источник](https://yandex.ru/dev/metrika/ru/logs/openapi/clean) |
| `logs_cancel` | POST | Отмена не обработанного запроса логов | запись | [Источник](https://yandex.ru/dev/metrika/ru/logs/openapi/cancel) |
| `logs_evaluate` | GET | Оценка возможности создания запроса | чтение | [Источник](https://yandex.ru/dev/metrika/ru/logs/openapi/evaluate) |
| `logs_download` | GET | Загрузка части подготовленных логов обработанного запроса | чтение | [Источник](https://yandex.ru/dev/metrika/ru/logs/openapi/download) |
| `logs_getLogRequest` | GET | Информация о запросе логов | чтение | [Источник](https://yandex.ru/dev/metrika/ru/logs/openapi/getLogRequest) |
