import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChefHat,
  RefreshCw,
  Clock,
  User,
  CheckCircle2,
  PackageCheck,
  PlayCircle,
  ToggleLeft,
  ToggleRight,
  Eye,
  ShoppingBag,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Phone,
  FileText,
} from 'lucide-react';
import { StaffQueueOrder, OrderStatus } from '../../types/api';
import { apiRequest } from '../../lib/api-client';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';

type QueueFilterTab = 'ALL' | 'PREPARING' | 'READY' | 'COMPLETED';

export const KitchenQueuePage: React.FC = () => {
  const [orders, setOrders] = useState<StaffQueueOrder[]>([]);
  const [activeFilter, setActiveFilter] = useState<QueueFilterTab>('ALL');
  const [autoPoll, setAutoPoll] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Order Details Modal state
  const [selectedOrder, setSelectedOrder] = useState<StaffQueueOrder | null>(null);

  // Flag to avoid overlapping requests
  const isFetchingRef = useRef<boolean>(false);

  const fetchQueue = useCallback(async (isManualRefresh = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManualRefresh) {
      setIsRefreshing(true);
    }

    try {
      const data = await apiRequest<StaffQueueOrder[]>('/staff/orders');
      setOrders(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to refresh kitchen queue');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Periodic polling (10s interval)
  useEffect(() => {
    if (!autoPoll) return;
    const interval = setInterval(() => {
      fetchQueue();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoPoll, fetchQueue]);

  // Update order status via state machine patch
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    setError(null);
    try {
      await apiRequest(`/staff/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchQueue();
      // If modal is open for this order, close or update it
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to transition order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const safeOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);

  // Metrics calculations from real order data
  const metrics = useMemo(() => {
    const activeOrders = safeOrders.filter(
      (o) => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED,
    );
    const inPrep = safeOrders.filter((o) => o.status === OrderStatus.IN_PREPARATION);
    const ready = safeOrders.filter((o) => o.status === OrderStatus.READY_FOR_PICKUP);
    const completed = safeOrders.filter((o) => o.status === OrderStatus.COMPLETED);

    return {
      totalActive: activeOrders.length,
      inPrep: inPrep.length,
      ready: ready.length,
      completedToday: completed.length,
    };
  }, [safeOrders]);

  // Filtered orders list based on active tab
  const filteredOrders = useMemo(() => {
    switch (activeFilter) {
      case 'PREPARING':
        return safeOrders.filter((o) => o.status === OrderStatus.IN_PREPARATION);
      case 'READY':
        return safeOrders.filter((o) => o.status === OrderStatus.READY_FOR_PICKUP);
      case 'COMPLETED':
        return safeOrders.filter((o) => o.status === OrderStatus.COMPLETED);
      case 'ALL':
      default:
        // All active orders in FIFO order (needs prep, preparing, ready)
        return safeOrders.filter(
          (o) => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED,
        );
    }
  }, [safeOrders, activeFilter]);

  // Reset pagination on tab filter change
  const handleTabChange = (tab: QueueFilterTab) => {
    setActiveFilter(tab);
    setCurrentPage(1);
  };

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Prep time calculation based on real status history or duration
  const calculatePrepTime = (order: StaffQueueOrder): string => {
    if (order.statusHistory && order.statusHistory.length > 0) {
      const prepStart = order.statusHistory.find(
        (h) => h.toStatus === OrderStatus.IN_PREPARATION,
      );
      if (prepStart) {
        const startTime = new Date(prepStart.createdAt).getTime();
        const finishEvent = order.statusHistory.find(
          (h) =>
            h.toStatus === OrderStatus.READY_FOR_PICKUP ||
            h.toStatus === OrderStatus.COMPLETED,
        );
        if (finishEvent) {
          const finishTime = new Date(finishEvent.createdAt).getTime();
          const durationMin = Math.max(1, Math.round((finishTime - startTime) / 60000));
          return `${durationMin} min`;
        }
        if (order.status === OrderStatus.IN_PREPARATION) {
          const elapsedMin = Math.max(1, Math.round((Date.now() - startTime) / 60000));
          return `${elapsedMin} min`;
        }
      }
    }

    if (order.status === OrderStatus.COMPLETED && order.updatedAt) {
      const created = new Date(order.createdAt).getTime();
      const updated = new Date(order.updatedAt).getTime();
      const durationMin = Math.max(1, Math.round((updated - created) / 60000));
      return `${durationMin} min`;
    }

    // Baseline estimated duration based on item count
    const totalItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const estimatedMin = Math.max(3, totalItemCount * 2);
    return `${estimatedMin} min`;
  };

  // Format concise items string
  const formatItemsSummary = (items: Array<{ productName: string; quantity: number }>) => {
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const names = items.map((i) => (i.quantity > 1 ? `${i.quantity}x ${i.productName}` : i.productName)).join(', ');
    return {
      totalItems,
      names,
      display: `${totalItems} ${totalItems === 1 ? 'item' : 'items'} · ${names}`,
    };
  };

  // Badge configuration based on OrderStatus
  const getBadgeConfig = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.IN_PREPARATION:
        return {
          label: 'Preparing',
          bgClass: 'bg-[#F2ECFC]',
          textClass: 'text-[#7138E8]',
          borderClass: 'border-[#7138E8]/30',
          dotClass: 'bg-[#7138E8]',
        };
      case OrderStatus.READY_FOR_PICKUP:
        return {
          label: 'Ready for Pickup',
          bgClass: 'bg-[#EDF8F4]',
          textClass: 'text-[#10A87A]',
          borderClass: 'border-[#B7EBD8]',
          dotClass: 'bg-[#10A87A]',
        };
      case OrderStatus.COMPLETED:
        return {
          label: 'Completed',
          bgClass: 'bg-[#F1F0F5]',
          textClass: 'text-[#77718B]',
          borderClass: 'border-[#E9E5F0]',
          dotClass: 'bg-[#77718B]',
        };
      case OrderStatus.CONFIRMED:
        return {
          label: 'Confirmed (Needs Prep)',
          bgClass: 'bg-[#FEF7EC]',
          textClass: 'text-[#D99016]',
          borderClass: 'border-[#FDE8C8]',
          dotClass: 'bg-[#D99016]',
        };
      case OrderStatus.CANCELLED:
        return {
          label: 'Cancelled',
          bgClass: 'bg-[#FDEDEE]',
          textClass: 'text-[#C43D4B]',
          borderClass: 'border-[#FAC7CB]',
          dotClass: 'bg-[#C43D4B]',
        };
      default:
        return {
          label: status,
          bgClass: 'bg-[#F8F7FC]',
          textClass: 'text-[#19152A]',
          borderClass: 'border-[#E9E5F0]',
          dotClass: 'bg-[#77718B]',
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7FC] text-[#19152A] py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full space-y-6">
        {/* =========================================================================
            SECTION 5: PAGE HEADER
        ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left: Chef Hat Icon Container, Heading, Subtitle */}
          <div className="flex items-center gap-3">
            <ChefHat className="h-7 w-7 text-[#7138E8] shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#19152A] tracking-tight">
                Kitchen Queue (KDS)
              </h1>
              <p className="text-xs text-[#77718B] mt-0.5">
                Live order queue for beverage preparation and counter pickup.
              </p>
            </div>
          </div>

          {/* Right: Auto-Refresh Status & Manual Refresh Button */}
          <div className="flex items-center gap-2.5">
            {/* Auto-refresh status toggle */}
            <button
              onClick={() => setAutoPoll((prev) => !prev)}
              aria-label="Toggle auto refresh"
              className="flex items-center gap-2 rounded-xl border border-[#E9E5F0] bg-white px-3 py-2 text-xs font-semibold text-[#19152A] shadow-2xs hover:bg-[#F2ECFC]/50 transition-colors cursor-pointer"
            >
              {autoPoll ? (
                <ToggleRight className="h-5 w-5 text-[#10A87A]" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-[#77718B]" />
              )}
              <span>Auto-refresh (10s): {autoPoll ? 'ON' : 'OFF'}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => fetchQueue(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E9E5F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#19152A] hover:border-[#7138E8] hover:text-[#7138E8] hover:bg-[#F2ECFC]/40 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#7138E8] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Now</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div>
            <Alert variant="error" title="Queue Synchronization Issue" onClose={() => setError(null)}>
              {error}
            </Alert>
          </div>
        )}

        {/* =========================================================================
            SECTION 6: SUMMARY CARDS (4 HORIZONTALLY ALIGNED CARDS)
        ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Orders */}
          <div className="flex items-center gap-3.5 rounded-xl border border-[#E9E5F0] bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25 shrink-0">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#77718B]">
                Total Orders
              </span>
              <div className="text-xl font-black text-[#19152A] leading-tight mt-0.5">
                {metrics.totalActive}
              </div>
              <span className="block text-[11px] text-[#77718B] mt-0.5">In queue</span>
            </div>
          </div>

          {/* Card 2: Preparing */}
          <div className="flex items-center gap-3.5 rounded-xl border border-[#E9E5F0] bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25 shrink-0">
              <PlayCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#77718B]">
                Preparing
              </span>
              <div className="text-xl font-black text-[#19152A] leading-tight mt-0.5">
                {metrics.inPrep}
              </div>
              <span className="block text-[11px] text-[#77718B] mt-0.5">In progress</span>
            </div>
          </div>

          {/* Card 3: Ready for Pickup */}
          <div className="flex items-center gap-3.5 rounded-xl border border-[#E9E5F0] bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25 shrink-0">
              <PackageCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#77718B]">
                Ready for Pickup
              </span>
              <div className="text-xl font-black text-[#19152A] leading-tight mt-0.5">
                {metrics.ready}
              </div>
              <span className="block text-[11px] text-[#77718B] mt-0.5">Awaiting collection</span>
            </div>
          </div>

          {/* Card 4: Completed Today */}
          <div className="flex items-center gap-3.5 rounded-xl border border-[#E9E5F0] bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25 shrink-0">
              <CheckCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#77718B]">
                Completed Today
              </span>
              <div className="text-xl font-black text-[#19152A] leading-tight mt-0.5">
                {metrics.completedToday}
              </div>
              <span className="block text-[11px] text-[#77718B] mt-0.5">Orders completed</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 7: QUEUE FILTER TABS
        ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => handleTabChange('ALL')}
            className={`rounded-xl px-4 py-2 text-xs transition-all cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-[#7138E8] text-white shadow-xs font-bold border border-[#7138E8]'
                : 'bg-white text-[#19152A] hover:bg-[#F2ECFC]/50 hover:text-[#7138E8] border border-[#E9E5F0] font-semibold'
            }`}
          >
            All Queues ({metrics.totalActive})
          </button>
          <button
            onClick={() => handleTabChange('PREPARING')}
            className={`rounded-xl px-4 py-2 text-xs transition-all cursor-pointer ${
              activeFilter === 'PREPARING'
                ? 'bg-[#7138E8] text-white shadow-xs font-bold border border-[#7138E8]'
                : 'bg-white text-[#19152A] hover:bg-[#F2ECFC]/50 hover:text-[#7138E8] border border-[#E9E5F0] font-semibold'
            }`}
          >
            Preparing ({metrics.inPrep})
          </button>
          <button
            onClick={() => handleTabChange('READY')}
            className={`rounded-xl px-4 py-2 text-xs transition-all cursor-pointer ${
              activeFilter === 'READY'
                ? 'bg-[#7138E8] text-white shadow-xs font-bold border border-[#7138E8]'
                : 'bg-white text-[#19152A] hover:bg-[#F2ECFC]/50 hover:text-[#7138E8] border border-[#E9E5F0] font-semibold'
            }`}
          >
            Ready for Pickup ({metrics.ready})
          </button>
          <button
            onClick={() => handleTabChange('COMPLETED')}
            className={`rounded-xl px-4 py-2 text-xs transition-all cursor-pointer ${
              activeFilter === 'COMPLETED'
                ? 'bg-[#7138E8] text-white shadow-xs font-bold border border-[#7138E8]'
                : 'bg-white text-[#19152A] hover:bg-[#F2ECFC]/50 hover:text-[#7138E8] border border-[#E9E5F0] font-semibold'
            }`}
          >
            Completed ({metrics.completedToday})
          </button>
        </div>

        {/* =========================================================================
            SECTION 8 & 12: ORDER TABLE — PRIMARY INTERFACE & STATES
        ========================================================================= */}
        <div className="rounded-2xl border border-[#E9E5F0] bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E9E5F0] bg-[#F8F7FC] text-[10px] font-extrabold uppercase tracking-wider text-[#77718B]">
                  <th className="px-4 py-3.5 text-center w-12">#</th>
                  <th className="px-5 py-3.5">ORDER ID</th>
                  <th className="px-5 py-3.5">CUSTOMER</th>
                  <th className="px-5 py-3.5">ITEMS</th>
                  <th className="px-5 py-3.5">STATUS</th>
                  <th className="px-5 py-3.5">PREP TIME</th>
                  <th className="px-5 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E5F0]">
                {/* Loading Skeleton Rows */}
                {isLoading && (
                  <>
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="px-4 py-4 text-center">
                          <div className="h-4 w-4 bg-slate-100 rounded mx-auto" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-4 w-20 bg-slate-100 rounded mb-1" />
                          <div className="h-3 w-16 bg-slate-100 rounded" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-4 w-28 bg-slate-100 rounded mb-1" />
                          <div className="h-3 w-20 bg-slate-100 rounded" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-4 w-40 bg-slate-100 rounded" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-6 w-24 bg-slate-100 rounded-full" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-4 w-14 bg-slate-100 rounded" />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="h-7 w-16 bg-slate-100 rounded-lg ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Real Data Rows */}
                {!isLoading &&
                  paginatedOrders.map((order, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const badge = getBadgeConfig(order.status);
                    const prepTimeStr = calculatePrepTime(order);
                    const itemsInfo = formatItemsSummary(order.items);
                    const isUpdating = updatingId === order.id;

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-[#F8F7FC]/70 transition-colors group"
                      >
                        {/* 1. Row Number */}
                        <td className="px-4 py-4 text-center font-mono font-bold text-[#77718B]">
                          {rowNumber}
                        </td>

                        {/* 2. Order ID */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-sm text-[#19152A] group-hover:text-[#7138E8] transition-colors">
                              #{order.orderNumber}
                            </span>
                            <span className="text-[11px] text-[#77718B] flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 text-[#77718B]" />
                              <span>{formatDateTime(order.createdAt)}</span>
                            </span>
                          </div>
                        </td>

                        {/* 3. Customer */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2ECFC] text-xs font-bold text-[#7138E8] shrink-0 border border-[#7138E8]/20">
                              {order.customer?.fullName ? order.customer.fullName[0].toUpperCase() : 'W'}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-[#19152A]">
                                {order.customer?.fullName || 'Walk-in Customer'}
                              </span>
                              {order.customer?.phoneNumber ? (
                                <span className="text-[11px] text-[#77718B]">
                                  {order.customer.phoneNumber}
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#77718B]">Counter Service</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 4. Items */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1 max-w-xs sm:max-w-md">
                            <span className="font-medium text-xs text-[#19152A] truncate" title={itemsInfo.names}>
                              {itemsInfo.display}
                            </span>
                            {order.customerNotes && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#D99016] font-medium truncate">
                                <span className="rounded bg-[#FEF7EC] px-1.5 py-0.2 border border-[#D99016]/20 font-bold text-[10px]">
                                  Note:
                                </span>
                                &ldquo;{order.customerNotes}&rdquo;
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        {/* 6. Prep Time */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-semibold text-xs text-[#19152A] flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-[#77718B]" />
                            <span>{prepTimeStr}</span>
                          </span>
                        </td>

                        {/* 7. Actions */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Inline status transition actions for baristas */}
                            {order.status === OrderStatus.CONFIRMED && (
                              <button
                                onClick={() => updateOrderStatus(order.id, OrderStatus.IN_PREPARATION)}
                                disabled={isUpdating}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#7138E8] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#5E2BCA] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                                title="Start drink preparation"
                              >
                                <PlayCircle className="h-3.5 w-3.5" />
                                <span>Start</span>
                              </button>
                            )}

                            {order.status === OrderStatus.IN_PREPARATION && (
                              <button
                                onClick={() => updateOrderStatus(order.id, OrderStatus.READY_FOR_PICKUP)}
                                disabled={isUpdating}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#10A87A] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0E8E67] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                                title="Mark order ready for counter pickup"
                              >
                                <PackageCheck className="h-3.5 w-3.5" />
                                <span>Ready</span>
                              </button>
                            )}

                            {order.status === OrderStatus.READY_FOR_PICKUP && (
                              <button
                                onClick={() => updateOrderStatus(order.id, OrderStatus.COMPLETED)}
                                disabled={isUpdating}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#E9E5F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#10A87A] hover:bg-[#EDF8F4] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                                title="Hand off to customer and complete order"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Complete</span>
                              </button>
                            )}

                            {/* View Details Button */}
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E9E5F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#19152A] hover:border-[#7138E8] hover:text-[#7138E8] hover:bg-[#F2ECFC]/40 transition-colors cursor-pointer shadow-2xs"
                              title="View full order specification"
                            >
                              <Eye className="h-3.5 w-3.5 text-[#7138E8]" />
                              <span>View</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {/* Empty State */}
                {!isLoading && filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2 text-[#77718B]">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF8F4] text-[#10A87A] border border-[#B7EBD8]">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <p className="text-base font-bold text-[#19152A] mt-2">
                          {orders.length === 0 ? 'Queue is clear' : 'No orders in this queue'}
                        </p>
                        <p className="text-xs text-[#77718B] max-w-sm">
                          {orders.length === 0
                            ? 'No active orders need attention right now. New orders will appear here when received.'
                            : 'Orders will appear here when they match this status.'}
                        </p>
                        {activeFilter !== 'ALL' && (
                          <button
                            onClick={() => handleTabChange('ALL')}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#E9E5F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#7138E8] hover:bg-[#F2ECFC] transition-colors cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Return to All Queues</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* =========================================================================
              SECTION 11: PAGINATION AND TABLE FOOTER
          ========================================================================= */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#E9E5F0] bg-white text-xs">
            {/* Dynamic Result Summary */}
            <div className="text-[#77718B]">
              Showing{' '}
              <span className="font-bold text-[#19152A]">
                {filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>
              –
              <span className="font-bold text-[#19152A]">
                {Math.min(currentPage * pageSize, filteredOrders.length)}
              </span>{' '}
              of <span className="font-bold text-[#19152A]">{filteredOrders.length}</span> orders
            </div>

            {/* Right: Page Size Selector & Pagination Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[#77718B]">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-[#E9E5F0] bg-[#F8F7FC] px-2 py-1 text-xs text-[#19152A] font-semibold focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E9E5F0] text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === pg
                        ? 'bg-[#7138E8] text-white shadow-xs'
                        : 'border border-[#E9E5F0] text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A]'
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E9E5F0] text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  aria-label="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 9: ORDER DETAILS AND KITCHEN WORKFLOW MODAL
        ========================================================================= */}
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={selectedOrder ? `Kitchen Order #${selectedOrder.orderNumber}` : 'Order Details'}
          description="Ticket specifications, customer instructions, and kitchen workflow hand-off."
          maxWidth="lg"
        >
          {selectedOrder && (
            <div className="space-y-4 text-xs text-[#19152A]">
              {/* Order Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F8F7FC] border border-[#E9E5F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-[#19152A]">
                      #{selectedOrder.orderNumber}
                    </span>
                    {(() => {
                      const badge = getBadgeConfig(selectedOrder.status);
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
                          <span>{badge.label}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <div className="text-[11px] text-[#77718B] mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Placed on {formatDateTime(selectedOrder.createdAt)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#77718B] block">
                    Order Total
                  </span>
                  <span className="text-base font-black text-[#19152A]">
                    {formatCurrency(selectedOrder.totalCents)}
                  </span>
                </div>
              </div>

              {/* Customer Information */}
              <div className="rounded-xl border border-[#E9E5F0] bg-white p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#77718B] uppercase tracking-wider">
                  <User className="h-3.5 w-3.5 text-[#7138E8]" />
                  <span>Customer Details</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="font-bold text-sm text-[#19152A]">
                      {selectedOrder.customer?.fullName || 'Walk-in Customer'}
                    </div>
                    {selectedOrder.customer?.email && (
                      <div className="text-[11px] text-[#77718B]">
                        {selectedOrder.customer.email}
                      </div>
                    )}
                  </div>
                  {selectedOrder.customer?.phoneNumber && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-[#7138E8] bg-[#F2ECFC] px-2.5 py-1 rounded-lg">
                      <Phone className="h-3 w-3" />
                      <span>{selectedOrder.customer.phoneNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Instructions Banner */}
              {selectedOrder.customerNotes && (
                <div className="rounded-xl border border-[#D99016]/30 bg-[#FEF7EC] p-3 text-xs text-[#925C05]">
                  <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wide mb-1 text-[#D99016]">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Special Preparation Instructions</span>
                  </div>
                  <p className="font-semibold text-[#19152A] italic">
                    &ldquo;{selectedOrder.customerNotes}&rdquo;
                  </p>
                </div>
              )}

              {/* Itemized Order Table */}
              <div className="rounded-xl border border-[#E9E5F0] bg-white overflow-hidden">
                <div className="px-3.5 py-2.5 bg-[#F8F7FC] border-b border-[#E9E5F0] font-bold text-xs text-[#19152A]">
                  Beverage &amp; Kitchen Items ({selectedOrder.items.reduce((s, i) => s + i.quantity, 0)})
                </div>
                <div className="divide-y divide-[#E9E5F0]">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F2ECFC] text-xs font-bold text-[#7138E8] border border-[#7138E8]/20">
                          {item.quantity}
                        </span>
                        <span className="font-semibold text-xs text-[#19152A]">
                          {item.productName}
                        </span>
                      </div>
                      {item.unitPriceCents && (
                        <span className="font-mono text-xs font-bold text-[#77718B]">
                          {formatCurrency(item.unitPriceCents * item.quantity)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Kitchen Workflow Actions Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E9E5F0]">
                <div className="text-[11px] text-[#77718B]">
                  Estimated Prep: <span className="font-bold text-[#19152A]">{calculatePrepTime(selectedOrder)}</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                  >
                    Close
                  </Button>

                  {selectedOrder.status === OrderStatus.CONFIRMED && (
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={updatingId === selectedOrder.id}
                      onClick={() => updateOrderStatus(selectedOrder.id, OrderStatus.IN_PREPARATION)}
                      leftIcon={<PlayCircle className="h-4 w-4" />}
                    >
                      Start Preparing
                    </Button>
                  )}

                  {selectedOrder.status === OrderStatus.IN_PREPARATION && (
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={updatingId === selectedOrder.id}
                      onClick={() => updateOrderStatus(selectedOrder.id, OrderStatus.READY_FOR_PICKUP)}
                      leftIcon={<PackageCheck className="h-4 w-4" />}
                      className="bg-[#10A87A] hover:bg-[#0E8E67]"
                    >
                      Ready for Pickup
                    </Button>
                  )}

                  {selectedOrder.status === OrderStatus.READY_FOR_PICKUP && (
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={updatingId === selectedOrder.id}
                      onClick={() => updateOrderStatus(selectedOrder.id, OrderStatus.COMPLETED)}
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    >
                      Mark Completed
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
