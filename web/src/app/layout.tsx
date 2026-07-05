import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Brill Center · מרכז בריל',
  description: 'Smart & analog community space management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <I18nProvider>
          <Nav />
          <main className="container">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
