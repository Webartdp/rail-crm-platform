'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'ru' | 'de';

type Dictionary = Record<string, string>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const localeStorageKey = 'rail-crm-locale';

const dictionaries: Record<Locale, Dictionary> = {
  ru: {
    brandSubtitle: 'режим разработки',
    groupWork: 'Работа',
    groupOperations: 'Операции',
    groupDirectories: 'Справочники',
    home: 'Главная',
    fieldDay: 'Рабочий день',
    employeeCabinet: 'Кабинет сотрудника',
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

    fieldEyebrow: 'Field CRM / русский dev-режим',
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
    brandSubtitle: 'Entwicklungsmodus',
    groupWork: 'Arbeit',
    groupOperations: 'Operationen',
    groupDirectories: 'Stammdaten',
    home: 'Startseite',
    fieldDay: 'Arbeitstag',
    employeeCabinet: 'Mitarbeiterbereich',
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

    fieldEyebrow: 'Field CRM / deutscher Dev-Modus',
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

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru';
  return window.localStorage.getItem(localeStorageKey) === 'de' ? 'de' : 'ru';
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ru');

  useEffect(() => {
    setLocaleState(getInitialLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(localeStorageKey, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale: setLocaleState,
    t: (key, params = {}) => {
      const template = dictionaries[locale][key] || dictionaries.ru[key] || key;
      return Object.entries(params).reduce(
        (text, [paramKey, paramValue]) => text.replaceAll(`{${paramKey}}`, String(paramValue)),
        template,
      );
    },
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
