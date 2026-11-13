import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Service Request Management System',
  description:
    'Internal service ticketing and request lifecycle management platform for VisionRoot.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
