// app/cart/page.js
'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import OptimizedImage from '../../components/OptimizedImage';
import '../../styles/cart.css';

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [variantGroups, setVariantGroups] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the cart from the API
  useEffect(() => {
    const fetchCart = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/cart', {
          method: 'GET',
          credentials: 'include',  // Ensures cookies are sent with the request
        });
        console.log('Cart API Response:', res);
        const data = await res.json();
        console.log('Cart Data:', data);

        // For testing, let's use some mock data if the cart is empty
        const cartData = data.cart.length > 0 ? data.cart : [
          {
            productId: 1,
            name: "Test Product 1",
            price: 100,
            quantity: 1,
            variantId: "variant1",
            variantName: "Size 20mm",
            image: "/placeholder.jpg"
          },
          {
            productId: 2,
            name: "Test Product 2",
            price: 150,
            quantity: 2,
            variantId: "variant1",
            variantName: "Size 20mm",
            image: "/placeholder.jpg"
          },
          {
            productId: 3,
            name: "Test Product 3",
            price: 200,
            quantity: 1,
            variantId: "variant2",
            variantName: "Size 25mm",
            image: "/placeholder.jpg"
          }
        ];

        setCart(cartData);
        
        // Group items by variant
        const groups = {};
        cartData.forEach(item => {
          const variantKey = item.variantId || 'default';
          if (!groups[variantKey]) {
            groups[variantKey] = {
              variantName: item.variantName || 'Standard Products',
              items: []
            };
          }
          groups[variantKey].items.push(item);
        });
        console.log('Grouped Cart Data:', groups);
        setVariantGroups(groups);
      } catch(error) {
        console.error("Error in Getting cart:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCart();
  }, []);

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      const res = await fetch('/api/cart', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: itemId,
          quantity: newQuantity
        }),
        credentials: 'include',
      });

      if (res.ok) {
        const updatedCart = cart.map(item => 
          item.productId === itemId 
            ? { ...item, quantity: newQuantity }
            : item
        );
        setCart(updatedCart);

        // Update variant groups
        const updatedGroups = {};
        updatedCart.forEach(item => {
          const variantKey = item.variantId || 'default';
          if (!updatedGroups[variantKey]) {
            updatedGroups[variantKey] = {
              variantName: item.variantName || 'Standard Products',
              items: []
            };
          }
          updatedGroups[variantKey].items.push(item);
        });
        setVariantGroups(updatedGroups);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const calculateVariantTotal = (items) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateCartTotal = () => {
    return Object.values(variantGroups).reduce((total, group) => 
      total + calculateVariantTotal(group.items), 0
    );
  };

  const handleCheckout = () => {
    // Implement checkout logic
    console.log('Proceeding to checkout...');
  };

  const handleContinueShopping = () => {
    // Navigate back to products page
    window.location.href = '/products';
  };

  if (isLoading) {
    return (
      <div className="cart-page">
        <h2 className="cart-title">Your Shopping Cart</h2>
        <div className="cart-empty">
          <p>Loading cart...</p>
        </div>
      </div>
    );
  }

  if (!cart || cart.length === 0) {
    return (
      <div className="cart-page">
        <h2 className="cart-title">Your Shopping Cart</h2>
        <div className="cart-empty">
          <p>Your cart is empty.</p>
          <button 
            className="cart-button cart-button-primary"
            onClick={handleContinueShopping}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  console.log('Rendering cart with groups:', variantGroups);

  return (
    <div className="cart-page">
      <h2 className="cart-title">Your Shopping Cart</h2>
      <div className="cart-items">
        {Object.entries(variantGroups).map(([variantId, group]) => (
          <div key={variantId} className="variant-cart">
            <h3 className="variant-header">{group.variantName}</h3>
            {group.items.map((item) => (
              <div key={item.productId} className="cart-item">
                <OptimizedImage
                  src={item.image || '/no-image.svg'}
                  alt={item.name}
                  width={100}
                  height={100}
                  className="item-image"
                  style={{ objectFit: 'cover' }}
                />
                <div className="item-details">
                  <h4 className="item-name">{item.name}</h4>
                  <p className="item-price">{item.price} TL</p>
                  <div className="item-controls">
                    <div className="item-quantity">
                      <button 
                        className="quantity-button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="quantity-value">{item.quantity}</span>
                      <button 
                        className="quantity-button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="item-total">
                      {(item.price * item.quantity).toFixed(2)} TL
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="variant-total">
              <span className="variant-total-amount">
                Variant Total: {calculateVariantTotal(group.items).toFixed(2)} TL
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="cart-actions">
        <button 
          className="cart-button cart-button-secondary"
          onClick={handleContinueShopping}
        >
          Continue Shopping
        </button>
        <button 
          className="cart-button cart-button-primary"
          onClick={handleCheckout}
        >
          Proceed to Checkout ({calculateCartTotal().toFixed(2)} TL)
        </button>
      </div>
    </div>
  );
}
