import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: { default: 'NexaAI — Your intelligent AI workspace', template: '%s | NexaAI' },
  description: 'A secure, multi-model AI workspace for conversations, research, files, and intelligent workflows.',
  applicationName: 'NexaAI',
  keywords: ['AI assistant', 'AI chatbot', 'AI workspace', 'research assistant', 'AI agents'],
  robots: { index: true, follow: true },
  openGraph: { type: 'website', title: 'NexaAI — Your intelligent AI workspace', description: 'Chat, research, create, and automate with NexaAI.' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}