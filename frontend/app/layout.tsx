import type { Metadata } from 'next';
import MainNav from './components/MainNav';
import './styles.css';
import './navigation.css';

export const metadata: Metadata = {
  title: 'Rail CRM — разработка',
  description: 'CRM-платформа для полевых сотрудников и менеджеров',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <MainNav />
        {children}
      </body>
    </html>
  );
}
