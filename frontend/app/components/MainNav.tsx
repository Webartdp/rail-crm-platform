'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { me, logout, type AuthUser } from '../../lib/auth';

type NavItem = {
  href: string;
  label: string;
  code: string;
  roles?: string[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const roleLabel: Record<string, string> = {
  employee: 'сотрудник',
  manager: 'менеджер',
  admin: 'администратор',
};

const navGroups: NavGroup[] = [
  {
    title: 'Работа',
    items: [
      { href: '/', label: 'Главная', code: 'HM' },
      { href: '/demo', label: 'Рабочий день', code: 'FD' },
      { href: '/employee', label: 'Кабинет сотрудника', code: 'EM' },
      { href: '/maps', label: 'Карта GPS', code: 'MP' },
      { href: '/durations', label: 'Время', code: 'TM' },
    ],
  },
  {
    title: 'Операции',
    items: [
      { href: '/manager-dashboard', label: 'Панель менеджера', code: 'DB', roles: ['manager', 'admin'] },
      { href: '/work-events', label: 'События смены', code: 'EV', roles: ['manager', 'admin'] },
      { href: '/approvals', label: 'Согласование', code: 'OK', roles: ['manager', 'admin'] },
      { href: '/assignments', label: 'Задания', code: 'AS', roles: ['manager', 'admin'] },
      { href: '/billing', label: 'Счета', code: 'BL', roles: ['manager', 'admin'] },
    ],
  },
  {
    title: 'Справочники',
    items: [
      { href: '/employees', label: 'Сотрудники', code: 'ST', roles: ['admin'] },
      { href: '/clients', label: 'Клиенты', code: 'CL', roles: ['manager', 'admin'] },
      { href: '/objects', label: 'Объекты', code: 'OB', roles: ['manager', 'admin'] },
      { href: '/documents', label: 'Документы', code: 'DC', roles: ['manager', 'admin'] },
      { href: '/audit', label: 'Аудит', code: 'AU', roles: ['manager', 'admin'] },
      { href: '/admin', label: 'Админка', code: 'AD', roles: ['admin'] },
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

export default function MainNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    me().then((response) => setUser(response.data)).catch(() => setUser(null));
  }, []);

  async function signOut() {
    await logout();
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <aside className="main-nav" aria-label="CRM navigation">
      <a className="nav-brand" href="/">
        <span className="nav-logo">CRM</span>
        <span>
          <strong>Rail CRM</strong>
          <small>режим разработки</small>
        </span>
      </a>

      <nav className="nav-scroll">
        {navGroups.map((group) => {
          const items = group.items.filter((item) => canSee(item, user));

          if (items.length === 0) return null;

          return (
            <section className="nav-group" key={group.title}>
              <p>{group.title}</p>
              {items.map((item) => (
                <a className={`nav-item ${isActive(pathname, item.href) ? 'active' : ''}`} href={item.href} key={item.href}>
                  <span className="nav-icon">{item.code}</span>
                  <span>{item.label}</span>
                </a>
              ))}
            </section>
          );
        })}
      </nav>

      <div className="nav-footer">
        {user ? (
          <>
            <div className="nav-user">
              <span>{user.name || user.email}</span>
              <small>{roleLabel[user.role] || user.role}</small>
            </div>
            <button className="nav-button" onClick={signOut} type="button">Выйти</button>
          </>
        ) : (
          <a className={`nav-item login-item ${isActive(pathname, '/login') ? 'active' : ''}`} href="/login">
            <span className="nav-icon">IN</span>
            <span>Вход</span>
          </a>
        )}
      </div>
    </aside>
  );
}
