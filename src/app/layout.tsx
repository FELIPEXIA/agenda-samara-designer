import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Samara Designer | Agenda e Atendimentos',
  description: 'Sistema profissional de agendamento de manicure, nail designer e sobrancelhas.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="theme-color" content="#c25975" />
      </head>
      <body>{children}</body>
    </html>
  );
}
