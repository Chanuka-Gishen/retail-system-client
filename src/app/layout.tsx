import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppLayout } from '../components/AppLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Retail Cloud POS & ERP',
  description: 'Enterprise Cloud POS & ERP Offline-First Web Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('retail_pos_theme') || 'dark';
                  var isDark = saved === 'dark' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  var root = document.documentElement;
                  root.classList.remove('light', 'dark');
                  root.classList.add(isDark ? 'dark' : 'light');
                  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
                  root.style.colorScheme = isDark ? 'dark' : 'light';
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} h-full antialiased overflow-hidden`}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
