'use client';
import { AdminTabsProvider } from '../context/AdminTabsContext';

export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AdminTabsProvider>
          {children}
        </AdminTabsProvider>
      </body>
    </html>
  );
}
