'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AUTH_CHANGED_EVENT, me, logout, saveUserLocale, type AuthUser } from '../../lib/auth';
import ChangePasswordDialog from './ChangePasswordDialog';
import { LanguageSwitcher, useI18n } from '../i18n';
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
      { href: '/workday', labelKey: 'fieldDay', code: 'FD', roles: ['employee'] },
      { href: '/my-time', labelKey: 'time', code: 'TM', roles: ['employee'] },
      { href: '/employee', labelKey: 'employeeCabinet', code: 'PR', roles: ['employee'] },
    ],
  },
  {
    titleKey: 'groupOperations',
    items: [
      { href: '/manager-dashboard', labelKey: 'managerDashboard', code: 'DB', roles: ['manager', 'admin'] },
      { href: '/assignments', labelKey: 'assignments', code: 'AS', roles: ['manager', 'admin'] },
      { href: '/approvals', labelKey: 'approvals', code: 'OK', roles: ['manager', 'admin'] },
      { href: '/reports', labelKey: 'tsNav', code: 'SZ', roles: ['manager', 'admin'] },
      { href: '/durations', labelKey: 'time', code: 'TM', roles: ['manager', 'admin'] },
      { href: '/work-events', labelKey: 'workEvents', code: 'EV', roles: ['manager', 'admin'] },
      { href: '/maps', labelKey: 'gpsMap', code: 'MP', roles: ['manager', 'admin'] },
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
  {
    titleKey: 'groupSettings',
    items: [
      { href: '/mail-settings', labelKey: 'mailSettings', code: 'ML', roles: ['admin'] },
    ],
  },
];

function canSee(item: NavItem, user: AuthUser) {
  return !item.roles || item.roles.includes(user.role);
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
  const { locale, t, fmt } = useI18n();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const hideNav = isAuthPage(pathname) || (!loadingUser && !user);

  useEffect(() => {
    document.body.classList.toggle('nav-hidden', hideNav);

    return () => {
      document.body.classList.remove('nav-hidden');
    };
  }, [hideNav]);

  useEffect(() => {
    if (isAuthPage(pathname)) {
      setUser(null);
      setLoadingUser(false);
      return;
    }

    let mounted = true;

    async function loadUser() {
      setLoadingUser(true);

      try {
        const response = await me();
        if (mounted) setUser(response.data);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    }

    function onAuthChanged() {
      loadUser();
    }

    function onStorage(event: StorageEvent) {
      if (event.key === 'rail_crm_token') loadUser();
    }

    loadUser();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [pathname]);

  useEffect(() => {
    if (user && user.locale !== locale) {
      saveUserLocale(locale);
      setUser({ ...user, locale });
    }
  }, [locale, user]);

  async function signOut() {
    await logout();
    setUser(null);
    window.location.href = '/login';
  }

  if (hideNav || !user) {
    return null;
  }

  return (
    <aside className="main-nav" aria-label={t('navAria')}>
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
        <LanguageSwitcher />

        <div className="nav-user">
          <span>{user.name || user.email}</span>
          <small>{fmt.role(user.role)}</small>
        </div>
        <button className="nav-button nav-button-light" onClick={() => setPasswordOpen(true)} type="button">{t('changePasswordTitle')}</button>
        <button className="nav-button" onClick={signOut} type="button">{t('logout')}</button>
        {passwordOpen ? <ChangePasswordDialog onClose={() => setPasswordOpen(false)} /> : null}
      </div>
    </aside>
  );
}
