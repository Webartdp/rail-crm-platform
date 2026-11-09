import 'line-awesome/dist/line-awesome/css/line-awesome.min.css';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import MainNav from './components/MainNav';
import { I18nProvider } from './i18n';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from './locale-config';
import './styles.css';
import './navigation.css';

export const metadata: Metadata = {
  title: 'Rail CRM',
  description: 'CRM für Außendienst, Arbeitszeit, Dokumente und Abrechnung',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const saved = cookieStore.get(LOCALE_COOKIE)?.value;
  const initialLocale = isLocale(saved) ? saved : undefined;

  return (
    <html lang={initialLocale ?? DEFAULT_LOCALE}>
      <body>
        <I18nProvider initialLocale={initialLocale}>
          <MainNav />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
