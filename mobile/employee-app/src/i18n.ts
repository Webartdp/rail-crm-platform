export type Locale = 'de' | 'ru';
export type Params = Record<string, string | number>;
export type Translator = (key: string, params?: Params) => string;

const de = {
  appSubtitle: 'Außendienst & Zeiterfassung',
  tabWork: 'Arbeit',
  tabTime: 'Zeit',
  tabProfile: 'Profil',

  // Login
  loginTitle: 'Anmelden',
  loginIntro: 'Mit den Zugangsdaten, die Sie vom Administrator erhalten haben.',
  email: 'E-Mail',
  password: 'Passwort',
  showPassword: 'Anzeigen',
  hidePassword: 'Verbergen',
  loginButton: 'Anmelden',
  loggingIn: 'Anmeldung…',
  loginFailed: 'Anmeldung fehlgeschlagen.',
  loginMissing: 'Bitte E-Mail und Passwort eingeben.',
  forgotPassword: 'Passwort vergessen?',
  forgotTitle: 'Passwort zurücksetzen',
  forgotIntro: 'Geben Sie Ihre E-Mail ein. Sie erhalten einen Link, um ein neues Passwort festzulegen.',
  forgotSend: 'Link senden',
  forgotBack: 'Zurück zur Anmeldung',
  forgotNoMailHint: 'Kommt keine E-Mail an, wenden Sie sich an Ihren Administrator.',

  // Common
  loading: 'Wird geladen…',
  refresh: 'Aktualisieren',
  save: 'Speichern',
  saving: 'Wird gespeichert…',
  cancel: 'Abbrechen',
  close: 'Schließen',
  from: 'Von',
  to: 'Bis',
  thisMonth: 'Dieser Monat',
  lastMonth: 'Letzter Monat',
  noConnection: 'Keine Verbindung. Angezeigt werden die zuletzt geladenen Daten.',
  unknownError: 'Unbekannter Fehler.',
  sessionExpired: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',

  // Workday
  hello: 'Hallo, {name}',
  workIntro: 'Ihre Einsätze. Öffnen Sie einen Einsatz, um die Zeit zu erfassen.',
  filterCurrent: 'Aktuell',
  filterCompleted: 'Abgeschlossen',
  filterAll: 'Alle',
  noOrders: 'Keine Einsätze für diesen Filter.',
  noOrdersCurrent: 'Zurzeit sind Ihnen keine Einsätze zugewiesen.',
  noProfile: 'Ihr Konto ist mit keinem Mitarbeiterprofil verknüpft. Wenden Sie sich an den Administrator.',
  today: 'Heute',
  tomorrow: 'Morgen',
  noDate: 'Ohne Datum',
  planned: 'Geplant',
  plannedTime: 'Planzeit',
  reference: 'Referenznummer',
  trainNumber: 'Zugnummer',
  workType: 'Leistungsart',
  workTypeCustom: 'Andere',
  workTypeCustomPlaceholder: 'Leistungsart eingeben',
  location: 'Einsatzort',
  customer: 'Kunde',
  object: 'Objekt',
  openMap: 'Route öffnen',
  currentState: 'Status',
  nextStep: 'Nächster Schritt',
  remark: 'Bemerkung',
  remarkPlaceholder: 'Besonderheiten beschreiben; Pflicht bei Überschreitung der Planzeit',
  remarkRequired: 'Die Planzeit ist überschritten. Bitte eine Bemerkung eingeben, dann „Stop“ drücken.',
  workTypeRequired: 'Bitte die Leistungsart wählen.',
  tariffHint: 'Nachtstunden (20–24, 00–04, 04–06), Sonn- und Feiertage werden automatisch aus der Ist-Zeit berechnet.',
  orderFinished: 'Dieser Einsatz ist abgeschlossen.',
  orderFinishedHint: 'Die Zeiten sehen Sie unter „Zeit“. Korrekturen sind dort möglich, bis der Einsatz freigegeben ist.',
  otherOrderActive: 'Sie haben einen anderen Einsatz noch nicht beendet. Beenden Sie ihn zuerst.',
  eventsOfOrder: 'Erfasste Zeiten',
  noEventsYet: 'Noch keine Zeiten erfasst.',
  sending: 'Wird gesendet…',
  saved: 'Gespeichert: {action}',
  savedOffline: 'Ohne Verbindung gespeichert: {action}. Wird automatisch gesendet.',
  gpsAsking: 'Standort wird ermittelt…',
  gpsOk: 'Standort erfasst (±{accuracy} m).',
  gpsDenied: 'Kein Standortzugriff. Die Zeit wird ohne Standort gespeichert.',
  gpsDeniedTitle: 'Standort',
  gpsDeniedText: 'Ohne Standortfreigabe wird die Zeit ohne Kartenpunkt gespeichert. Sie können den Zugriff in den Einstellungen des Telefons erlauben.',
  confirmTitle: 'Bestätigen',
  confirmAction: '„{action}“ jetzt erfassen?',
  confirmYes: 'Erfassen',

  // Offline
  offlinePending: 'Ohne Verbindung gespeichert: {count}. Wird automatisch gesendet, sobald Internet verfügbar ist.',
  offlineSendNow: 'Jetzt senden',
  offlineSynced: 'Gesendet: {count} offline gespeicherte Erfassung(en).',
  offlineRejected: 'Der Server hat eine offline gespeicherte Erfassung abgelehnt: {error}',

  // Actions & states (same names as on the website)
  action_gasfahrt_start: 'Gasfahrt — Abfahrt von Zuhause',
  action_gasfahrt_stop: 'Gasfahrt beendet — am Objekt angekommen',
  action_dienstbeginn: 'Dienstbeginn — Arbeit starten',
  action_arbeit_stop: 'Stop — Arbeit beenden',
  action_dienstfahrt_start: 'Start Dienstfahrt — zum nächsten Einsatzort',
  action_dienstfahrt_stop: 'Stop Dienstfahrt — angekommen',
  short_gasfahrt_start: 'Gasfahrt Start',
  short_gasfahrt_stop: 'Gasfahrt Ende',
  short_dienstbeginn: 'Dienstbeginn',
  short_arbeit_stop: 'Stop',
  short_dienstfahrt_start: 'Dienstfahrt Start',
  short_dienstfahrt_stop: 'Dienstfahrt Ende',
  state_idle: 'Bereit zur Abfahrt',
  state_gasfahrt_active: 'Auf dem Weg zur Arbeit',
  state_arrived: 'Am Objekt angekommen',
  state_work_active: 'Arbeit läuft',
  state_work_finished: 'Arbeit beendet',
  state_dienstfahrt_active: 'Dienstfahrt läuft',
  state_dienstfahrt_finished: 'Am nächsten Einsatzort',

  // Statuses
  status_planned: 'Geplant',
  status_assigned: 'Zugewiesen',
  status_in_progress: 'In Arbeit',
  status_waiting_approval: 'Wartet auf Freigabe',
  status_approved: 'Freigegeben',
  status_rejected: 'Abgelehnt',
  status_invoiced: 'Abgerechnet',
  status_cancelled: 'Storniert',
  status_closed: 'Geschlossen',
  status_open: 'Offen',
  status_pending: 'Zur Prüfung',
  status_done: 'Erledigt',

  // Timesheet
  timeTitle: 'Meine Zeiten',
  timeIntro: 'Geplante und tatsächliche Zeiten für den gewählten Zeitraum.',
  totalWork: 'Arbeitszeit',
  totalTravel: 'Fahrzeit',
  totalNight: 'Nachtstunden',
  totalSunday: 'Sonn- und Feiertag',
  workDays: 'Arbeitstage: {count}',
  noRows: 'Keine Zeiten in diesem Zeitraum.',
  type_arbeit: 'Arbeit',
  type_gasfahrt: 'Gasfahrt',
  type_dienstfahrt: 'Dienstfahrt',
  plannedShort: 'Plan',
  actualShort: 'Ist',
  running: 'läuft',
  zoneDay: 'Tag',
  zone20: '20–24',
  zone00: '00–04',
  zone04: '04–06',
  zoneSun: 'So/Feiertag',
  corrected: 'korrigiert',
  correct: 'Korrigieren',
  correctTitle: 'Zeit korrigieren',
  correctIntro: 'Die Korrektur geht zur Freigabe an den Administrator.',
  correctStart: 'Beginn',
  correctStop: 'Ende',
  correctTimeFormat: 'Uhrzeit im Format HH:MM',
  correctNextDay: 'Ende am Folgetag ({date})',
  correctReason: 'Grund der Korrektur',
  correctSend: 'Korrektur senden',
  correctInvalid: 'Bitte gültige Uhrzeiten eingeben (HH:MM).',
  correctLocked: 'Freigegebene Zeiten können nicht mehr geändert werden.',
  holiday: 'Feiertag',
  sunday: 'Sonntag',

  // Profile
  profileTitle: 'Profil',
  role: 'Rolle',
  role_employee: 'Mitarbeiter',
  role_manager: 'Disponent',
  role_admin: 'Administrator',
  language: 'Sprache',
  german: 'Deutsch',
  russian: 'Русский',
  changePassword: 'Passwort ändern',
  currentPassword: 'Aktuelles Passwort',
  newPassword: 'Neues Passwort',
  repeatPassword: 'Neues Passwort wiederholen',
  passwordRules: 'Mindestens 8 Zeichen, mit Buchstaben und Ziffern.',
  passwordMismatch: 'Die neuen Passwörter stimmen nicht überein.',
  offlineQueue: 'Offline gespeichert',
  offlineQueueEmpty: 'Alles gesendet.',
  openWebsite: 'Website öffnen',
  webHint: 'Disponenten und Administratoren arbeiten auf der Website.',
  logout: 'Abmelden',
  logoutConfirm: 'Wirklich abmelden?',
  logoutPending: 'Es gibt {count} noch nicht gesendete Erfassung(en). Nach dem Abmelden gehen sie verloren. Trotzdem abmelden?',
  version: 'Version {version}',
};

type Messages = typeof de;

const ru: Messages = {
  appSubtitle: 'Выездные работы и учёт времени',
  tabWork: 'Работа',
  tabTime: 'Время',
  tabProfile: 'Профиль',

  loginTitle: 'Вход',
  loginIntro: 'Используйте данные, которые выдал администратор.',
  email: 'E-mail',
  password: 'Пароль',
  showPassword: 'Показать',
  hidePassword: 'Скрыть',
  loginButton: 'Войти',
  loggingIn: 'Входим…',
  loginFailed: 'Не удалось войти.',
  loginMissing: 'Введите e-mail и пароль.',
  forgotPassword: 'Забыли пароль?',
  forgotTitle: 'Сброс пароля',
  forgotIntro: 'Введите свой e-mail. Мы пришлём ссылку, чтобы задать новый пароль.',
  forgotSend: 'Отправить ссылку',
  forgotBack: 'Назад ко входу',
  forgotNoMailHint: 'Если письмо не пришло, обратитесь к администратору.',

  loading: 'Загрузка…',
  refresh: 'Обновить',
  save: 'Сохранить',
  saving: 'Сохраняем…',
  cancel: 'Отмена',
  close: 'Закрыть',
  from: 'С',
  to: 'По',
  thisMonth: 'Этот месяц',
  lastMonth: 'Прошлый месяц',
  noConnection: 'Нет связи. Показаны последние загруженные данные.',
  unknownError: 'Неизвестная ошибка.',
  sessionExpired: 'Сессия истекла. Войдите снова.',

  hello: 'Здравствуйте, {name}',
  workIntro: 'Ваши задания. Откройте задание, чтобы отметить время.',
  filterCurrent: 'Текущие',
  filterCompleted: 'Завершённые',
  filterAll: 'Все',
  noOrders: 'Нет заданий для этого фильтра.',
  noOrdersCurrent: 'Сейчас у вас нет назначенных заданий.',
  noProfile: 'Ваш аккаунт не привязан к профилю сотрудника. Обратитесь к администратору.',
  today: 'Сегодня',
  tomorrow: 'Завтра',
  noDate: 'Без даты',
  planned: 'План',
  plannedTime: 'Плановое время',
  reference: 'Referenznummer',
  trainNumber: 'Номер поезда',
  workType: 'Leistungsart',
  workTypeCustom: 'Другое',
  workTypeCustomPlaceholder: 'Введите вид работ',
  location: 'Место работы',
  customer: 'Заказчик',
  object: 'Объект',
  openMap: 'Открыть маршрут',
  currentState: 'Статус',
  nextStep: 'Следующий шаг',
  remark: 'Bemerkung',
  remarkPlaceholder: 'Опишите особенности; обязательно при превышении планового времени',
  remarkRequired: 'Плановое время превышено. Заполните Bemerkung, затем нажмите «Stop».',
  workTypeRequired: 'Выберите Leistungsart.',
  tariffHint: 'Ночные часы (20–24, 00–04, 04–06), воскресенья и праздники считаются автоматически по фактическому времени.',
  orderFinished: 'Это задание завершено.',
  orderFinishedHint: 'Время смотрите во вкладке «Время». Там же его можно исправить, пока задание не подтверждено.',
  otherOrderActive: 'У вас не завершено другое задание. Сначала завершите его.',
  eventsOfOrder: 'Отмеченное время',
  noEventsYet: 'Время ещё не отмечалось.',
  sending: 'Отправляем…',
  saved: 'Сохранено: {action}',
  savedOffline: 'Сохранено без сети: {action}. Отправится автоматически.',
  gpsAsking: 'Определяем местоположение…',
  gpsOk: 'Местоположение записано (±{accuracy} м).',
  gpsDenied: 'Нет доступа к геолокации. Время сохранится без точки на карте.',
  gpsDeniedTitle: 'Геолокация',
  gpsDeniedText: 'Без доступа к геолокации время сохраняется без точки на карте. Доступ можно разрешить в настройках телефона.',
  confirmTitle: 'Подтверждение',
  confirmAction: 'Отметить «{action}» сейчас?',
  confirmYes: 'Отметить',

  offlinePending: 'Сохранено без сети: {count}. Отправится автоматически, когда появится интернет.',
  offlineSendNow: 'Отправить сейчас',
  offlineSynced: 'Отправлено отметок, сохранённых без сети: {count}.',
  offlineRejected: 'Сервер не принял отметку, сохранённую без сети: {error}',

  action_gasfahrt_start: 'Gasfahrt — выезд из дома',
  action_gasfahrt_stop: 'Gasfahrt beendet — прибыл на объект',
  action_dienstbeginn: 'Dienstbeginn — начало работы',
  action_arbeit_stop: 'Stop — окончание работы',
  action_dienstfahrt_start: 'Start Dienstfahrt — на следующее место',
  action_dienstfahrt_stop: 'Stop Dienstfahrt — прибыл',
  short_gasfahrt_start: 'Gasfahrt старт',
  short_gasfahrt_stop: 'Gasfahrt конец',
  short_dienstbeginn: 'Dienstbeginn',
  short_arbeit_stop: 'Stop',
  short_dienstfahrt_start: 'Dienstfahrt старт',
  short_dienstfahrt_stop: 'Dienstfahrt конец',
  state_idle: 'Готов к выезду',
  state_gasfahrt_active: 'В дороге на работу',
  state_arrived: 'Прибыл на объект',
  state_work_active: 'Работа выполняется',
  state_work_finished: 'Работа завершена',
  state_dienstfahrt_active: 'Служебный переезд',
  state_dienstfahrt_finished: 'Прибыл на следующее место',

  status_planned: 'Запланировано',
  status_assigned: 'Назначено',
  status_in_progress: 'В работе',
  status_waiting_approval: 'На согласовании',
  status_approved: 'Подтверждено',
  status_rejected: 'Отклонено',
  status_invoiced: 'Выставлен счёт',
  status_cancelled: 'Отменено',
  status_closed: 'Закрыто',
  status_open: 'Открыто',
  status_pending: 'На проверке',
  status_done: 'Выполнено',

  timeTitle: 'Моё время',
  timeIntro: 'Плановое и фактическое время за выбранный период.',
  totalWork: 'Работа',
  totalTravel: 'Дорога',
  totalNight: 'Ночные часы',
  totalSunday: 'Вс и праздники',
  workDays: 'Рабочих дней: {count}',
  noRows: 'За этот период времени нет.',
  type_arbeit: 'Работа',
  type_gasfahrt: 'Gasfahrt',
  type_dienstfahrt: 'Dienstfahrt',
  plannedShort: 'План',
  actualShort: 'Факт',
  running: 'идёт',
  zoneDay: 'День',
  zone20: '20–24',
  zone00: '00–04',
  zone04: '04–06',
  zoneSun: 'Вс/праздник',
  corrected: 'исправлено',
  correct: 'Исправить',
  correctTitle: 'Исправить время',
  correctIntro: 'Исправление уйдёт администратору на подтверждение.',
  correctStart: 'Начало',
  correctStop: 'Конец',
  correctTimeFormat: 'Время в формате ЧЧ:ММ',
  correctNextDay: 'Конец на следующий день ({date})',
  correctReason: 'Причина исправления',
  correctSend: 'Отправить исправление',
  correctInvalid: 'Введите правильное время (ЧЧ:ММ).',
  correctLocked: 'Подтверждённое время изменить уже нельзя.',
  holiday: 'Праздник',
  sunday: 'Воскресенье',

  profileTitle: 'Профиль',
  role: 'Роль',
  role_employee: 'Сотрудник',
  role_manager: 'Диспетчер',
  role_admin: 'Администратор',
  language: 'Язык',
  german: 'Deutsch',
  russian: 'Русский',
  changePassword: 'Сменить пароль',
  currentPassword: 'Текущий пароль',
  newPassword: 'Новый пароль',
  repeatPassword: 'Повторите новый пароль',
  passwordRules: 'Минимум 8 символов, буквы и цифры.',
  passwordMismatch: 'Новые пароли не совпадают.',
  offlineQueue: 'Сохранено без сети',
  offlineQueueEmpty: 'Всё отправлено.',
  openWebsite: 'Открыть сайт',
  webHint: 'Диспетчеры и администраторы работают на сайте.',
  logout: 'Выйти',
  logoutConfirm: 'Выйти из аккаунта?',
  logoutPending: 'Есть неотправленные отметки: {count}. После выхода они пропадут. Всё равно выйти?',
  version: 'Версия {version}',
};

const MESSAGES: Record<Locale, Messages> = { de, ru };

export function translate(locale: Locale, key: string, params?: Params): string {
  const table = MESSAGES[locale] as Record<string, string>;
  let text = table[key] ?? (MESSAGES.de as Record<string, string>)[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([name, value]) => {
      text = text.split(`{${name}}`).join(String(value));
    });
  }
  return text;
}

export function hasKey(key: string) {
  return key in de;
}

/* ---------- Formatting. Server times are Europe/Berlin wall-clock strings. ---------- */

const WEEKDAYS: Record<Locale, string[]> = {
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
};

/** "2026-11-09 08:30:00" → "2026-11-09" */
export function isoDate(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

/** "2026-11-09 08:30:00" → "08:30" */
export function hhmm(value?: string | null) {
  if (!value) return '—';
  const match = value.match(/[T ](\d{2}:\d{2})/);
  return match ? match[1] : '—';
}

/** "2026-11-09" → "09.11.2026" */
export function dmy(value?: string | null) {
  const date = isoDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '—';
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}

export function weekday(locale: Locale, value?: string | null) {
  const date = isoDate(value);
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAYS[locale][new Date(y, m - 1, d).getDay()];
}

/** 450 → "7:30 h" / "7:30 ч" */
export function hours(locale: Locale, minutes?: number | null) {
  const total = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, '0')} ${locale === 'de' ? 'h' : 'ч'}`;
}

export function localIsoDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  return localIsoDate(new Date(y, m - 1, d + days));
}

export function monthRange(offset = 0) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: localIsoDate(first), to: localIsoDate(last) };
}

export function dateFromIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
}
