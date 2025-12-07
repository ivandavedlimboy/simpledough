import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext'; // 👈 make sure this import matches your structure

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth(); // ✅ Get the logged-in user
  const [cartItems, setCartItems] = useState([]);

  // Helper to map cart items for order insertion
  const getCartDataForOrder = () => {
    const mappedData = cartItems.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
      total_price: item.totalPrice,
      customizations: item.customizations
    }));

    console.log("Mapped cart data for Supabase:", mappedData); // <-- add this line

    return mappedData;
  };

  // Helper: get key based on user
  const getStorageKey = () => {
    return user?.email
      ? `simple-dough-cart-${user.email}`
      : 'simple-dough-cart-guest';
  };

  // Load cart for current user
  useEffect(() => {
    const savedCart = localStorage.getItem(getStorageKey());
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    } else {
      setCartItems([]); // reset if no saved cart
    }
  }, [user]); // 👈 when user changes (login/logout), reload their cart

  // Save cart for that user
  useEffect(() => {
    localStorage.setItem(getStorageKey(), JSON.stringify(cartItems));
  }, [cartItems, user]);

  const addToCart = (product, customizations = {}) => {
   const cartItem = {
      id: Date.now().toString(),        // Unique ID for cart item
      productId: product.id,            // Reference to product table
      product,                          // Store full product info for display
      quantity: customizations.quantity && customizations.quantity > 0 ? customizations.quantity : 1, // Ensure quantity >=1
      customizations: {
        ...customizations,
        flavors: customizations.flavors || [],      
        toppings: customizations.toppings || {}
      },
      totalPrice: product.price * (customizations.quantity && customizations.quantity > 0 ? customizations.quantity : 1) // Calculate total price
    };

    setCartItems(prev => [...prev, cartItem]);
  };

  const removeFromCart = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, quantity, totalPrice: item.product.price * quantity }
        : item
    ));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem(getStorageKey());
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    getCartDataForOrder, 
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
