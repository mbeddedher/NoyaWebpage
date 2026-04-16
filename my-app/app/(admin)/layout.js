'use client';
import { AdminTabsProvider } from '../context/AdminTabsContext';

export default function AdminLayout({ children }) {
  // IMPORTANT: Do not render <html>/<body> here — the root `app/layout.js` already does.
  // Nested <html> causes hydration mismatches (e.g. missing next/font className on <html>).
  return <AdminTabsProvider>{children}</AdminTabsProvider>;
}
