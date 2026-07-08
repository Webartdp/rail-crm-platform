'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { me, type AuthUser } from '../../lib/auth';

export type RoleName = 'employee' | 'manager' | 'admin' | string;

type RoleGuardProps = {
  allowedRoles: RoleName[];
  children: ReactNode;
  title?: string;
};

export default function RoleGuard({ allowedRoles, children, title = 'Access restricted' }: RoleGuardProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Checking access...');

  useEffect(() => {
    me()
      .then((response) => {
        setUser(response.data);
        setMessage('');
      })
      .catch(() => {
        setUser(null);
        setMessage('Login is required.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <section className="panel"><p className="hint">Checking access...</p></section>;
  }

  if (!user) {
    return (
      <section className="panel">
        <p className="eyebrow">Auth</p>
        <h1>{title}</h1>
        <p className="hint">{message}</p>
        <a className="action-link" href="/login">Go to login</a>
      </section>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <section className="panel">
        <p className="eyebrow">Forbidden</p>
        <h1>{title}</h1>
        <p className="hint">Your role is <strong>{user.role}</strong>. Required role: {allowedRoles.join(' / ')}.</p>
        <a className="action-link" href="/employee">Go to employee area</a>
      </section>
    );
  }

  return <>{children}</>;
}
