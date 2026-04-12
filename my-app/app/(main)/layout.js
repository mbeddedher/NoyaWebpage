import Navbar from "../components/Navbar";
import "../globals.css";
import { CartProvider } from '../context/CartContext';
import { UserProvider } from "../context/UserContext";

export const metadata = {
  title: "My E-commerce Site",
  description: "Best products available online",
};

export default function RootLayout({ children }) {
  return (
    <div className="page-container">
      <UserProvider>
        <CartProvider>
          <header>
            <Navbar />
          </header>
          <main className="main-content">{children}</main>
        </CartProvider>
      </UserProvider>
    </div>
  );
}
