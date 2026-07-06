import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Rail CRM Platform',
  description: 'Field service CRM platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
