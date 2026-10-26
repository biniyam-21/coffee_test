import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Product, CartItem } from '../types/api';
import { useToast } from './ToastContext';
import { AuthContext } from './AuthContext';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  isDrawerOpen: boolean;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_PREFIX = 'akufada_cart_';
const GUEST_CART_STORAGE_KEY = 'akufada_cart_guest';
const LEGACY_CART_STORAGE_KEY = 'akufada_cart';

export const getCartStorageKey = (userId?: string | null): string => {
  return userId ? `${CART_STORAGE_PREFIX}${userId}` : GUEST_CART_STORAGE_KEY;
};

export const parseStoredCart = (raw: string | null): CartItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) =>
          item &&
          item.product &&
          typeof item.product.id === 'string' &&
          typeof item.quantity === 'number' &&
          item.quantity > 0,
      );
    }
  } catch {
    // ignore parsing failure
  }
  return [];
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const toast = useToast();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const currentUserId = user?.id ?? null;

  // Track previous user ID to react to login/logout/account-switch transitions
  const prevUserIdRef = useRef<string | null>(currentUserId);

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const key = getCartStorageKey(currentUserId);
      const saved = localStorage.getItem(key);
      if (saved) {
        return parseStoredCart(saved);
      }
      // Check legacy cart key for backward compatibility
      const legacy = localStorage.getItem(LEGACY_CART_STORAGE_KEY);
      if (legacy) {
        const parsed = parseStoredCart(legacy);
        if (parsed.length > 0) {
          localStorage.setItem(key, JSON.stringify(parsed));
          localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
          return parsed;
        }
      }
    } catch {
      // storage unavailable
    }
    return [];
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // React to user session changes (login, logout, switch user)
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    if (prevUserId === currentUserId) {
      return;
    }

    prevUserIdRef.current = currentUserId;

    // CASE 1: LOGOUT (user transitions from logged-in to null)
    if (prevUserId && !currentUserId) {
      // Clear active cart items and remove stored order cart for this user
      setItems([]);
      setIsDrawerOpen(false);
      try {
        localStorage.removeItem(`${CART_STORAGE_PREFIX}${prevUserId}`);
        localStorage.removeItem(GUEST_CART_STORAGE_KEY);
        localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
      } catch {
        // ignore
      }
      return;
    }

    // CASE 2: LOGIN (user transitions from guest/null to logged-in)
    if (!prevUserId && currentUserId) {
      try {
        const userKey = getCartStorageKey(currentUserId);
        const userSaved = localStorage.getItem(userKey);
        const userItems = parseStoredCart(userSaved);

        if (userItems.length > 0) {
          // If the logged-in user already has saved cart items, load them
          setItems(userItems);
        } else if (items.length > 0) {
          // If user had items added as a guest before logging in, assign to this user
          localStorage.setItem(userKey, JSON.stringify(items));
          localStorage.removeItem(GUEST_CART_STORAGE_KEY);
          localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
        } else {
          setItems([]);
        }
      } catch {
        // ignore
      }
      return;
    }

    // CASE 3: SWITCH USER (e.g. from user A to user B)
    if (prevUserId && currentUserId && prevUserId !== currentUserId) {
      try {
        const nextKey = getCartStorageKey(currentUserId);
        const nextSaved = localStorage.getItem(nextKey);
        setItems(parseStoredCart(nextSaved));
      } catch {
        setItems([]);
      }
    }
  }, [currentUserId]);

  // Persist items whenever items or currentUserId change
  useEffect(() => {
    try {
      const storageKey = getCartStorageKey(currentUserId);
      if (items.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(items));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // storage error
    }
  }, [items, currentUserId]);

  const addItem = (product: Product, quantity = 1) => {
    if (!product.inventory.inStock || product.inventory.availableQuantity <= 0) {
      toast.warning('Out of Stock', `${product.name} is currently out of stock.`);
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

    toast.success('Added to Cart', `${product.name} (${quantity}x) added to order.`);
    setIsDrawerOpen(true);
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
    setItems((prevItems) => {
      const itemToRemove = prevItems.find((item) => item.product.id === productId);
      if (itemToRemove) {
        toast.info('Item Removed', `${itemToRemove.product.name} was removed from your cart.`);
      }
      return prevItems.filter((item) => item.product.id !== productId);
    });
  };

  const clearCart = () => {
    setItems([]);
    try {
      const storageKey = getCartStorageKey(currentUserId);
      localStorage.removeItem(storageKey);
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

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
        isDrawerOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        openDrawer,
        closeDrawer,
        toggleDrawer,
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
