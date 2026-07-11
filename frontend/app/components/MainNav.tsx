'use client';

import { useEffect, useState } from 'react';
import { me, logout, type AuthUser } from '../../lib/auth';

type NavItem = {
  href: string;
  label: string;
  roles?: string[];
};

const roleLabel: Record<string, string> = {
  employee: 'сотрудник',
  manager: 'менеджер',
  admin: 'администратор',
};

const navItems: NavItem[] = [
  { href: '/', label: 'Главная' },
  { href: '/login', label: 'Вход' },
  { href: '/manager-dashboard', label: 'Панель менеджера', roles: ['manager', 'admin'] },
  { href: '/admin', label: 'Админка', roles: ['admin'] },
  { href: '/employees', label: 'Сотрудники', roles: ['admin'] },
  { href: '/clients', label: 'Клиенты', roles: ['manager', 'admin'] },
  { href: '/objects', label: 'Объекты', roles: ['manager', 'admin'] },
  { href: '/assignments', label: 'Задания', roles: ['manager', 'admin'] },
  { href: '/approvals', label: 'Согласование', roles: ['manager', 'admin'] },
  { href: '/documents', label: 'Документы', roles: ['manager', 'admin'] },
  { href: '/billing', label: 'Счета', roles: ['manager', 'admin'] },
  { href: '/employee', label: 'Кабинет сотрудника' },
  { href: '/demo', label: 'Демо workflow' },
  { href: '/work-events', label: 'События смены', roles: ['manager', 'admin'] },
];

export default function MainNav() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    me().then((response) => setUser(response.data)).catch(() => setUser(null));
  }, []);

  async function signOut() {
    await logout();
    setUser(null);
    window.location.href = '/login';
  }

  const visibleItems = navItems.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <nav className="main-nav">
      <strong>Rail CRM · режим разработки</strong>
      <div>
        {visibleItems.map((item) => (
          <a href={item.href} key={item.href}>{item.label}</a>
        ))}
        {user ? <button className="nav-button" onClick={signOut} type="button">Выйти · {roleLabel[user.role] || user.role}</button> : null}
      </div>
    </nav>
  );
}
