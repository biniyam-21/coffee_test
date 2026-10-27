import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Coffee,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  XCircle,
  ChefHat,
  PackageCheck,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types/api';
import { apiRequest } from '../../lib/api-client';
import { formatCurrency, formatDateTime, getOrderStatusBadge } from '../../lib/formatters';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';

export const OrderTrackPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiRequest<Order>(`/orders/${id}`);
      setOrder(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to locate order tracking data.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Periodic polling for active orders (every 8 seconds)
  useEffect(() => {
    if (!order) return;
    const isTerminal =
      order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED;
    if (isTerminal) return;

    const interval = setInterval(() => {
      fetchOrderDetails();
    }, 8000);

    return () => clearInterval(interval);
  }, [order, fetchOrderDetails]);

  const handleCancelOrder = async () => {
    if (!id) return;
    setIsCancelling(true);
    try {
      await apiRequest(`/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason || 'Customer requested cancellation' }),
      });
      setIsCancelModalOpen(false);
      await fetchOrderDetails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium text-slate-500">Loading order tracking...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg py-16 px-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">{error || 'This order could not be loaded.'}</p>
        <Link to="/orders">
          <Button variant="primary">View My Orders</Button>
        </Link>
      </div>
    );
  }

  const badge = getOrderStatusBadge(order.status);
  const canCancel = order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED;

  // Timeline steps
  const steps = [
    {
      id: OrderStatus.CONFIRMED,
      label: 'Order Confirmed',
      desc: 'Payment authorized and receipt dispatched',
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    {
      id: OrderStatus.IN_PREPARATION,
      label: 'Preparing Beverage',
      desc: 'Barista is crafting your order',
      icon: <ChefHat className="h-5 w-5" />,
    },
    {
      id: OrderStatus.READY_FOR_PICKUP,
      label: 'Ready for Pickup',
      desc: 'Waiting at the counter for you',
      icon: <PackageCheck className="h-5 w-5" />,
    },
    {
      id: OrderStatus.COMPLETED,
      label: 'Completed',
      desc: 'Enjoy your handcrafted coffee!',
      icon: <Coffee className="h-5 w-5" />,
    },
  ];

  const getStepStatus = (stepId: OrderStatus) => {
    if (order.status === OrderStatus.CANCELLED) return 'cancelled';

    const orderRanks: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.CONFIRMED]: 1,
      [OrderStatus.IN_PREPARATION]: 2,
      [OrderStatus.READY_FOR_PICKUP]: 3,
      [OrderStatus.COMPLETED]: 4,
      [OrderStatus.CANCELLED]: -1,
    };

    const currentRank = orderRanks[order.status] ?? 0;
    const stepRank = orderRanks[stepId] ?? 0;

    if (currentRank > stepRank) return 'complete';
    if (currentRank === stepRank) return 'current';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Orders</span>
        </Link>

        {/* Order Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Order #{order.orderNumber}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.bgClass} ${badge.textClass}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Placed {formatDateTime(order.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOrderDetails}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Refresh
              </Button>
              {canCancel && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(true)}
                  leftIcon={<XCircle className="h-3.5 w-3.5" />}
                >
                  Cancel Order
                </Button>
              )}
            </div>
          </div>

          {/* Cancellation Notice if Cancelled */}
          {order.status === OrderStatus.CANCELLED && (
            <div className="mt-4">
              <Alert variant="error" title="This order has been cancelled">
                Inventory was returned and customer account has been credited.
              </Alert>
            </div>
          )}

          {/* Live Progress Timeline */}
          {order.status !== OrderStatus.CANCELLED && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6">
                Live Preparation Timeline
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                {steps.map((step) => {
                  const state = getStepStatus(step.id);
                  const isCurrent = state === 'current';
                  const isComplete = state === 'complete';

                  return (
                    <div
                      key={step.id}
                      className={`relative flex flex-col p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? 'border-brand-500 bg-brand-50/50 shadow-sm'
                          : isComplete
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-slate-200 bg-white opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isCurrent
                              ? 'bg-brand-600 text-white animate-pulse'
                              : isComplete
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {step.icon}
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            isCurrent
                              ? 'text-brand-900'
                              : isComplete
                                ? 'text-emerald-900'
                                : 'text-slate-500'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order Details & Receipt Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Items Table */}
          <div className="md:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4">Items in Order</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 uppercase">
                    <th className="pb-3">Item</th>
                    <th className="pb-3 text-center">Qty</th>
                    <th className="pb-3 text-right">Unit Price</th>
                    <th className="pb-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items?.map((item) => (
                    <tr key={item.id} className="text-slate-800">
                      <td className="py-3.5 font-semibold text-slate-900">{item.productName}</td>
                      <td className="py-3.5 text-center font-medium">{item.quantity}</td>
                      <td className="py-3.5 text-right text-slate-500">
                        {formatCurrency(item.unitPriceCents)}
                      </td>
                      <td className="py-3.5 text-right font-bold text-slate-900">
                        {formatCurrency(item.lineTotalCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {order.customerNotes && (
              <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Customer Notes
                </span>
                <p className="text-xs text-slate-700 italic">{order.customerNotes}</p>
              </div>
            )}
          </div>

          {/* Pricing Breakdown Card */}
          <div className="md:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              Payment Summary
            </h2>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(order.subtotalCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax (10%)</span>
                <span className="font-medium text-slate-900">{formatCurrency(order.taxCents)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-extrabold text-slate-900">
                <span>Total Paid</span>
                <span className="text-brand-600">{formatCurrency(order.totalCents)}</span>
              </div>
            </div>

            {order.payment && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs space-y-1 text-slate-500">
                <div className="flex justify-between">
                  <span>Payment Status:</span>
                  <span className="font-semibold text-emerald-700">{order.payment.status}</span>
                </div>
                {order.payment.transactionId && (
                  <div className="flex justify-between truncate">
                    <span>Txn:</span>
                    <span className="font-mono text-[10px] text-slate-700">
                      {order.payment.transactionId}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cancellation Modal */}
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title="Cancel This Order?"
          description="Are you sure you want to cancel this order? This will release reserved stock and record a cancellation event."
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
              >
                Keep Order
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancelOrder}
                isLoading={isCancelling}
              >
                Yes, Cancel Order
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-700">
              Reason for cancellation (optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Changed mind, placed by mistake"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </Modal>
      </div>
    </div>
  );
};
