'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { me } from '../lib/auth';

export default function HomePage() {
  const router = useRouter();

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
          <h1>Загрузка кабинета...</h1>
          <p className="hero-text">Открываем нужный раздел по вашей роли.</p>
        </div>
      </section>
    </main>
  );
}
