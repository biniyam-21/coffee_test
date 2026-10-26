import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../lib/formatters';
import { Button } from '../../components/ui/Button';

export const CartDrawer: React.FC = () => {
  const {
    items,
    itemCount,
    subtotalCents,
    taxCents,
    totalCents,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const navigate = useNavigate();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };

    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  const handleCheckout = () => {
    closeDrawer();
    navigate('/checkout');
  };

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-md transform bg-white shadow-2xl transition ease-in-out duration-300 flex flex-col"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900">Your Cart</h2>
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                {itemCount}
              </span>
            </div>
            <button
              onClick={closeDrawer}
              aria-label="Close cart drawer"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 mb-4">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">Your cart is empty</h3>
                <p className="text-sm text-slate-500 max-w-xs mb-6">
                  Add some freshly roasted coffee or artisan pastries from our menu!
                </p>
                <Button variant="primary" size="sm" onClick={closeDrawer}>
                  Browse Menu
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.product.id} className="py-4 flex gap-4 items-center">
                    {/* Item Avatar / Placeholder */}
                    <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm shrink-0 overflow-hidden border border-slate-200">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-brand-600 font-semibold uppercase">
                          {item.product.name.slice(0, 2)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatCurrency(item.product.basePriceCents)} each
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        {/* Quantity Controls */}
                        <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded-l-md transition-colors cursor-pointer"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            ) : (
                              <Minus className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span className="px-2 text-xs font-semibold text-slate-800 min-w-[20px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.inventory.availableQuantity}
                            aria-label="Increase quantity"
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded-r-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="text-xs text-slate-400 hover:text-rose-600 transition-colors ml-2 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(item.product.basePriceCents * item.quantity)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Drawer Footer with Calculations */}
          {items.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50 p-6 space-y-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(subtotalCents)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Tax (10%)</span>
                  <span className="font-medium text-slate-900">{formatCurrency(taxCents)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                  <span>Estimated Total</span>
                  <span className="text-brand-600">{formatCurrency(totalCents)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleCheckout}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Proceed to Checkout
                </Button>
                <Button variant="ghost" size="sm" fullWidth onClick={clearCart}>
                  Clear Cart
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
