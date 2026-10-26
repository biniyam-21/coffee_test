import React, { createContext, useContext, useState } from 'react';
import { Product, CartItem } from '../types/api';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, quantity = 1) => {
    if (!product.inventory.inStock || product.inventory.availableQuantity <= 0) {
      return;
    }

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const existing = prevItems[existingIndex];
        const newQuantity = Math.min(
          existing.quantity + quantity,
          product.inventory.availableQuantity,
        );
        const updated = [...prevItems];
        updated[existingIndex] = { ...existing, quantity: newQuantity };
        return updated;
      } else {
        const initialQty = Math.min(quantity, product.inventory.availableQuantity);
        return [...prevItems, { product, quantity: initialQty }];
      }
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId) {
          const maxAllowed = item.product.inventory?.availableQuantity ?? 99;
          const safeQuantity = Math.min(quantity, maxAllowed);
          return { ...item, quantity: safeQuantity };
        }
        return item;
      }),
    );
  };

  const removeItem = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.product.basePriceCents * item.quantity,
    0,
  );
  // Backend standard: 10% tax rounded to nearest integer cent
  const taxCents = Math.round(subtotalCents * 0.1);
  const totalCents = subtotalCents + taxCents;

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotalCents,
        taxCents,
        totalCents,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
