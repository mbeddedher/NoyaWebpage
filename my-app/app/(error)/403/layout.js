import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function EmptyLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}