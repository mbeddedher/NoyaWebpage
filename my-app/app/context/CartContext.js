'use client'


import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    refreshCartCount()
  },[]);


  const refreshCartCount = async () => {
    try {
      if(Cookies.get('cart')){
        const cart = JSON.parse(Cookies.get('cart'))
          setCartCount(cart.length);
        }
      
        
        
    } catch (error) {
      console.error('Error refreshing cart count:', error);
    }
  };

  return (
    <CartContext.Provider value={{ cartCount, refreshCartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
