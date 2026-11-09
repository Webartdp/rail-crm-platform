'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AUTH_CHANGED_EVENT, me, type AuthUser } from '../../lib/auth';
import { useI18n } from '../i18n';

export type RoleName = 'employee' | 'manager' | 'admin' | string;

type RoleGuardProps = {
  allowedRoles: RoleName[];
  children: ReactNode;
  title?: string;
};

export default function RoleGuard({ allowedRoles, children, title }: RoleGuardProps) {
  const { t, fmt } = useI18n();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      setLoading(true);

      try {
        const response = await me();
        if (!mounted) return;
        setUser(response.data);
      } catch {
        if (!mounted) return;
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    function onStorage(event: StorageEvent) {
      if (event.key === 'rail_crm_token') loadUser();
    }

    loadUser();
    window.addEventListener(AUTH_CHANGED_EVENT, loadUser);
    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, loadUser);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const heading = title || t('guardRestricted');

  if (loading) {
    return <section className="panel"><p className="hint">{t('loginChecking')}</p></section>;
  }

  if (!user) {
    return (
      <section className="panel">
        <p className="eyebrow">{t('guardAuth')}</p>
        <h1>{heading}</h1>
        <p className="hint">{t('guardLoginRequired')}</p>
        <a className="action-link" href="/login">{t('guardGoToLogin')}</a>
      </section>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <section className="panel">
        <p className="eyebrow">{t('commonAccessDenied')}</p>
        <h1>{heading}</h1>
        <p className="hint">
          {t('guardYourRole')} <strong>{fmt.role(user.role)}</strong>. {t('guardNeededRole')} {allowedRoles.map((role) => fmt.role(role)).join(' / ')}.
        </p>
        <a className="action-link" href="/employee">{t('guardGoToProfile')}</a>
      </section>
    );
  }

  return <>{children}</>;
}
