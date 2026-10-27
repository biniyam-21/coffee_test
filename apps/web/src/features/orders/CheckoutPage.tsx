import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  ShieldCheck,
  User,
  Coffee,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiRequest } from '../../lib/api-client';
import { Order } from '../../types/api';
import { formatCurrency } from '../../lib/formatters';
import { CoffeeLoadingOverlay } from '../../components/ui/CoffeeLoadingOverlay';

type PaymentOption = 'SUCCESS' | 'DECLINED' | 'CASH' | 'CHAPA';

export const CheckoutPage: React.FC = () => {
  const { items, subtotalCents, taxCents, totalCents, clearCart } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [customerNotes, setCustomerNotes] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentOption>('CHAPA');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Empty Cart State
  if (items.length === 0) {
    return (
      <div className="min-h-[calc(100vh-94px)] bg-[#F7F5FA] flex items-center justify-center p-4">
        <div className="mx-auto max-w-md w-full rounded-xl border border-[#E5E2ED] bg-white p-8 text-center shadow-xs">
          <ShoppingBag className="h-12 w-12 text-[#7138E8] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#17152D] mb-1.5">Your Bag is Empty</h2>
          <p className="text-xs sm:text-sm text-[#77748A] mb-6">
            You don&apos;t have any items in your checkout session. Return to the menu to pick your
            favorite coffee.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-[#7138E8] hover:bg-[#5E27D6] text-white font-bold h-11 px-6 text-sm shadow-md shadow-[#7138E8]/20 transition-all cursor-pointer"
          >
            Return to Menu
          </Link>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const idempotencyKey = `ord-idem-${
      crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }`;

    try {
      const payload: {
        items: { productId: string; quantity: number }[];
        customerNotes?: string;
        payment?: {
          provider: string;
          simulateOutcome: 'SUCCESS' | 'DECLINED';
        };
      } = {
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        customerNotes:
          selectedPayment === 'CASH'
            ? customerNotes.trim()
              ? `${customerNotes.trim()} (Payment: Cash on pickup)`
              : 'Payment: Cash on pickup'
            : customerNotes.trim() || undefined,
        payment: {
          provider: selectedPayment === 'CASH' ? 'CASH_ON_PICKUP' : selectedPayment === 'CHAPA' ? 'CHAPA' : 'MOCK_GATEWAY',
          simulateOutcome: selectedPayment === 'DECLINED' ? 'DECLINED' : 'SUCCESS',
        },
      };

      const order = await apiRequest<Order>('/orders', {
        method: 'POST',
        idempotencyKey,
        body: JSON.stringify(payload),
      });

      if (order.payment?.checkoutUrl) {
        clearCart();
        window.location.assign(order.payment.checkoutUrl);
        return;
      }

      // Clear shopping cart upon verified server order creation
      clearCart();
      toast.success(
        'Order Placed Successfully!',
        `Order #${order.orderNumber || order.id.slice(0, 8)} has been queued with the kitchen.`,
      );
      navigate(`/orders/${order.id}/track`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to place order. Please review your cart and try again.';
      setError(msg);
      toast.error('Order Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-[calc(100vh-94px)] bg-[#F7F5FA] py-8 sm:py-10 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#17152D]">
      {/* Loading Overlay during order creation */}
      {isSubmitting && (
        <CoffeeLoadingOverlay
          message="Confirming your order..."
          subtext="Transmitting your request to the barista queue..."
        />
      )}

      {/* Centered Content Area with Controlled Width (~1080px) */}
      <div className="mx-auto max-w-[1080px]">
        {/* Breadcrumb Navigation: Menu / Checkout */}
        <nav aria-label="Breadcrumb" className="mb-3 text-left">
          <ol className="flex items-center gap-2 text-xs">
            <li>
              <Link to="/" className="text-[#77748A] hover:text-[#7138E8] transition-colors font-medium">
                Menu
              </Link>
            </li>
            <li className="text-[#E5E2ED]">/</li>
            <li className="text-[#17152D] font-bold">Checkout</li>
          </ol>
        </nav>

        {/* Main Heading & Supporting Description */}
        <div className="mb-7 text-left">
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#17152D] tracking-tight leading-tight">
            Review your order
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#77748A]">
            Confirm your details and pickup preferences before placing your order.
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-[#C43D4B] flex items-start gap-2.5 animate-fadeIn text-left"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#C43D4B]" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Order Submission Error</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs font-bold text-[#C43D4B] hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Two-Column Workspace Layout (approx. 60/40 Split) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Customer Details, Pickup Instructions, Payment Method (~60%) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Card 1: Customer Details */}
            <div className="rounded-xl border border-[#E5E2ED] bg-white p-5 sm:p-6 shadow-[0_2px_8px_-2px_rgba(33,17,63,0.04)] text-left">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5E2ED]/60">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3EEFC] text-[#7138E8]">
                  <User className="h-4 w-4" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-[#17152D]">Your details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#77748A] block">
                    Name
                  </span>
                  <span className="text-sm font-bold text-[#17152D] mt-0.5 block truncate">
                    {user?.fullName || 'Guest Customer'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#77748A] block">
                    Email address
                  </span>
                  <span className="text-sm font-bold text-[#17152D] mt-0.5 block truncate">
                    {user?.email || 'customer@akufada.com'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Pickup Instructions (Optional) */}
            <div className="rounded-xl border border-[#E5E2ED] bg-white p-5 sm:p-6 shadow-[0_2px_8px_-2px_rgba(33,17,63,0.04)] text-left">
              <h2 className="text-sm sm:text-base font-bold text-[#17152D]">
                Pickup instructions (optional)
              </h2>
              <p className="mt-1 text-xs text-[#77748A]">
                Include any milk preference, temperature request, or pickup notes.
              </p>

              <div className="mt-3.5 relative">
                <textarea
                  rows={3}
                  maxLength={250}
                  placeholder="Milk preference, temperature, or pickup notes..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E2ED] bg-white p-3 text-sm text-[#17152D] placeholder:text-[#77748A]/60 transition-colors focus:border-[#7138E8] focus:outline-none focus:ring-2 focus:ring-[#7138E8]/15 resize-none"
                />
                <div className="text-right text-[10px] text-[#77748A] mt-1 font-medium">
                  {customerNotes.length}/250
                </div>
              </div>
            </div>

            {/* Card 3: Payment Method */}
            <div className="rounded-xl border border-[#E5E2ED] bg-white p-5 sm:p-6 shadow-[0_2px_8px_-2px_rgba(33,17,63,0.04)] text-left">
              <h2 className="text-sm sm:text-base font-bold text-[#17152D]">Payment method</h2>
              <p className="mt-1 text-xs text-[#77748A]">
                Choose how you&apos;d like to pay for your order.
              </p>

              <div className="mt-4 space-y-2.5">
                {/* Option 1: Chapa test checkout */}
                <label
                  className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedPayment === 'CHAPA'
                      ? 'border-[#7138E8] bg-[#F9F7FD] shadow-xs'
                      : 'border-[#E5E2ED] bg-white hover:border-[#D8CBEF] hover:bg-[#FDFBFE]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CHAPA"
                    checked={selectedPayment === 'CHAPA'}
                    onChange={() => setSelectedPayment('CHAPA')}
                    className="mt-1 h-4 w-4 text-[#7138E8] accent-[#7138E8] focus:ring-[#7138E8] cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-xs sm:text-sm font-bold text-[#17152D] block">
                      Chapa test checkout
                    </span>
                    <span className="text-xs text-[#77748A] mt-0.5 block">
                      Opens Chapa’s hosted sandbox checkout. Test secret key and public callback URL must be configured.
                    </span>
                  </div>
                </label>

                {/* Option 2: Cash receiving (Cash on pickup) */}
                <label
                  className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedPayment === 'CASH'
                      ? 'border-[#7138E8] bg-[#F9F7FD] shadow-xs'
                      : 'border-[#E5E2ED] bg-white hover:border-[#D8CBEF] hover:bg-[#FDFBFE]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH"
                    checked={selectedPayment === 'CASH'}
                    onChange={() => setSelectedPayment('CASH')}
                    aria-label="Cash receiving (Cash on pickup)"
                    className="mt-1 h-4 w-4 text-[#7138E8] accent-[#7138E8] focus:ring-[#7138E8] cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-xs sm:text-sm font-bold text-[#17152D] block">
                      Cash receiving (Cash on pickup)
                    </span>
                    <span className="text-xs text-[#77748A] mt-0.5 block">
                      Pay with cash upon receiving your order at the counter / pickup.
                    </span>
                  </div>
                </label>

                {/* Option 3: Test payment — successful */}
                <label
                  className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedPayment === 'SUCCESS'
                      ? 'border-[#7138E8] bg-[#F9F7FD] shadow-xs'
                      : 'border-[#E5E2ED] bg-white hover:border-[#D8CBEF] hover:bg-[#FDFBFE]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="SUCCESS"
                    checked={selectedPayment === 'SUCCESS'}
                    onChange={() => setSelectedPayment('SUCCESS')}
                    className="mt-1 h-4 w-4 text-[#7138E8] accent-[#7138E8] focus:ring-[#7138E8] cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-xs sm:text-sm font-bold text-[#17152D] block">
                      Test payment — successful
                    </span>
                    <span className="text-xs text-[#77748A] mt-0.5 block">
                      Simulates a successful payment locally. No payment gateway is contacted.
                    </span>
                  </div>
                </label>

                {/* Option 4: Test payment — declined */}
                <label
                  className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedPayment === 'DECLINED'
                      ? 'border-[#7138E8] bg-[#F9F7FD] shadow-xs'
                      : 'border-[#E5E2ED] bg-white hover:border-[#D8CBEF] hover:bg-[#FDFBFE]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="DECLINED"
                    checked={selectedPayment === 'DECLINED'}
                    onChange={() => setSelectedPayment('DECLINED')}
                    className="mt-1 h-4 w-4 text-[#7138E8] accent-[#7138E8] focus:ring-[#7138E8] cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-xs sm:text-sm font-bold text-[#17152D] block">
                      Test payment — declined
                    </span>
                    <span className="text-xs text-[#77748A] mt-0.5 block">
                      Simulates a declined test payment locally. Chapa is used only when selected.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Primary Action (~40%) */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 rounded-xl border border-[#E5E2ED] bg-white p-5 sm:p-6 shadow-[0_2px_8px_-2px_rgba(33,17,63,0.04)] text-left">
              {/* Heading with Item Count Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E2ED]">
                <h2 className="text-sm sm:text-base font-bold text-[#17152D]">Order summary</h2>
                <span className="rounded-full bg-[#F3EEFC] px-2.5 py-0.5 text-xs font-bold text-[#7138E8]">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Product List */}
              <div className="divide-y divide-[#E5E2ED]/60 max-h-72 overflow-y-auto py-1">
                {items.map((item) => (
                  <div key={item.product.id} className="py-3 flex items-center gap-3">
                    {/* Product Image Thumbnail */}
                    <div className="h-12 w-12 rounded-lg bg-[#F7F5FA] border border-[#E5E2ED] overflow-hidden shrink-0 flex items-center justify-center">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <Coffee className="h-5 w-5 text-[#7138E8]" />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs sm:text-sm font-bold text-[#17152D] truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[11px] text-[#77748A] mt-0.5">
                        Qty: {item.quantity} &times; {formatCurrency(item.product.basePriceCents)}
                      </p>
                    </div>

                    {/* Line Total */}
                    <span className="text-xs sm:text-sm font-bold text-[#17152D] shrink-0">
                      {formatCurrency(item.product.basePriceCents * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-[#E5E2ED] pt-3.5 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-[#77748A]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#17152D]">
                    {formatCurrency(subtotalCents)}
                  </span>
                </div>
                <div className="flex justify-between text-[#77748A]">
                  <span>Sales tax (10%)</span>
                  <span className="font-semibold text-[#17152D]">
                    {formatCurrency(taxCents)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#E5E2ED] pt-3 text-base sm:text-lg font-extrabold text-[#17152D]">
                  <span>Total due</span>
                  <span className="text-[#7138E8]">
                    {formatCurrency(totalCents)}
                  </span>
                </div>
              </div>

              {/* Primary Confirmation Button */}
              <div className="mt-5">
                <button
                  type="button"
                  disabled={isSubmitting || items.length === 0}
                  onClick={handlePlaceOrder}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#7138E8] hover:bg-[#5E27D6] active:bg-[#4D1FB5] text-white font-bold h-11 sm:h-12 text-sm shadow-md shadow-[#7138E8]/25 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7138E8] focus:ring-offset-2"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Confirming order...</span>
                    </div>
                  ) : (
                    <span>Confirm order · {formatCurrency(totalCents)}</span>
                  )}
                </button>
              </div>

              {/* Security Note Beneath Button */}
              <div className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#77748A]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
                <span>Secure checkout · Order confirmation is idempotent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
