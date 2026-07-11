'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { me, type AuthUser } from '../../lib/auth';

export type RoleName = 'employee' | 'manager' | 'admin' | string;

type RoleGuardProps = {
  allowedRoles: RoleName[];
  children: ReactNode;
  title?: string;
};

const roleLabels: Record<string, string> = {
  employee: 'сотрудник',
  manager: 'менеджер',
  admin: 'администратор',
};

export default function RoleGuard({ allowedRoles, children, title = 'Доступ ограничен' }: RoleGuardProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Проверяем доступ...');

  useEffect(() => {
    me()
      .then((response) => {
        setUser(response.data);
        setMessage('');
      })
      .catch(() => {
        setUser(null);
        setMessage('Нужно войти в систему.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <section className="panel"><p className="hint">Проверяем доступ...</p></section>;
  }

  if (!user) {
    return (
      <section className="panel">
        <p className="eyebrow">Авторизация</p>
        <h1>{title}</h1>
        <p className="hint">{message}</p>
        <a className="action-link" href="/login">Перейти ко входу</a>
      </section>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <section className="panel">
        <p className="eyebrow">Нет доступа</p>
        <h1>{title}</h1>
        <p className="hint">Ваша роль: <strong>{roleLabels[user.role] || user.role}</strong>. Нужная роль: {allowedRoles.map((role) => roleLabels[role] || role).join(' / ')}.</p>
        <a className="action-link" href="/employee">Перейти в кабинет сотрудника</a>
      </section>
    );
  }

  return <>{children}</>;
}
