import type { Metadata } from 'next';
import MainNav from './components/MainNav';
import { I18nProvider } from './i18n';
import './styles.css';
import './navigation.css';

export const metadata: Metadata = {
  title: 'Rail CRM',
  description: 'CRM platform for field employees and managers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <I18nProvider>
          <MainNav />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
