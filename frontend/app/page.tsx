'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { me } from '../lib/auth';
import { useI18n } from './i18n';

export default function HomePage() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    async function redirectByRole() {
      try {
        const response = await me();
        const role = response.data.role;

        if (role === 'employee') {
          router.replace('/workday');
          return;
        }

        if (role === 'manager' || role === 'admin') {
          router.replace('/manager-dashboard');
          return;
        }

        router.replace('/login');
      } catch {
        router.replace('/login');
      }
    }

    redirectByRole();
  }, [router]);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Rail CRM</p>
          <h1>{t('homeLoading')}</h1>
          <p className="hero-text">{t('homeHint')}</p>
        </div>
      </section>
    </main>
  );
}
