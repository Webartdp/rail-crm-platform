import type { Metadata } from 'next';
import MainNav from './components/MainNav';
import './styles.css';
import './navigation.css';

export const metadata: Metadata = {
  title: 'Rail CRM Platform',
  description: 'Field service CRM platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <MainNav />
        {children}
      </body>
    </html>
  );
}
