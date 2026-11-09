'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { pageMessages } from './messages';

import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_STORAGE_KEY, LOCALES, isLocale, type Locale } from './locale-config';

export type { Locale } from './locale-config';

type Dictionary = Record<string, string>;
type Params = Record<string, string | number>;
type DateInput = string | number | Date | null | undefined;

export type Formatters = {
  date: (value: DateInput) => string;
  dateTime: (value: DateInput) => string;
  time: (value: DateInput) => string;
  money: (value: number | string | null | undefined, currency?: string) => string;
  number: (value: number | string | null | undefined, digits?: number) => string;
  hours: (value: number | string | null | undefined) => string;
  duration: (minutes: number | null | undefined) => string;
  status: (status: string | null | undefined) => string;
  role: (role: string | null | undefined) => string;
  eventType: (type: string | null | undefined) => string;
};

type I18nContextValue = {
  locale: Locale;
  localeCode: string;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Params) => string;
  has: (key: string) => boolean;
  fmt: Formatters;
};

const baseDictionaries: Record<Locale, Dictionary> = {
  ru: {
    commonLoading: 'Загрузка...',
    commonRefresh: 'Обновить',
    commonActions: 'Действия',
    commonStatus: 'Статус',
    commonEmployee: 'Сотрудник',
    commonAssignment: 'Задание',
    commonObject: 'Объект',
    commonCustomer: 'Заказчик',
    commonDate: 'Дата',
    commonTime: 'Время',
    commonType: 'Тип',
    commonWork: 'Работа',
    commonBack: 'Назад',
    commonEdit: 'Редактировать',
    commonDelete: 'Удалить',
    commonClose: 'Закрыть',
    commonView: 'Посмотреть',
    commonOpen: 'Открыть',
    asgEyebrow: 'AS / Aufträge',
    asgTitle: 'Задания',
    asgHero: 'Реальные задания из work_orders: сотрудник, объект, клиент, работа, плановое время и статус.',
    asgList: 'Список заданий',
    asgCreate: 'Создать задание',
    asgNoItems: 'Заданий пока нет. Нажми “Создать задание”.',
    asgShow: 'AS / Просмотр задания',
    asgReferenceNumber: 'Referenznummer',
    asgWorkTitle: 'Название работы',
    asgObjectAddress: 'Адрес объекта',
    asgPlannedStart: 'Плановый старт',
    asgPlannedStop: 'Плановый стоп',
    asgDeleteConfirm: 'Удалить задание {label}?',
    asgDeleted: 'Задание {label} удалено.',
    asgDeleteFailed: 'Не удалось удалить: {error}',
    apprEyebrow: 'OK / Freigabe',
    apprTitle: 'Согласование',
    apprHero: 'Проверка пар событий рабочего дня: дорога, рабочее время и служебные поездки.',
    apprQueue: 'Очередь согласования',
    apprApprove: 'Согласовать',
    apprReject: 'Отклонить',
    apprNoItems: 'Пока нет событий для согласования. Они появятся после рабочего дня сотрудника.',
    mgrEyebrow: 'Менеджер',
    mgrTitle: 'Панель менеджера',
    mgrHero: 'Обзор согласований, открытых заданий и событий смены.',
    mgrLoaded: 'Загружено для {name} ({role}).',
    mgrWaiting: 'Ждут проверки',
    mgrWaitingText: 'Новые отрезки времени, которые менеджер ещё не подтвердил.',
    mgrChecked: 'Проверено',
    mgrCheckedText: 'Уже подтверждённые отрезки рабочего времени.',
    mgrActiveOrders: 'Активные задания',
    mgrActiveOrdersText: 'Назначены сотрудникам и ещё не закрыты.',
    mgrShiftEvents: 'События смены',
    mgrShiftEventsText: 'Дорога, начало работы, завершение работы и служебные поездки.',
    mgrLatestApprovals: 'Последние согласования',
    mgrApprovalsHint: 'Очередь OK / Freigabe.',
    mgrNoApprovals: 'Пока нет согласований.',
    mgrOpenOrders: 'Открытые задания',
    mgrOpenOrdersHint: 'AS / Aufträge.',
    mgrNoOpenOrders: 'Нет открытых заданий.',
    mgrLatestEvents: 'Последние события смены',
    mgrEventsHint: 'EV / Ereignisse.',
    mgrNoEvents: 'Пока нет событий смены.',
    mapsTitle: 'Карта событий',
    mapsHero: 'Координаты, сохранённые при Gasfahrt, Dienstbeginn, Stop и Dienstfahrt.',
    mapsEvent: 'Событие',
    mapsMap: 'Карта',
    mapsShow: 'Показать',
    mapsNoCoordinates: 'Нет координат',
    mapsLoading: 'Загружаю координаты...',
    mapsNoEvents: 'Событий пока нет.',
    mapsApiUnavailable: 'API недоступен. Проверь backend.',
    woNewEyebrow: 'AS / Neuer Auftrag',
    woNewTitle: 'Создать задание',
    woNewHero: 'Задание попадёт в work_orders и будет доступно сотруднику на странице “Рабочий день”.',
    woBackToAssignments: 'Назад к заданиям',
    woSelectEmployee: 'Выбери сотрудника',
    woObjectPlaceholder: 'Например RLCI Objekt 2',
    woAddress: 'Адрес',
    woClientName: 'Название клиента',
    woWorkTitlePlaceholder: 'Например Sicherheitskontrolle',
    woRefPlaceholder: 'Например RLCI-WORK-002',
    woZugPlaceholder: 'Например ICE 101',
    woEinsatzPlaceholder: 'Например Berlin / Gleis 2',
    woSaveAssignment: 'Сохранить задание',
    woEditEyebrow: 'AS / Auftrag bearbeiten',
    woEditTitle: 'Редактировать задание #{id}',
    woEditHero: 'Изменение сотрудника, объекта, клиента, планового времени и статуса задания.',
    woSaveChanges: 'Сохранить изменения',
    woViewEyebrow: 'AS / Auftrag',
    woViewTitle: 'Просмотр задания #{id}',
    woRequired: 'Сотрудник, название работы и Referenznummer обязательны.',
    loginSecureAccess: 'Безопасный доступ',
    loginTitle: 'Вход в CRM',
    loginSubtitle: 'Введите данные администратора или сотрудника.',
    loginPassword: 'Пароль',
    loginPasswordPlaceholder: 'Введите пароль',
    loginRole: 'Роль',
    roleEmployee: 'Сотрудник',
    roleManager: 'Менеджер',
    roleAdmin: 'Администратор',
    loginPleaseWait: 'Подождите...',
    loginButton: 'Войти в систему',
    loginBackToLogin: 'Вернуться ко входу',
    loginChecking: 'Проверяем доступ...',
    loginOpening: 'Открываю кабинет...',
    loginFailed: 'Не удалось войти.',
    loginLoggedAs: '{name} вошёл как {role}. {open}',
    brandSubtitle: 'Выездные работы и учёт времени',
    groupWork: 'Работа',
    groupOperations: 'Операции',
    groupDirectories: 'Справочники',
    home: 'Главная',
    fieldDay: 'Рабочий день',
    employeeCabinet: 'Профиль',
    gpsMap: 'Карта GPS',
    time: 'Время',
    managerDashboard: 'Панель менеджера',
    workEvents: 'События смены',
    approvals: 'Согласование',
    assignments: 'Задания',
    billing: 'Счета',
    employees: 'Сотрудники',
    clients: 'Клиенты',
    objects: 'Объекты',
    documents: 'Документы',
    audit: 'Аудит',
    admin: 'Админка',
    workFilterTitle: 'Фильтр работ',
    workFilterCurrent: 'Текущие',
    workFilterCompleted: 'Завершённые',
    workFilterAll: 'Все',
    workDateToday: 'Сегодня',
    workDateLast7: 'Последние 7 дней',
    workDatePick: 'Выбрать дату',
    noFilteredWorks: 'Нет работ для этого фильтра.',
    reports: 'Отчёты',
    reportsTitle: 'Раздел отчётов',
    reportsEmpty: 'Пока пусто. Позже здесь будут смены, часы, маршруты, GPS и статистика по работам.',
    login: 'Вход',
    logout: 'Выйти',
    language: 'Язык',
    employeeRole: 'сотрудник',
    managerRole: 'менеджер',
    adminRole: 'администратор',

    actionGasfahrtStart: 'Gasfahrt — выезд из дома',
    actionGasfahrtStop: 'Gasfahrt beendet — прибыл на объект',
    actionDienstbeginn: 'Dienstbeginn — начало работы',
    actionArbeitStop: 'Stop — окончание работы',
    actionDienstfahrtStart: 'Start Dienstfahrt — выезд на следующее место',
    actionDienstfahrtStop: 'Stop Dienstfahrt — прибыл на следующее место',

    stateIdle: 'Готов к выезду',
    stateGasfahrtActive: 'В дороге на работу',
    stateArrived: 'Прибыл на объект',
    stateWorkActive: 'Работа выполняется',
    stateWorkFinished: 'Работа завершена',
    stateDienstfahrtActive: 'Служебный переезд',
    stateDienstfahrtFinished: 'Прибыл на следующее место',

    fieldEyebrow: 'Рабочий день',
    fieldTitle: 'Рабочий день сотрудника',
    fieldHeroText: 'Gasfahrt → Gasfahrt beendet → Dienstbeginn → Stop → Dienstfahrt. Один объект может иметь несколько заказчиков и несколько работ.',
    object: 'Объект',
    objectLoading: 'Объект загружается',
    nextAction: 'Следующее действие',
    selectedWork: 'Выбранная работа',
    workNotSelected: 'Работа не выбрана',
    customerNotSelected: 'Заказчик не выбран',
    workFact: 'Факт по работе',
    date: 'Дата',
    workType: 'Тип работы / Leistungsart',
    customWorkTypeOption: 'Пустая строка — внести вручную',
    customWorkType: 'Своя Leistungsart',
    customWorkTypePlaceholder: 'Например Sonderkontrolle',
    plannedStart: 'Плановый Start',
    plannedStop: 'Плановый Stop',
    nightWork: 'Nacht / ночная работа',
    sunday: 'Sonntag / воскресенье',
    holiday: 'Feiertag / праздник',
    bemerkung: 'Bemerkung',
    bemerkungPlaceholder: 'Описание особенностей, обязательно при превышении планового времени',
    resetWorkday: 'Сбросить рабочий день',
    saving: 'Сохраняю...',
    done: 'выполнено',
    actionLog: 'Лог действий',
    noActions: 'Пока действий нет.',
    googleMapsPosition: 'Google Maps позиция',
    openLastPoint: 'Открыть последнюю точку на Google Maps',
    coordinatesAfterAllow: 'Координаты появятся после разрешения геолокации',
    lastGpsEvent: 'Последнее событие с координатами: {event}',
    noGpsEvent: 'нет',
    workdayTimeline: 'Лента событий рабочего дня',
    noEvents: 'Событий пока нет.',
    loadingAssignments: 'Загружаю рабочие задания...',
    geoWillAsk: 'Геопозиция будет запрошена при нажатии рабочей кнопки.',
    backendUnavailable: 'Не могу получить состояние сотрудника. Проверь API состояния рабочего дня.',
    preparingAssignments: 'Готовлю объект, заказчиков и работы...',
    assignmentsLoaded: 'Рабочие задания загружены. Выбери работу и нажми рабочую кнопку.',
    assignmentsFailed: 'Не удалось подготовить задания: {error}',
    unknownError: 'неизвестная ошибка',
    buttonBlocked: 'Кнопка заблокирована: проверь выбранную работу, обязательные поля или Bemerkung.',
    routeMissing: 'Не найдена API route для следующего действия.',
    sending: 'Отправляю: {action}...',
    logSending: 'отправка: {action}',
    coordinatesReady: 'Координаты получены: {lat}, {lng} ±{accuracy} м',
    coordinatesDenied: 'Браузер не дал координаты. Событие сохранится без точки на карте.',
    saved: '{action} сохранено.',
    logSaved: '{action} сохранено в API',
    logFailed: '{action} не сохранено: {error}',
    backendRejected: 'Backend не принял действие: {error}',
    resettingWorkday: 'Сбрасываю рабочий день...',
    resetLog: 'рабочий день сброшен, удалено событий: {count}',
    resetDone: 'Рабочий день сброшен. Можно начинать с Gasfahrt.',
    resetFailedLog: 'сброс не выполнен: {error}',
    resetFailed: 'Не удалось сбросить workflow: {error}',
    stopBlockedTitle: 'Stop заблокирован:',
    stopBlockedText: 'плановое время превышено, заполни Bemerkung.',
    dienstbeginnBlockedTitle: 'Dienstbeginn заблокирован:',
    dienstbeginnBlockedText: 'дата, Leistungsart, Referenznummer, Zugnummer и Einsatzort обязательны.',
    minutesShort: '{count} мин',
    hoursShort: '{hours} ч',
    hoursMinutesShort: '{hours} ч {minutes} мин',
  },
  de: {
    commonLoading: 'Laden...',
    commonRefresh: 'Aktualisieren',
    commonActions: 'Aktionen',
    commonStatus: 'Status',
    commonEmployee: 'Mitarbeiter',
    commonAssignment: 'Auftrag',
    commonObject: 'Objekt',
    commonCustomer: 'Kunde',
    commonDate: 'Datum',
    commonTime: 'Zeit',
    commonType: 'Typ',
    commonWork: 'Arbeit',
    commonBack: 'Zurück',
    commonEdit: 'Bearbeiten',
    commonDelete: 'Löschen',
    commonClose: 'Schließen',
    commonView: 'Ansehen',
    commonOpen: 'Öffnen',
    asgEyebrow: 'AS / Aufträge',
    asgTitle: 'Aufträge',
    asgHero: 'Reale Aufträge aus work_orders: Mitarbeiter, Objekt, Kunde, Arbeit, geplante Zeit und Status.',
    asgList: 'Auftragsliste',
    asgCreate: 'Auftrag erstellen',
    asgNoItems: 'Es gibt noch keine Aufträge. Klicken Sie auf “Auftrag erstellen”.',
    asgShow: 'AS / Auftrag anzeigen',
    asgReferenceNumber: 'Referenznummer',
    asgWorkTitle: 'Arbeitstitel',
    asgObjectAddress: 'Objektadresse',
    asgPlannedStart: 'Geplanter Start',
    asgPlannedStop: 'Geplantes Ende',
    asgDeleteConfirm: 'Auftrag {label} löschen?',
    asgDeleted: 'Auftrag {label} wurde gelöscht.',
    asgDeleteFailed: 'Löschen fehlgeschlagen: {error}',
    apprEyebrow: 'OK / Freigabe',
    apprTitle: 'Freigabe',
    apprHero: 'Prüfung der Ereignispaare des Arbeitstags: Fahrt, Arbeitszeit und Dienstfahrten.',
    apprQueue: 'Freigabewarteschlange',
    apprApprove: 'Freigeben',
    apprReject: 'Ablehnen',
    apprNoItems: 'Es gibt noch keine Ereignisse zur Freigabe. Sie erscheinen nach dem Arbeitstag des Mitarbeiters.',
    mgrEyebrow: 'Manager',
    mgrTitle: 'Manager-Dashboard',
    mgrHero: 'Übersicht über Freigaben, offene Aufträge und Schichtereignisse.',
    mgrLoaded: 'Geladen für {name} ({role}).',
    mgrWaiting: 'Wartet auf Prüfung',
    mgrWaitingText: 'Neue Zeitabschnitte, die der Manager noch nicht bestätigt hat.',
    mgrChecked: 'Geprüft',
    mgrCheckedText: 'Bereits bestätigte Arbeitszeitabschnitte.',
    mgrActiveOrders: 'Aktive Aufträge',
    mgrActiveOrdersText: 'Mitarbeitern zugewiesen und noch nicht geschlossen.',
    mgrShiftEvents: 'Schichtereignisse',
    mgrShiftEventsText: 'Fahrt, Arbeitsbeginn, Arbeitsende und Dienstfahrten.',
    mgrLatestApprovals: 'Letzte Freigaben',
    mgrApprovalsHint: 'Warteschlange OK / Freigabe.',
    mgrNoApprovals: 'Es gibt noch keine Freigaben.',
    mgrOpenOrders: 'Offene Aufträge',
    mgrOpenOrdersHint: 'AS / Aufträge.',
    mgrNoOpenOrders: 'Keine offenen Aufträge.',
    mgrLatestEvents: 'Letzte Schichtereignisse',
    mgrEventsHint: 'EV / Ereignisse.',
    mgrNoEvents: 'Es gibt noch keine Schichtereignisse.',
    mapsTitle: 'Ereigniskarte',
    mapsHero: 'Koordinaten, die bei Gasfahrt, Dienstbeginn, Stop und Dienstfahrt gespeichert wurden.',
    mapsEvent: 'Ereignis',
    mapsMap: 'Karte',
    mapsShow: 'Anzeigen',
    mapsNoCoordinates: 'Keine Koordinaten',
    mapsLoading: 'Koordinaten werden geladen...',
    mapsNoEvents: 'Es gibt noch keine Ereignisse.',
    mapsApiUnavailable: 'API nicht erreichbar. Backend prüfen.',
    woNewEyebrow: 'AS / Neuer Auftrag',
    woNewTitle: 'Auftrag erstellen',
    woNewHero: 'Der Auftrag wird in work_orders gespeichert und ist für den Mitarbeiter im Bereich “Arbeitstag” verfügbar.',
    woBackToAssignments: 'Zurück zu den Aufträgen',
    woSelectEmployee: 'Mitarbeiter auswählen',
    woObjectPlaceholder: 'Zum Beispiel RLCI Objekt 2',
    woAddress: 'Adresse',
    woClientName: 'Kundenname',
    woWorkTitlePlaceholder: 'Zum Beispiel Sicherheitskontrolle',
    woRefPlaceholder: 'Zum Beispiel RLCI-WORK-002',
    woZugPlaceholder: 'Zum Beispiel ICE 101',
    woEinsatzPlaceholder: 'Zum Beispiel Berlin / Gleis 2',
    woSaveAssignment: 'Auftrag speichern',
    woEditEyebrow: 'AS / Auftrag bearbeiten',
    woEditTitle: 'Auftrag #{id} bearbeiten',
    woEditHero: 'Mitarbeiter, Objekt, Kunde, geplante Zeit und Status des Auftrags bearbeiten.',
    woSaveChanges: 'Änderungen speichern',
    woViewEyebrow: 'AS / Auftrag',
    woViewTitle: 'Auftrag #{id} anzeigen',
    woRequired: 'Mitarbeiter, Arbeitstitel und Referenznummer sind Pflichtfelder.',
    loginSecureAccess: 'Sicherer Zugang',
    loginTitle: 'CRM-Anmeldung',
    loginSubtitle: 'Geben Sie die Zugangsdaten des Administrators oder Mitarbeiters ein.',
    loginPassword: 'Passwort',
    loginPasswordPlaceholder: 'Passwort eingeben',
    loginRole: 'Rolle',
    roleEmployee: 'Mitarbeiter',
    roleManager: 'Manager',
    roleAdmin: 'Administrator',
    loginPleaseWait: 'Bitte warten...',
    loginButton: 'Einloggen',
    loginBackToLogin: 'Zur Anmeldung zurück',
    loginChecking: 'Zugang wird geprüft...',
    loginOpening: 'Dashboard wird geöffnet...',
    loginFailed: 'Anmeldung fehlgeschlagen.',
    loginLoggedAs: '{name} ist als {role} angemeldet. {open}',
    brandSubtitle: 'Außendienst & Zeiterfassung',
    groupWork: 'Arbeit',
    groupOperations: 'Operationen',
    groupDirectories: 'Stammdaten',
    home: 'Startseite',
    fieldDay: 'Arbeitstag',
    employeeCabinet: 'Profil',
    gpsMap: 'GPS-Karte',
    time: 'Zeit',
    managerDashboard: 'Manager-Dashboard',
    workEvents: 'Schichtereignisse',
    approvals: 'Freigabe',
    assignments: 'Aufträge',
    billing: 'Rechnungen',
    employees: 'Mitarbeiter',
    clients: 'Kunden',
    objects: 'Objekte',
    documents: 'Dokumente',
    audit: 'Audit',
    admin: 'Adminbereich',
    workFilterTitle: 'Arbeitsfilter',
    workFilterCurrent: 'Aktuell',
    workFilterCompleted: 'Abgeschlossen',
    workFilterAll: 'Alle',
    workDateToday: 'Heute',
    workDateLast7: 'Letzte 7 Tage',
    workDatePick: 'Datum wählen',
    noFilteredWorks: 'Keine Arbeiten für diesen Filter.',
    reports: 'Berichte',
    reportsTitle: 'Berichte',
    reportsEmpty: 'Noch leer. Später werden hier Schichten, Stunden, Routen, GPS und Arbeitsstatistiken angezeigt.',
    login: 'Anmelden',
    logout: 'Abmelden',
    language: 'Sprache',
    employeeRole: 'Mitarbeiter',
    managerRole: 'Manager',
    adminRole: 'Administrator',

    actionGasfahrtStart: 'Gasfahrt — Abfahrt von Zuhause',
    actionGasfahrtStop: 'Gasfahrt beendet — am Objekt angekommen',
    actionDienstbeginn: 'Dienstbeginn — Arbeit starten',
    actionArbeitStop: 'Stop — Arbeit beenden',
    actionDienstfahrtStart: 'Start Dienstfahrt — Fahrt zum nächsten Einsatzort',
    actionDienstfahrtStop: 'Stop Dienstfahrt — am nächsten Einsatzort angekommen',

    stateIdle: 'Bereit zur Abfahrt',
    stateGasfahrtActive: 'Auf dem Weg zur Arbeit',
    stateArrived: 'Am Objekt angekommen',
    stateWorkActive: 'Arbeit läuft',
    stateWorkFinished: 'Arbeit beendet',
    stateDienstfahrtActive: 'Dienstfahrt läuft',
    stateDienstfahrtFinished: 'Am nächsten Einsatzort angekommen',

    fieldEyebrow: 'Arbeitstag',
    fieldTitle: 'Arbeitstag des Mitarbeiters',
    fieldHeroText: 'Gasfahrt → Gasfahrt beendet → Dienstbeginn → Stop → Dienstfahrt. Ein Objekt kann mehrere Kunden und mehrere Arbeiten haben.',
    object: 'Objekt',
    objectLoading: 'Objekt wird geladen',
    nextAction: 'Nächste Aktion',
    selectedWork: 'Ausgewählte Arbeit',
    workNotSelected: 'Keine Arbeit ausgewählt',
    customerNotSelected: 'Kein Kunde ausgewählt',
    workFact: 'Ist-Zeit Arbeit',
    date: 'Datum',
    workType: 'Arbeitsart / Leistungsart',
    customWorkTypeOption: 'Leere Zeile — manuell eintragen',
    customWorkType: 'Eigene Leistungsart',
    customWorkTypePlaceholder: 'Zum Beispiel Sonderkontrolle',
    plannedStart: 'Geplanter Start',
    plannedStop: 'Geplanter Stop',
    nightWork: 'Nachtarbeit',
    sunday: 'Sonntag',
    holiday: 'Feiertag',
    bemerkung: 'Bemerkung',
    bemerkungPlaceholder: 'Besonderheiten beschreiben; Pflicht bei Überschreitung der Planzeit',
    resetWorkday: 'Arbeitstag zurücksetzen',
    saving: 'Speichern...',
    done: 'erledigt',
    actionLog: 'Aktionsprotokoll',
    noActions: 'Noch keine Aktionen.',
    googleMapsPosition: 'Google-Maps-Position',
    openLastPoint: 'Letzten Punkt in Google Maps öffnen',
    coordinatesAfterAllow: 'Koordinaten erscheinen nach Freigabe der Geoposition',
    lastGpsEvent: 'Letztes Ereignis mit Koordinaten: {event}',
    noGpsEvent: 'keins',
    workdayTimeline: 'Ereignisverlauf des Arbeitstags',
    noEvents: 'Noch keine Ereignisse.',
    loadingAssignments: 'Arbeitsaufträge werden geladen...',
    geoWillAsk: 'Die Geoposition wird beim Drücken der Arbeitstaste abgefragt.',
    backendUnavailable: 'Mitarbeiterstatus kann nicht geladen werden. Prüfe die API für den Arbeitstag.',
    preparingAssignments: 'Objekt, Kunden und Arbeiten werden vorbereitet...',
    assignmentsLoaded: 'Arbeitsaufträge geladen. Wähle eine Arbeit und drücke die Workflow-Taste.',
    assignmentsFailed: 'Arbeitsaufträge konnten nicht vorbereitet werden: {error}',
    unknownError: 'unbekannter Fehler',
    buttonBlocked: 'Taste gesperrt: prüfe ausgewählte Arbeit, Pflichtfelder oder Bemerkung.',
    routeMissing: 'API-Route für die nächste Aktion wurde nicht gefunden.',
    sending: 'Sende: {action}...',
    logSending: 'Senden: {action}',
    coordinatesReady: 'Koordinaten erhalten: {lat}, {lng} ±{accuracy} m',
    coordinatesDenied: 'Browser hat keine Koordinaten geliefert. Ereignis wird ohne Kartenpunkt gespeichert.',
    saved: '{action} gespeichert.',
    logSaved: '{action} in API gespeichert',
    logFailed: '{action} nicht gespeichert: {error}',
    backendRejected: 'Backend hat die Aktion abgelehnt: {error}',
    resettingWorkday: 'Arbeitstag wird zurückgesetzt...',
    resetLog: 'Arbeitstag zurückgesetzt, entfernte Ereignisse: {count}',
    resetDone: 'Arbeitstag zurückgesetzt. Start mit Gasfahrt ist möglich.',
    resetFailedLog: 'Zurücksetzen fehlgeschlagen: {error}',
    resetFailed: 'Workflow konnte nicht zurückgesetzt werden: {error}',
    stopBlockedTitle: 'Stop gesperrt:',
    stopBlockedText: 'Planzeit überschritten, Bemerkung ausfüllen.',
    dienstbeginnBlockedTitle: 'Dienstbeginn gesperrt:',
    dienstbeginnBlockedText: 'Datum, Leistungsart, Referenznummer, Zugnummer und Einsatzort sind Pflichtfelder.',
    minutesShort: '{count} Min.',
    hoursShort: '{hours} Std.',
    hoursMinutesShort: '{hours} Std. {minutes} Min.',
  },
};

const dictionaries: Record<Locale, Dictionary> = {
  ru: { ...baseDictionaries.ru, ...pageMessages.ru },
  de: { ...baseDictionaries.de, ...pageMessages.de },
};

export function localeCodeOf(locale: Locale) {
  return locale === 'ru' ? 'ru-RU' : 'de-DE';
}

let activeLocale: Locale = DEFAULT_LOCALE;

/** Current UI locale for non-React code (API helpers, CSV export). */
export function getActiveLocale(): Locale {
  return activeLocale;
}

export function translate(locale: Locale, key: string, params: Params = {}) {
  const template = dictionaries[locale][key] ?? dictionaries.de[key] ?? dictionaries.ru[key] ?? key;
  return Object.entries(params).reduce(
    (text, [paramKey, paramValue]) => text.split(`{${paramKey}}`).join(String(paramValue)),
    template,
  );
}

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  // API times are Europe/Berlin wall-clock strings "YYYY-MM-DD HH:MM:SS"; Safari needs the "T".
  const date = value instanceof Date
    ? value
    : new Date(typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d/.test(value) ? value.replace(' ', 'T') : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function createFormatters(locale: Locale): Formatters {
  const code = localeCodeOf(locale);
  const t = (key: string, params?: Params) => translate(locale, key, params);
  const lookup = (prefix: string, value: string | null | undefined) => {
    if (!value) return '—';
    const key = `${prefix}${value}`;
    return dictionaries[locale][key] ?? dictionaries.de[key] ?? value;
  };

  return {
    date: (value) => {
      const date = toDate(value);
      return date ? new Intl.DateTimeFormat(code, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : '—';
    },
    dateTime: (value) => {
      const date = toDate(value);
      return date
        ? new Intl.DateTimeFormat(code, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
        : '—';
    },
    time: (value) => {
      const date = toDate(value);
      return date ? new Intl.DateTimeFormat(code, { hour: '2-digit', minute: '2-digit' }).format(date) : '—';
    },
    money: (value, currency = 'EUR') => {
      const number = toNumber(value);
      return new Intl.NumberFormat(code, { style: 'currency', currency }).format(number ?? 0);
    },
    number: (value, digits = 2) => {
      const number = toNumber(value);
      return number === null ? '—' : new Intl.NumberFormat(code, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(number);
    },
    hours: (value) => {
      const number = toNumber(value);
      return t('fmtHours', { value: new Intl.NumberFormat(code, { maximumFractionDigits: 2 }).format(number ?? 0) });
    },
    duration: (minutes) => {
      const total = Math.max(0, Math.round(minutes || 0));
      if (total < 60) return t('minutesShort', { count: total });
      const hours = Math.floor(total / 60);
      const rest = total % 60;
      return rest ? t('hoursMinutesShort', { hours, minutes: rest }) : t('hoursShort', { hours });
    },
    status: (status) => lookup('status_', status),
    role: (role) => lookup('role_', role),
    eventType: (type) => lookup('event_', type),
  };
}

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

/** Adds Accept-Language to every request so the API answers in the UI language. */
function installLocaleFetch() {
  const marker = '__railCrmLocaleFetch';
  const globalWindow = window as unknown as Record<string, unknown>;
  if (globalWindow[marker]) return;
  globalWindow[marker] = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has('Accept-Language')) {
      headers.set('Accept-Language', activeLocale);
    }
    return originalFetch(input, { ...init, headers });
  };
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);
  activeLocale = locale;

  useEffect(() => {
    installLocaleFetch();

    // Older sessions stored the choice only in localStorage: move it to the cookie once.
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (!initialLocale && isLocale(stored) && stored !== locale) {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    activeLocale = locale;
    document.documentElement.lang = locale;
    writeLocaleCookie(locale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // storage can be unavailable (private mode); the cookie still keeps the choice
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    localeCode: localeCodeOf(locale),
    setLocale: (next: Locale) => {
      activeLocale = next;
      setLocaleState(next);
    },
    t: (key, params) => translate(locale, key, params),
    has: (key) => key in dictionaries[locale],
    fmt: createFormatters(locale),
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }

  return context;
}

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className={`language-switcher ${className}`.trim()} role="group" aria-label={t('language')}>
      <span>{t('language')}</span>
      <div>
        {LOCALES.map((item) => (
          <button
            aria-pressed={locale === item}
            className={locale === item ? 'active' : ''}
            key={item}
            onClick={() => setLocale(item)}
            type="button"
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
