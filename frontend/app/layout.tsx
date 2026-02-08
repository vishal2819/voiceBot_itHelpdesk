import type { Metadata } from 'next';
import './globals.css';
import '@livekit/components-styles';

export const metadata: Metadata = {
  title: 'IT Help Desk Voice Bot',
  description: 'Get instant IT support via voice conversation with AI assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
