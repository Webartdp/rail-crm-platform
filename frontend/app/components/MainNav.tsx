'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { me, logout, type AuthUser } from '../../lib/auth';
import { useI18n } from '../i18n';

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

function canSee(item: NavItem, user: AuthUser | null) {
  return !item.roles || (user && item.roles.includes(user.role));
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isAuthPage(pathname: string) {
  return pathname === '/login' || pathname.startsWith('/login/');
}

export default function MainNav() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useI18n();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    if (isAuthPage(pathname)) {
      setUser(null);
      setLoadingUser(false);
      return;
    }

    let mounted = true;

    me()
      .then((response) => {
        if (mounted) setUser(response.data);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoadingUser(false);
      });

    return () => {
      mounted = false;
    };
  }, [pathname]);

  async function signOut() {
    await logout();
    setUser(null);
    window.location.href = '/login/';
  }

  if (isAuthPage(pathname)) {
    return null;
  }

  const roleLabel: Record<string, string> = {
    employee: t('employeeRole'),
    manager: t('managerRole'),
    admin: t('adminRole'),
  };

  return (
    <aside className="main-nav" aria-label="CRM navigation">
      <a className="nav-brand" href="/">
        <span className="nav-logo">CRM</span>
        <span>
          <strong>Rail CRM</strong>
          <small>{t('brandSubtitle')}</small>
        </span>
      </a>

      <nav className="nav-scroll">
        {navGroups.map((group) => {
          const items = group.items.filter((item) => canSee(item, user));

          if (items.length === 0) return null;

          return (
            <section className="nav-group" key={group.titleKey}>
              <p>{t(group.titleKey)}</p>
              {items.map((item) => (
                <a className={`nav-item ${isActive(pathname, item.href) ? 'active' : ''}`} href={item.href} key={item.href}>
                  <span className="nav-icon">{item.code}</span>
                  <span>{t(item.labelKey)}</span>
                </a>
              ))}
            </section>
          );
        })}
      </nav>

      <div className="nav-footer">
        <div className="language-switcher" aria-label={t('language')}>
          <span>{t('language')}</span>
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
            <button className="nav-button" onClick={signOut} type="button">{t('logout')}</button>
          </>
        ) : loadingUser ? (
          <div className="nav-user">
            <span>...</span>
            <small>{t('login')}</small>
          </div>
        ) : (
          <a className={`nav-item login-item ${isActive(pathname, '/login') ? 'active' : ''}`} href="/login/">
            <span className="nav-icon">IN</span>
            <span>{t('login')}</span>
          </a>
        )}
      </div>
    </aside>
  );
}
