'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { me, logout, type AuthUser } from '../../lib/auth';

type Locale = 'ru' | 'de';

type NavItem = {
  href: string;
  labelKey: string;
  code: string;
  roles?: string[];
};

type NavGroup = {
  titleKey: string;
  items: NavItem[];
};

type Dictionary = Record<string, string>;

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
    employee: 'сотрудник',
    manager: 'менеджер',
    adminRole: 'администратор',
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
    employee: 'Mitarbeiter',
    manager: 'Manager',
    adminRole: 'Administrator',
  },
};

const navGroups: NavGroup[] = [
  {
    titleKey: 'groupWork',
    items: [
      { href: '/', labelKey: 'home', code: 'HM' },
      { href: '/demo', labelKey: 'fieldDay', code: 'FD' },
      { href: '/employee', labelKey: 'employeeCabinet', code: 'EM' },
      { href: '/maps', labelKey: 'gpsMap', code: 'MP' },
      { href: '/durations', labelKey: 'time', code: 'TM' },
    ],
  },
  {
    titleKey: 'groupOperations',
    items: [
      { href: '/manager-dashboard', labelKey: 'managerDashboard', code: 'DB', roles: ['manager', 'admin'] },
      { href: '/work-events', labelKey: 'workEvents', code: 'EV', roles: ['manager', 'admin'] },
      { href: '/approvals', labelKey: 'approvals', code: 'OK', roles: ['manager', 'admin'] },
      { href: '/assignments', labelKey: 'assignments', code: 'AS', roles: ['manager', 'admin'] },
      { href: '/billing', labelKey: 'billing', code: 'BL', roles: ['manager', 'admin'] },
    ],
  },
  {
    titleKey: 'groupDirectories',
    items: [
      { href: '/employees', labelKey: 'employees', code: 'ST', roles: ['admin'] },
      { href: '/clients', labelKey: 'clients', code: 'CL', roles: ['manager', 'admin'] },
      { href: '/objects', labelKey: 'objects', code: 'OB', roles: ['manager', 'admin'] },
      { href: '/documents', labelKey: 'documents', code: 'DC', roles: ['manager', 'admin'] },
      { href: '/audit', labelKey: 'audit', code: 'AU', roles: ['manager', 'admin'] },
      { href: '/admin', labelKey: 'admin', code: 'AD', roles: ['admin'] },
    ],
  },
];

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru';
  return window.localStorage.getItem(localeStorageKey) === 'de' ? 'de' : 'ru';
}

function canSee(item: NavItem, user: AuthUser | null) {
  return !item.roles || (user && item.roles.includes(user.role));
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MainNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [locale, setLocaleState] = useState<Locale>('ru');

  useEffect(() => {
    setLocaleState(getInitialLocale());
    me().then((response) => setUser(response.data)).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(localeStorageKey, locale);
    window.dispatchEvent(new CustomEvent('rail-crm-locale-change', { detail: { locale } }));
  }, [locale]);

  async function signOut() {
    await logout();
    setUser(null);
    window.location.href = '/login';
  }

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale);
  }

  const t = dictionaries[locale];
  const roleLabel: Record<string, string> = {
    employee: t.employee,
    manager: t.manager,
    admin: t.adminRole,
  };

  return (
    <aside className="main-nav" aria-label="CRM navigation">
      <a className="nav-brand" href="/">
        <span className="nav-logo">CRM</span>
        <span>
          <strong>Rail CRM</strong>
          <small>{t.brandSubtitle}</small>
        </span>
      </a>

      <nav className="nav-scroll">
        {navGroups.map((group) => {
          const items = group.items.filter((item) => canSee(item, user));

          if (items.length === 0) return null;

          return (
            <section className="nav-group" key={group.titleKey}>
              <p>{t[group.titleKey]}</p>
              {items.map((item) => (
                <a className={`nav-item ${isActive(pathname, item.href) ? 'active' : ''}`} href={item.href} key={item.href}>
                  <span className="nav-icon">{item.code}</span>
                  <span>{t[item.labelKey]}</span>
                </a>
              ))}
            </section>
          );
        })}
      </nav>

      <div className="nav-footer">
        <div className="language-switcher" aria-label={t.language}>
          <span>{t.language}</span>
          <div>
            <button className={locale === 'ru' ? 'active' : ''} onClick={() => setLocale('ru')} type="button">RU</button>
            <button className={locale === 'de' ? 'active' : ''} onClick={() => setLocale('de')} type="button">DE</button>
          </div>
        </div>

        {user ? (
          <>
            <div className="nav-user">
              <span>{user.name || user.email}</span>
              <small>{roleLabel[user.role] || user.role}</small>
            </div>
            <button className="nav-button" onClick={signOut} type="button">{t.logout}</button>
          </>
        ) : (
          <a className={`nav-item login-item ${isActive(pathname, '/login') ? 'active' : ''}`} href="/login">
            <span className="nav-icon">IN</span>
            <span>{t.login}</span>
          </a>
        )}
      </div>
    </aside>
  );
}
