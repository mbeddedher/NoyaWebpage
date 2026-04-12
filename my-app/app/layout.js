import './globals.css';

export const metadata = {
  title: {
    template: '%s | My E-commerce Site',
    default: 'My E-commerce Site',
  },
  description: 'Best products available online',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
} 