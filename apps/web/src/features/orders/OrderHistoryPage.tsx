import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Search,
  RefreshCw,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Coffee,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Printer,
  CreditCard,
  RotateCcw,
  SlidersHorizontal,
  User,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { Order, OrderStatus, RoleType, PaginatedResult } from '../../types/api';
import { apiRequest } from '../../lib/api-client';
import { formatDateTime } from '../../lib/formatters';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/ui/Alert';

// Permitted status transitions according to business rules
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.IN_PREPARATION, OrderStatus.CANCELLED],
  [OrderStatus.IN_PREPARATION]: [OrderStatus.READY_FOR_PICKUP],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

// Ethiopian Birr financial formatter
const formatETB = (cents: number | undefined | null): string => {
  if (cents === undefined || cents === null || isNaN(cents)) return 'ETB 0.00';
  const val = cents / 100;
  return `ETB ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const OrderHistoryPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const isStaffOrAdmin = hasRole(RoleType.STAFF) || hasRole(RoleType.ADMIN);

  // Orders and Pagination state
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | '7DAYS' | '30DAYS'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'TOTAL_DESC' | 'TOTAL_ASC'>('NEWEST');

  // Selected Order Modal & Operational Dialogs
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const selectedOrderIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedOrderIdRef.current = selectedOrder?.id ?? null;
  }, [selectedOrder?.id]);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);

  // Calculate ISO date boundaries based on dateRangeFilter
  const getDateFilterBounds = useCallback((range: string) => {
    const now = new Date();
    if (range === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (range === 'YESTERDAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (range === '7DAYS') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (range === '30DAYS') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    return { startDate: undefined, endDate: undefined };
  }, []);

  // Fetch orders from authoritative API
  const fetchOrders = useCallback(
    async (showSilentRefresh: boolean = false) => {
      if (showSilentRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', String(currentPage));
        queryParams.set('limit', String(pageSize));

        if (statusFilter !== 'ALL') {
          queryParams.set('status', statusFilter);
        }
        if (searchQuery.trim()) {
          queryParams.set('search', searchQuery.trim());
        }
        if (paymentStatusFilter !== 'ALL') {
          queryParams.set('paymentStatus', paymentStatusFilter);
        }
        if (paymentMethodFilter !== 'ALL') {
          queryParams.set('paymentMethod', paymentMethodFilter);
        }

        const dateBounds = getDateFilterBounds(dateRangeFilter);
        if (dateBounds.startDate) queryParams.set('startDate', dateBounds.startDate);
        if (dateBounds.endDate) queryParams.set('endDate', dateBounds.endDate);

        const res = await apiRequest<PaginatedResult<Order>>(`/orders?${queryParams.toString()}`);
        const orderData = Array.isArray(res?.data) ? res.data : [];
        setOrders(orderData);
        setTotalOrders(res?.meta?.total ?? orderData.length);

        // If modal is currently inspecting an order, refresh state safely without triggering infinite loops
        if (selectedOrderIdRef.current) {
          const updated = orderData.find((o) => o.id === selectedOrderIdRef.current);
          if (updated) {
            setSelectedOrder((prev) => {
              if (
                !prev ||
                prev.id !== updated.id ||
                prev.status !== updated.status ||
                prev.updatedAt !== updated.updatedAt
              ) {
                return updated;
              }
              return prev;
            });
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to fetch orders from database.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      currentPage,
      pageSize,
      statusFilter,
      searchQuery,
      paymentStatusFilter,
      paymentMethodFilter,
      dateRangeFilter,
      getDateFilterBounds,
    ],
  );

  // Initial and reactive load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const safeOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);

  // Client-side stable sorting on current dataset
  const sortedOrders = useMemo(() => {
    return [...safeOrders].sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'TOTAL_DESC') {
        return b.totalCents - a.totalCents;
      }
      if (sortBy === 'TOTAL_ASC') {
        return a.totalCents - b.totalCents;
      }
      return 0;
    });
  }, [safeOrders, sortBy]);

  // Restrained Order Overview Metrics (Section 6)
  const orderOverview = useMemo(() => {
    let completedCount = 0;
    let inProgressCount = 0;
    let nonCancelledTotalCents = 0;

    for (const ord of safeOrders) {
      if (ord.status === OrderStatus.COMPLETED) {
        completedCount++;
        nonCancelledTotalCents += ord.totalCents;
      } else if (ord.status !== OrderStatus.CANCELLED) {
        inProgressCount++;
        nonCancelledTotalCents += ord.totalCents;
      }
    }

    return {
      total: totalOrders,
      completed: completedCount,
      inProgress: inProgressCount,
      volumeCents: nonCancelledTotalCents,
    };
  }, [safeOrders, totalOrders]);

  // Order Status semantic styling helper
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return {
          label: 'Pending',
          badgeClass: 'border-[#FDE8C8] bg-[#FEF7EC] text-[#B7791F]',
          dotClass: 'bg-[#B7791F]',
        };
      case OrderStatus.CONFIRMED:
        return {
          label: 'Confirmed',
          badgeClass: 'border-[#BAE6FD] bg-[#F0F7FF] text-[#0284C7]',
          dotClass: 'bg-[#0284C7]',
        };
      case OrderStatus.IN_PREPARATION:
        return {
          label: 'In Preparation',
          badgeClass: 'border-[#7138E8]/30 bg-[#F3EEFC] text-[#7138E8]',
          dotClass: 'bg-[#7138E8]',
        };
      case OrderStatus.READY_FOR_PICKUP:
        return {
          label: 'Ready for Pickup',
          badgeClass: 'border-[#7138E8]/40 bg-[#F3EEFC] text-[#7138E8]',
          dotClass: 'bg-[#7138E8]',
        };
      case OrderStatus.COMPLETED:
        return {
          label: 'Completed',
          badgeClass: 'border-[#B7EBD8] bg-[#EDF8F4] text-[#138A63]',
          dotClass: 'bg-[#138A63]',
        };
      case OrderStatus.CANCELLED:
        return {
          label: 'Cancelled',
          badgeClass: 'border-[#FAC7CB] bg-[#FDEDEE] text-[#C24141]',
          dotClass: 'bg-[#C24141]',
        };
      default:
        return {
          label: status,
          badgeClass: 'border-[#E9E5EE] bg-[#F8F7FA] text-[#777183]',
          dotClass: 'bg-[#777183]',
        };
    }
  };

  // Payment Status semantic helper
  const getPaymentBadge = (status?: string, provider?: string) => {
    const isPaid = status === 'SUCCESS' || status === 'PAID';
    const isRefunded = status === 'REFUNDED';
    const isFailed = status === 'FAILED';

    return {
      provider: provider || 'Card / Gateway',
      statusLabel: isPaid ? 'Paid' : isRefunded ? 'Refunded' : isFailed ? 'Failed' : 'Pending',
      statusClass: isPaid
        ? 'text-[#138A63] bg-[#EDF8F4] border-[#B7EBD8]'
        : isRefunded
        ? 'text-[#777183] bg-[#F8F7FA] border-[#E9E5EE]'
        : isFailed
        ? 'text-[#C24141] bg-[#FDEDEE] border-[#FAC7CB]'
        : 'text-[#B7791F] bg-[#FEF7EC] border-[#FDE8C8]',
      dotClass: isPaid
        ? 'bg-[#138A63]'
        : isRefunded
        ? 'bg-[#777183]'
        : isFailed
        ? 'bg-[#C24141]'
        : 'bg-[#B7791F]',
    };
  };

  // Transition order status (Staff / Admin operational safety)
  const handleTransitionStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setIsUpdatingStatus(true);
    setError(null);
    setActionSuccess(null);
    try {
      await apiRequest(`/staff/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          notes: `Operational update to ${nextStatus} via Order History dashboard`,
        }),
      });
      setActionSuccess(`Order #${selectedOrder?.orderNumber || orderId.slice(0, 8)} status advanced to ${getStatusBadge(nextStatus).label}.`);
      await fetchOrders(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update order status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Cancel order (with stock restoration and audit logging)
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setIsCancellingOrder(true);
    setError(null);
    try {
      await apiRequest(`/orders/${selectedOrder.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          reason: cancelReason || 'Customer requested order cancellation',
        }),
      });
      setShowCancelConfirm(false);
      setCancelReason('');
      setActionSuccess(`Order #${selectedOrder.orderNumber} successfully cancelled and reserved inventory restored.`);
      await fetchOrders(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  // Printable Restaurant POS Receipt Generator (Section 9)
  const handlePrintReceipt = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - Order #${order.orderNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; padding: 25px; max-width: 380px; margin: 0 auto; color: #211D2B; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #777183; margin: 12px 0; }
            .row { display: flex; justify-content: space-between; font-size: 13px; margin: 5px 0; }
            .header h2 { margin: 0 0 4px; font-size: 18px; color: #21113F; }
            .header p { margin: 2px 0; font-size: 11px; color: #777183; }
            .total-row { font-size: 15px; font-weight: 800; color: #7138E8; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="center header">
            <h2>AKUFADA COFFEE ARTISANS</h2>
            <p>Bole Sub-City, Addis Ababa, Ethiopia</p>
            <p>Order #${order.orderNumber}</p>
            <p>${new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div class="divider"></div>
          <div>
            ${order.items.map((it) => `
              <div class="row">
                <span>${it.quantity}x ${it.productName}</span>
                <span class="bold">ETB ${(it.lineTotalCents / 100).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="divider"></div>
          <div class="row">
            <span>Subtotal</span>
            <span>ETB ${(order.subtotalCents / 100).toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Tax (VAT)</span>
            <span>ETB ${(order.taxCents / 100).toFixed(2)}</span>
          </div>
          <div class="row total-row">
            <span>TOTAL</span>
            <span>ETB ${(order.totalCents / 100).toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="center" style="font-size: 11px; color: #777183; margin-top: 15px;">
            <p>Status: <strong>${order.status}</strong></p>
            <p>Customer: <strong>${order.customer?.fullName || 'Walk-in Guest'}</strong></p>
            <p>Payment: <strong>${order.payment?.provider || 'MOCK_GATEWAY'} (${order.payment?.status || 'PAID'})</strong></p>
            <p style="margin-top: 12px; font-style: italic;">Thank you for visiting Akufada Coffee Artisans!</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Safe Financial CSV Exporter (Formula-Injection Protected)
  const handleExportOrdersCSV = () => {
    if (orders.length === 0) return;
    const sanitize = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      let s = String(val).replace(/"/g, '""');
      if (/^[=+\-@]/.test(s)) s = `'${s}`;
      return `"${s}"`;
    };

    const headers = [
      'Order #',
      'Date & Time',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Items Count',
      'Subtotal (ETB)',
      'Tax (ETB)',
      'Total (ETB)',
      'Payment Provider',
      'Payment Status',
      'Order Status',
    ];

    const rows = orders.map((o) => [
      sanitize(o.orderNumber),
      sanitize(o.createdAt),
      sanitize(o.customer?.fullName || 'Walk-in Guest'),
      sanitize(o.customer?.email || '—'),
      sanitize(o.customer?.phoneNumber || '—'),
      o.itemCount || o.items?.reduce((s, it) => s + it.quantity, 0) || 0,
      sanitize((o.subtotalCents / 100).toFixed(2)),
      sanitize((o.taxCents / 100).toFixed(2)),
      sanitize((o.totalCents / 100).toFixed(2)),
      sanitize(o.payment?.provider || o.payments?.[0]?.provider || 'MOCK_GATEWAY'),
      sanitize(o.payment?.status || o.payments?.[0]?.status || 'SUCCESS'),
      sanitize(o.status),
    ].join(','));

    const csvContent = [headers.map(sanitize).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `akufada-orders-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    paymentStatusFilter !== 'ALL' ||
    paymentMethodFilter !== 'ALL' ||
    dateRangeFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPaymentStatusFilter('ALL');
    setPaymentMethodFilter('ALL');
    setDateRangeFilter('ALL');
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));

  return (
    <div className="min-h-screen bg-[#F8F7FA] text-[#211D2B] py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full space-y-6">
        {/* Alerts for feedback */}
        {error && (
          <Alert variant="error" title="Order Operation Error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {actionSuccess && (
          <Alert variant="success" title="Success" onClose={() => setActionSuccess(null)}>
            {actionSuccess}
          </Alert>
        )}

        {/* ---------------------------------------------------------------------
            SECTION 5: PAGE HEADER
        --------------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div className="space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-[#7138E8]">
              STORE OPERATIONS
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="h-6 w-6 text-[#7138E8] shrink-0" />
              <h1 className="text-2xl sm:text-[28px] font-black text-[#211D2B] tracking-tight">
                Order History
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#777183] leading-relaxed">
              Review orders, track fulfillment, and verify payments.
            </p>
          </div>

          {/* Page Actions: Refresh & Export */}
          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <button
              onClick={() => fetchOrders(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E9E5EE] bg-white hover:bg-[#F8F7FA] text-[#211D2B] font-bold text-xs sm:text-sm px-3.5 py-2.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Orders"
            >
              <RefreshCw
                className={`h-4 w-4 text-[#777183] ${isRefreshing ? 'animate-spin text-[#7138E8]' : ''}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleExportOrdersCSV}
              disabled={orders.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-[#7138E8]/30 bg-[#F3EEFC] hover:bg-[#E9E0FA] text-[#7138E8] font-bold text-xs sm:text-sm px-3.5 py-2.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Export Orders CSV"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------------
            SECTION 6: ORDER OVERVIEW SUMMARY ROW
        --------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#E9E5EE] bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-[#777183] uppercase tracking-wider">
                Total Orders
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25">
                <ShoppingBag className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-2xl lg:text-[26px] font-black text-[#211D2B] tracking-tight">
              {orderOverview.total}
            </div>
            <div className="text-[11px] text-[#777183] mt-1 font-medium">
              Recorded in current scope
            </div>
          </div>

          <div className="rounded-xl border border-[#E9E5EE] bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-[#777183] uppercase tracking-wider">
                Completed Orders
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-2xl lg:text-[26px] font-black text-[#138A63] tracking-tight">
              {orderOverview.completed}
            </div>
            <div className="text-[11px] text-[#777183] mt-1 font-medium">
              Fulfilled successfully
            </div>
          </div>

          <div className="rounded-xl border border-[#E9E5EE] bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-[#777183] uppercase tracking-wider">
                Active In-Progress
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25">
                <Clock className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-2xl lg:text-[26px] font-black text-[#7138E8] tracking-tight">
              {orderOverview.inProgress}
            </div>
            <div className="text-[11px] text-[#777183] mt-1 font-medium">
              In kitchen preparation / queue
            </div>
          </div>

          <div className="rounded-xl border border-[#E9E5EE] bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-[#777183] uppercase tracking-wider">
                Total Order Value
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-2xl lg:text-[26px] font-black text-[#7138E8] tracking-tight">
              {formatETB(orderOverview.volumeCents)}
            </div>
            <div className="text-[11px] text-[#777183] mt-1 font-medium">
              Gross orders volume (excl. cancelled)
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------------
            SECTION 7: SEARCH AND FILTERING TOOLBAR
        --------------------------------------------------------------------- */}
        <div className="rounded-2xl border border-[#E9E5EE] bg-white p-4 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#777183]" />
              <input
                type="text"
                placeholder="Search by order ID or customer..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-[#E9E5EE] bg-[#F8F7FA] pl-10 pr-9 py-2 text-xs text-[#211D2B] placeholder:text-[#777183] focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-2.5 text-[#777183] hover:text-[#211D2B] cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Order Status */}
              <div className="flex items-center gap-1.5 text-[#777183]">
                <span className="font-semibold text-[11px]">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-[#E9E5EE] bg-[#F8F7FA] px-2.5 py-2 text-xs font-semibold text-[#211D2B] focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value={OrderStatus.PENDING}>Pending</option>
                  <option value={OrderStatus.CONFIRMED}>Confirmed</option>
                  <option value={OrderStatus.IN_PREPARATION}>In Preparation</option>
                  <option value={OrderStatus.READY_FOR_PICKUP}>Ready for Pickup</option>
                  <option value={OrderStatus.COMPLETED}>Completed</option>
                  <option value={OrderStatus.CANCELLED}>Cancelled</option>
                </select>
              </div>

              {/* Payment Status */}
              <div className="flex items-center gap-1.5 text-[#777183]">
                <span className="font-semibold text-[11px]">Payment:</span>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => {
                    setPaymentStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-[#E9E5EE] bg-[#F8F7FA] px-2.5 py-2 text-xs font-semibold text-[#211D2B] focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="ALL">All Payments</option>
                  <option value="SUCCESS">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="REFUNDED">Refunded</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-1.5 text-[#777183]">
                <span className="font-semibold text-[11px]">Date:</span>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => {
                    setDateRangeFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-[#E9E5EE] bg-[#F8F7FA] px-2.5 py-2 text-xs font-semibold text-[#211D2B] focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="YESTERDAY">Yesterday</option>
                  <option value="7DAYS">Last 7 Days</option>
                  <option value="30DAYS">Last 30 Days</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1.5 text-[#777183]">
                <span className="font-semibold text-[11px]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-xl border border-[#E9E5EE] bg-[#F8F7FA] px-2.5 py-2 text-xs font-semibold text-[#211D2B] focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="NEWEST">Newest First</option>
                  <option value="OLDEST">Oldest First</option>
                  <option value="TOTAL_DESC">Total (High-Low)</option>
                  <option value="TOTAL_ASC">Total (Low-High)</option>
                </select>
              </div>

              {/* Reset Filter button */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#E9E5EE] bg-white px-2.5 py-2 text-xs font-bold text-[#7138E8] hover:bg-[#F3EEFC] transition-colors cursor-pointer"
                  title="Clear all filters"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------------
            SECTION 8: MAIN ORDER TABLE
        --------------------------------------------------------------------- */}
        <div className="rounded-2xl border border-[#E9E5EE] bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E9E5EE] bg-[#F8F7FC] text-[11px] font-bold text-[#777183] uppercase tracking-wider">
                  <th className="py-3.5 px-6">Order</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Date &amp; Time</th>
                  <th className="py-3.5 px-6 text-center">Items</th>
                  <th className="py-3.5 px-6 text-right">Total</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E5EE]">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-4 px-6">
                        <div className="h-4 w-24 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-4 w-32 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-4 w-28 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="h-4 w-12 bg-slate-200 rounded mx-auto" />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="h-4 w-20 bg-slate-200 rounded ml-auto" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-4 w-20 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-5 w-24 bg-slate-200 rounded-full" />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="h-7 w-20 bg-slate-200 rounded-lg ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : sortedOrders.length > 0 ? (
                  sortedOrders.map((ord) => {
                    const statusBadge = getStatusBadge(ord.status);
                    const paymentBadge = getPaymentBadge(
                      ord.payment?.status || ord.payments?.[0]?.status,
                      ord.payment?.provider || ord.payments?.[0]?.provider,
                    );
                    const itemCount = ord.itemCount || ord.items?.reduce((s, it) => s + it.quantity, 0) || 0;
                    const customerName = ord.customer?.fullName || (user && ord.userId === user.id ? user.fullName : 'Walk-in Customer');

                    return (
                      <tr
                        key={ord.id}
                        className="hover:bg-[#F8F7FA]/80 transition-colors cursor-pointer group"
                        onClick={() => setSelectedOrder(ord)}
                      >
                        {/* Order Number */}
                        <td className="py-3.5 px-6 font-mono font-bold text-[#211D2B]">
                          <span className="group-hover:text-[#7138E8] transition-colors">
                            #{ord.orderNumber}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F3EEFC] text-[10px] font-bold text-[#7138E8]">
                              {customerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-[#211D2B]">{customerName}</div>
                              {ord.customer?.email && (
                                <div className="text-[10px] text-[#777183] truncate max-w-[140px]">
                                  {ord.customer.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-6 text-[#777183]">
                          <div>{formatDateTime(ord.createdAt)}</div>
                        </td>

                        {/* Items Count */}
                        <td className="py-3.5 px-6 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-[#211D2B] bg-[#F8F7FA] px-2 py-0.5 rounded-md border border-[#E9E5EE]">
                            <span>{itemCount}</span>
                            <span className="text-[10px] text-[#777183]">units</span>
                          </span>
                        </td>

                        {/* Total */}
                        <td className="py-3.5 px-6 text-right font-black text-[#211D2B]">
                          {formatETB(ord.totalCents)}
                        </td>

                        {/* Payment */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#211D2B]">{paymentBadge.provider}</span>
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border ${paymentBadge.statusClass}`}
                            >
                              <span className={`h-1 w-1 rounded-full ${paymentBadge.dotClass}`} />
                              <span>{paymentBadge.statusLabel}</span>
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusBadge.badgeClass}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotClass}`} />
                            <span>{statusBadge.label}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-6 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedOrder(ord)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E9E5EE] bg-white px-2.5 py-1 text-xs font-bold text-[#211D2B] hover:bg-[#F3EEFC] hover:text-[#7138E8] hover:border-[#7138E8]/40 transition-colors cursor-pointer"
                              title="View Order Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Details</span>
                            </button>

                            <button
                              onClick={() => handlePrintReceipt(ord)}
                              className="p-1 rounded-lg border border-[#E9E5EE] bg-white text-[#777183] hover:text-[#211D2B] hover:bg-[#F8F7FA] transition-colors cursor-pointer"
                              title="Print Receipt"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : hasActiveFilters ? (
                  /* No matching filters state */
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="max-w-sm mx-auto space-y-2">
                        <SlidersHorizontal className="h-8 w-8 text-[#777183]/50 mx-auto" />
                        <h3 className="text-sm font-bold text-[#211D2B]">No orders match your filters</h3>
                        <p className="text-xs text-[#777183]">
                          Try adjusting your search criteria, order status, or selected date range.
                        </p>
                        <button
                          onClick={resetFilters}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#7138E8] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#5E2BC5] transition-colors cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Clear filters</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* Genuinely empty state */
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="max-w-sm mx-auto space-y-2">
                        <ShoppingBag className="h-8 w-8 text-[#777183]/50 mx-auto" />
                        <h3 className="text-sm font-bold text-[#211D2B]">No orders yet</h3>
                        <p className="text-xs text-[#777183]">
                          Orders will appear here as soon as customers place them.
                        </p>
                        <Link to="/">
                          <button className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#7138E8] text-white px-3.5 py-1.5 text-xs font-bold hover:bg-[#5E2BC5] transition-colors cursor-pointer">
                            <Coffee className="h-3.5 w-3.5" />
                            <span>Browse Coffee Menu</span>
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ---------------------------------------------------------------------
              SECTION 11: PAGINATION AND TABLE FOOTER
          --------------------------------------------------------------------- */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#E9E5EE] bg-white text-xs">
            {/* Result Summary */}
            <div className="text-[#777183]">
              Showing{' '}
              <span className="font-bold text-[#211D2B]">
                {totalOrders === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>
              –
              <span className="font-bold text-[#211D2B]">
                {Math.min(currentPage * pageSize, totalOrders)}
              </span>{' '}
              of <span className="font-bold text-[#211D2B]">{totalOrders}</span> orders
            </div>

            {/* Right: Page Size Selector & Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[#777183]">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-[#E9E5EE] bg-[#F8F7FA] px-2 py-1 text-xs text-[#211D2B] font-semibold focus:outline-none cursor-pointer"
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
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E9E5EE] text-[#777183] hover:bg-[#F8F7FA] hover:text-[#211D2B] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let pageNum = idx + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + idx;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - idx);
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-[#7138E8] text-white shadow-2xs'
                          : 'border border-[#E9E5EE] text-[#777183] hover:bg-[#F8F7FA] hover:text-[#211D2B]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E9E5EE] text-[#777183] hover:bg-[#F8F7FA] hover:text-[#211D2B] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  aria-label="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          SECTION 9: ORDER DETAILS MODAL (DECENT & SIMPLE DIALOG)
      --------------------------------------------------------------------- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          {/* Clean Backdrop */}
          <div
            className="fixed inset-0 bg-[#0F0A1C]/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedOrder(null)}
            aria-hidden="true"
          />

          {/* Decent, Simple Modal Card */}
          <div className="relative w-full max-w-xl max-h-[88vh] bg-white rounded-2xl shadow-xl border border-[#E9E5EE] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#E9E5EE] flex items-center justify-between bg-white shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold text-[#211D2B]">
                    Order #{selectedOrder.orderNumber}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      getStatusBadge(selectedOrder.status).badgeClass
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${getStatusBadge(selectedOrder.status).dotClass}`} />
                    <span>{getStatusBadge(selectedOrder.status).label}</span>
                  </span>
                </div>
                <div className="text-xs text-[#777183] mt-0.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#777183]" />
                  <span>Placed {formatDateTime(selectedOrder.createdAt)}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-[#777183] hover:text-[#211D2B] hover:bg-[#F8F7FA] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs scrollbar-thin">
              {/* Staff / Admin Workflow Action */}
              {isStaffOrAdmin && VALID_TRANSITIONS[selectedOrder.status]?.length > 0 && (
                <div className="rounded-xl border border-[#7138E8]/20 bg-[#F3EEFC]/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#7138E8] uppercase tracking-wider">
                    <span>Workflow Action</span>
                    <span className="text-[10px] text-[#777183] normal-case font-normal">Next valid state</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {VALID_TRANSITIONS[selectedOrder.status]
                      .filter((s) => s !== OrderStatus.CANCELLED)
                      .map((nextStatus) => {
                        const badge = getStatusBadge(nextStatus);
                        return (
                          <button
                            key={nextStatus}
                            onClick={() => handleTransitionStatus(selectedOrder.id, nextStatus)}
                            disabled={isUpdatingStatus}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7138E8] hover:bg-[#5E2BC5] text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <span>Advance to {badge.label}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Customer & Payment Summary Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#E9E5EE] bg-[#F8F7FA] p-3 space-y-1">
                  <div className="text-[10px] font-bold text-[#777183] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3 w-3 text-[#7138E8]" />
                    <span>Customer</span>
                  </div>
                  <div className="font-bold text-[#211D2B] text-xs truncate">
                    {selectedOrder.customer?.fullName || 'Walk-in Guest'}
                  </div>
                  <div className="text-[11px] text-[#777183] truncate">
                    {selectedOrder.customer?.phoneNumber || selectedOrder.customer?.email || 'No contact provided'}
                  </div>
                </div>

                <div className="rounded-xl border border-[#E9E5EE] bg-[#F8F7FA] p-3 space-y-1">
                  <div className="text-[10px] font-bold text-[#777183] uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="h-3 w-3 text-[#7138E8]" />
                    <span>Payment</span>
                  </div>
                  <div className="font-bold text-[#211D2B] text-xs">
                    {selectedOrder.payment?.provider === 'CHAPA'
                      ? 'Chapa'
                      : selectedOrder.payment?.provider === 'CASH_ON_PICKUP'
                      ? 'Cash on Pickup'
                      : selectedOrder.payment?.provider || 'Direct / POS'}
                  </div>
                  <div className="text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        selectedOrder.payment?.status === 'SUCCESS' || selectedOrder.payment?.status === 'PAID'
                          ? 'text-[#138A63]'
                          : 'text-[#B7791F]'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          selectedOrder.payment?.status === 'SUCCESS' || selectedOrder.payment?.status === 'PAID'
                            ? 'bg-[#138A63]'
                            : 'bg-[#B7791F]'
                        }`}
                      />
                      <span>{selectedOrder.payment?.status || 'PENDING'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Ordered List */}
              <div className="rounded-xl border border-[#E9E5EE] bg-white overflow-hidden">
                <div className="px-3.5 py-2.5 bg-[#FAF9FD] border-b border-[#E9E5EE] flex items-center justify-between text-[11px] font-bold text-[#777183] uppercase tracking-wider">
                  <span>Items Ordered ({selectedOrder.items?.reduce((s, it) => s + it.quantity, 0) || 0})</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-[#E9E5EE]/70 px-3.5">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-[#211D2B] text-xs truncate">
                          {item.productName}
                        </div>
                        <div className="text-[11px] text-[#777183]">
                          {item.quantity} &times; {formatETB(item.unitPriceCents)}
                        </div>
                      </div>
                      <div className="font-bold text-[#211D2B] text-xs shrink-0">
                        {formatETB(item.lineTotalCents)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              {selectedOrder.customerNotes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-1">
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    <span>Special Instructions</span>
                  </div>
                  <p className="text-xs text-amber-950 italic">
                    &ldquo;{selectedOrder.customerNotes}&rdquo;
                  </p>
                </div>
              )}

              {/* Financial Summary */}
              <div className="rounded-xl border border-[#E9E5EE] bg-[#FAF9FD] p-3.5 space-y-1.5">
                <div className="flex justify-between text-xs text-[#777183]">
                  <span>Subtotal</span>
                  <span className="font-medium text-[#211D2B]">{formatETB(selectedOrder.subtotalCents)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#777183]">
                  <span>Tax (VAT 15%)</span>
                  <span className="font-medium text-[#211D2B]">{formatETB(selectedOrder.taxCents)}</span>
                </div>
                <div className="pt-2 border-t border-[#E9E5EE] flex justify-between items-center text-sm font-extrabold text-[#211D2B]">
                  <span>Total Due</span>
                  <span className="text-[#7138E8]">{formatETB(selectedOrder.totalCents)}</span>
                </div>
              </div>

              {/* Status History */}
              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <div className="rounded-xl border border-[#E9E5EE] bg-white p-3.5 space-y-2">
                  <div className="text-[10px] font-bold text-[#777183] uppercase tracking-wider">
                    Status History
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-[#E9E5EE]">
                    {selectedOrder.statusHistory.map((sh, idx) => (
                      <div key={idx} className="pl-2 relative">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-[#211D2B] text-xs">
                            {getStatusBadge(sh.toStatus).label}
                          </span>
                          <span className="text-[10px] text-[#777183]">
                            {formatDateTime(sh.createdAt)}
                          </span>
                        </div>
                        {sh.reason && (
                          <div className="text-[11px] text-[#777183] italic">
                            &ldquo;{sh.reason}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3.5 border-t border-[#E9E5EE] bg-[#FAF9FD] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <Link
                to={`/orders/${selectedOrder.id}/track`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7138E8] hover:underline"
              >
                <span>Live Track View</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              <div className="flex items-center gap-2">
                {VALID_TRANSITIONS[selectedOrder.status]?.includes(OrderStatus.CANCELLED) && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="rounded-lg border border-[#FAC7CB] bg-[#FDEDEE] hover:bg-[#FCD8DB] text-[#C24141] font-semibold px-3 py-1.5 text-xs transition-colors cursor-pointer"
                  >
                    Cancel Order
                  </button>
                )}

                <button
                  onClick={() => handlePrintReceipt(selectedOrder)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E9E5EE] bg-white hover:bg-[#F8F7FA] text-[#211D2B] font-semibold px-3 py-1.5 text-xs transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-[#777183]" />
                  <span>Print Receipt</span>
                </button>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg bg-[#211D2B] hover:bg-[#342F42] text-white font-semibold px-3.5 py-1.5 text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {showCancelConfirm && selectedOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#E9E5EE] space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-[#C24141]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDEDEE]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#211D2B]">Cancel Order #{selectedOrder.orderNumber}</h3>
                <p className="text-xs text-[#777183]">This will restore inventory stock to catalog.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#211D2B]">Reason for Cancellation:</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer change of mind, incorrect items selected..."
                className="w-full rounded-xl border border-[#E9E5EE] bg-[#F8F7FA] p-2.5 text-xs text-[#211D2B] focus:border-[#7138E8] focus:bg-white focus:outline-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancellingOrder}
                className="rounded-xl border border-[#E9E5EE] bg-white px-3.5 py-2 text-xs font-bold text-[#211D2B] hover:bg-[#F8F7FA] transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isCancellingOrder}
                className="rounded-xl bg-[#C24141] hover:bg-[#AA3636] text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCancellingOrder ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
