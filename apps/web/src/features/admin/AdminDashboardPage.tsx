import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Coffee,
  Package,
  TrendingUp,
  FileText,
  Plus,
  RefreshCw,
  Edit2,
  ChefHat,
  AlertTriangle,
  Search,
  CheckCircle2,
  ArrowRight,
  SlidersHorizontal,
  Zap,
  ShoppingBag,
  Server,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  X,
  Eye,
  RotateCcw,
  Shield,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Calendar,
  User as UserIcon,
  Clock,
} from 'lucide-react';
import {
  Product,
  Category,
  InventoryItem,
  SalesReport,
  AuditEventItem,
  StockMovementReason,
  PaginatedResult,
} from '../../types/api';
import { apiRequest } from '../../lib/api-client';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import heroCoffeeImage from '../../assets/brew-bean-latte.jpg';

type AdminTab = 'overview' | 'products' | 'inventory' | 'sales' | 'audit';

// Fallback Product Thumbnail with Error Handling
const ProductThumbnail: React.FC<{ imageUrl?: string | null; name: string }> = ({
  imageUrl,
  name,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!imageUrl || hasError) {
    return (
      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#F2ECFC] text-[#7138E8] border border-[#7138E8]/20 shadow-xs"
        title={name}
      >
        <Coffee className="h-5 w-5" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      onError={() => setHasError(true)}
      className="h-12 w-12 flex-shrink-0 rounded-xl object-cover border border-[#E9E5F0] shadow-xs"
    />
  );
};

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as AdminTab;
  const activeTab: AdminTab = ['overview', 'products', 'inventory', 'sales', 'audit'].includes(
    tabParam,
  )
    ? tabParam
    : 'overview';

  const setActiveTab = (tab: AdminTab) => {
    setSearchParams({ tab });
  };

  const [_isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state for Products
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [productStatusFilter, setProductStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Inventory & Chart State
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('ALL');
  const [inventoryHealthFilter, setInventoryHealthFilter] = useState<
    'ALL' | 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  >('ALL');
  const [inventoryLowStockOnly, setInventoryLowStockOnly] = useState(false);
  const [inventoryCurrentPage, setInventoryCurrentPage] = useState<number>(1);
  const [inventoryPageSize, setInventoryPageSize] = useState<number>(10);
  const [chartPeriod, setChartPeriod] = useState<'7days' | '30days'>('7days');

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductPriceCents, setNewProductPriceCents] = useState(450);
  const [newProductCategoryId, setNewProductCategoryId] = useState('');
  const [newProductStock, setNewProductStock] = useState(25);
  const [newProductImageUrl, setNewProductImageUrl] = useState('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Edit Product State
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductDesc, setEditProductDesc] = useState('');
  const [editProductPriceCents, setEditProductPriceCents] = useState(0);
  const [editProductCategoryId, setEditProductCategoryId] = useState('');
  const [editProductImageUrl, setEditProductImageUrl] = useState('');
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);

  // Product Row Overflow & Details Modal State
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Inventory State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState<number>(10);
  const [adjustmentReason, setAdjustmentReason] = useState<StockMovementReason>(
    StockMovementReason.RESTOCK_PURCHASE,
  );
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);

  // Sales Report State & Filters
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [salesDateRange, setSalesDateRange] = useState<
    'TODAY' | 'YESTERDAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'
  >('30DAYS');
  const [salesCustomStartDate, setSalesCustomStartDate] = useState<string>('');
  const [salesCustomEndDate, setSalesCustomEndDate] = useState<string>('');
  const [isSalesRefreshing, setIsSalesRefreshing] = useState<boolean>(false);
  const [salesProductSearch, setSalesProductSearch] = useState<string>('');
  const [salesCategoryFilter, setSalesCategoryFilter] = useState<string>('ALL');
  const [hoveredChartPoint, setHoveredChartPoint] = useState<{
    date: string;
    label: string;
    revenueCents: number;
    orderCount: number;
    x: number;
    y: number;
  } | null>(null);

  // Audit Events State & Controls
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [auditTotalEvents, setAuditTotalEvents] = useState<number>(0);
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>('ALL');
  const [auditActorFilter, setAuditActorFilter] = useState<string>('ALL');
  const [auditDateFilter, setAuditDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  const [auditCurrentPage, setAuditCurrentPage] = useState<number>(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(20);
  const [selectedAuditEvent, setSelectedAuditEvent] = useState<AuditEventItem | null>(null);
  const [isAuditRefreshing, setIsAuditRefreshing] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  // Health state
  const [_healthInfo, setHealthInfo] = useState<{ status: string; database: string } | null>(null);

  // Ethiopian Birr consistent financial number formatter
  const formatETB = useCallback((cents: number | undefined | null) => {
    if (cents === undefined || cents === null || isNaN(cents)) return 'ETB 0.00';
    const val = cents / 100;
    return `ETB ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, []);

  // Reporting Date Range Boundary Calculator
  const getDateRangeBounds = useCallback(
    (preset: string, customStart?: string, customEnd?: string) => {
      const now = new Date();
      if (preset === 'TODAY') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        return { startDate: start.toISOString(), endDate: now.toISOString(), label: 'Today' };
      }
      if (preset === 'YESTERDAY') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString(), label: 'Yesterday' };
      }
      if (preset === '7DAYS') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { startDate: start.toISOString(), endDate: now.toISOString(), label: 'Last 7 Days' };
      }
      if (preset === '30DAYS') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { startDate: start.toISOString(), endDate: now.toISOString(), label: 'Last 30 Days' };
      }
      if (preset === 'THIS_MONTH') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return { startDate: start.toISOString(), endDate: now.toISOString(), label: 'This Month' };
      }
      if (preset === 'CUSTOM' && customStart && customEnd) {
        return {
          startDate: new Date(customStart).toISOString(),
          endDate: new Date(customEnd).toISOString(),
          label: `${customStart} to ${customEnd}`,
        };
      }
      return { startDate: undefined, endDate: undefined, label: 'All Time' };
    },
    [],
  );

  // Dedicated Sales Report Retrieval
  const fetchSalesReport = useCallback(
    async (preset?: string, customStart?: string, customEnd?: string) => {
      setIsSalesRefreshing(true);
      try {
        const bounds = getDateRangeBounds(
          preset ?? salesDateRange,
          customStart ?? salesCustomStartDate,
          customEnd ?? salesCustomEndDate,
        );
        const queryParams = new URLSearchParams();
        if (bounds.startDate) queryParams.set('startDate', bounds.startDate);
        if (bounds.endDate) queryParams.set('endDate', bounds.endDate);
        const url = `/admin/reports/sales${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const report = await apiRequest<SalesReport>(url);
        setSalesReport(report);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load sales report');
      } finally {
        setIsSalesRefreshing(false);
      }
    },
    [salesDateRange, salesCustomStartDate, salesCustomEndDate, getDateRangeBounds],
  );

  const loadTabData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'overview') {
        const [salesRes, invRes, auditRes, catRes, healthRes] = await Promise.all([
          apiRequest<SalesReport>('/admin/reports/sales').catch(() => null),
          apiRequest<InventoryItem[]>('/admin/inventory').catch(() => []),
          apiRequest<PaginatedResult<AuditEventItem>>('/admin/audit-events?limit=8').catch(() => ({
            data: [],
            meta: {
              total: 0,
              page: 1,
              limit: 8,
              totalPages: 0,
              hasNextPage: false,
              hasPrevPage: false,
            },
          })),
          apiRequest<Category[]>('/categories').catch(() => []),
          apiRequest<{ status: string; checks?: { database: string } }>('/health/ready').catch(
            () => null,
          ),
        ]);
        if (salesRes) setSalesReport(salesRes);
        setInventory(invRes || []);
        setAuditEvents(auditRes.data || []);
        setAuditTotalEvents(auditRes.meta?.total || (auditRes.data ? auditRes.data.length : 0));
        setCategories(catRes || []);
        if (catRes.length > 0 && !newProductCategoryId) {
          setNewProductCategoryId(catRes[0].id);
        }
        if (healthRes) {
          setHealthInfo({
            status: healthRes.status,
            database: healthRes.checks?.database || 'connected',
          });
        }
      } else if (activeTab === 'products') {
        const [prodRes, catRes] = await Promise.all([
          apiRequest<PaginatedResult<Product>>('/products?limit=100'),
          apiRequest<Category[]>('/categories'),
        ]);
        setProducts(prodRes.data || []);
        setCategories(catRes || []);
        if (catRes.length > 0 && !newProductCategoryId) {
          setNewProductCategoryId(catRes[0].id);
        }
      } else if (activeTab === 'inventory') {
        const invRes = await apiRequest<InventoryItem[]>('/admin/inventory');
        setInventory(invRes || []);
      } else if (activeTab === 'sales') {
        await fetchSalesReport();
      } else if (activeTab === 'audit') {
        const auditRes = await apiRequest<PaginatedResult<AuditEventItem>>(
          '/admin/audit-events?limit=100',
        );
        setAuditEvents(auditRes.data || []);
        setAuditTotalEvents(auditRes.meta?.total || (auditRes.data ? auditRes.data.length : 0));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load administrative data');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, newProductCategoryId, fetchSalesReport]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  // Handle Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingProduct(true);
    setError(null);
    try {
      await apiRequest('/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          name: newProductName,
          description: newProductDesc,
          basePriceCents: Number(newProductPriceCents),
          categoryId: newProductCategoryId,
          initialQuantity: Number(newProductStock),
          imageUrl: newProductImageUrl || undefined,
        }),
      });
      setIsAddProductModalOpen(false);
      setNewProductName('');
      setNewProductDesc('');
      setNewProductImageUrl('');
      await loadTabData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Open Edit Product Modal
  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditProductName(p.name);
    setEditProductDesc(p.description || '');
    setEditProductPriceCents(p.basePriceCents);
    setEditProductCategoryId(p.category.id);
    setEditProductImageUrl(p.imageUrl || '');
    setIsEditProductModalOpen(true);
  };

  // Handle Update Product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsUpdatingProduct(true);
    setError(null);
    try {
      await apiRequest(`/admin/products/${editingProduct.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editProductName,
          description: editProductDesc,
          basePriceCents: Number(editProductPriceCents),
          categoryId: editProductCategoryId,
          imageUrl: editProductImageUrl || undefined,
        }),
      });
      setIsEditProductModalOpen(false);
      setEditingProduct(null);
      await loadTabData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  // Handle Adjust Stock
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryItem) return;
    setIsAdjustingStock(true);
    setError(null);
    try {
      await apiRequest('/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedInventoryItem.productId,
          quantityDelta: Number(adjustmentDelta),
          reason: adjustmentReason,
          notes: adjustmentNotes || undefined,
        }),
      });
      setIsAdjustStockModalOpen(false);
      setSelectedInventoryItem(null);
      setAdjustmentNotes('');
      await loadTabData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to adjust stock');
    } finally {
      setIsAdjustingStock(false);
    }
  };

  const lowStockItems = useMemo(
    () => inventory.filter((item) => item.isLowStock || item.quantity <= item.lowStockThreshold),
    [inventory],
  );

  // Open Adjust Stock for a specific product from table row
  const openAdjustStockForProduct = useCallback(
    (p: Product) => {
      const existing = inventory.find((i) => i.productId === p.id);
      if (existing) {
        setSelectedInventoryItem(existing);
      } else {
        setSelectedInventoryItem({
          id: `inv-${p.id}`,
          productId: p.id,
          quantity: p.inventory?.availableQuantity ?? 0,
          lowStockThreshold: 15,
          isLowStock: (p.inventory?.availableQuantity ?? 0) <= 15,
          updatedAt: p.createdAt,
          product: p,
        });
      }
      setAdjustmentDelta(10);
      setAdjustmentReason(StockMovementReason.RESTOCK_PURCHASE);
      setAdjustmentNotes(`Restock for ${p.name}`);
      setIsAdjustStockModalOpen(true);
      setOpenActionMenuId(null);
    },
    [inventory],
  );

  // Status helper according to Section 8 of Master Prompt
  const getProductStockStatus = useCallback((p: Product) => {
    const qty = p.inventory?.availableQuantity ?? 0;
    const threshold = 15;
    if (qty <= 0) {
      return {
        key: 'OUT_OF_STOCK',
        label: 'Out of Stock',
        badgeClass: 'bg-[#FDF2F2] text-[#C43D4B] border-[#FBD5D5]',
        dotClass: 'bg-[#C43D4B]',
      };
    }
    if (qty <= threshold) {
      return {
        key: 'LOW_STOCK',
        label: 'Low Stock',
        badgeClass: 'bg-[#FEF7EC] text-[#F0A020] border-[#FDE6B8]',
        dotClass: 'bg-[#F0A020]',
      };
    }
    return {
      key: 'IN_STOCK',
      label: 'In Stock',
      badgeClass: 'bg-[#EDF8F4] text-[#10A87A] border-[#B7EBD8]',
      dotClass: 'bg-[#10A87A]',
    };
  }, []);

  // Filtered Products with Category and Stock Status
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase())) ||
        p.category.name.toLowerCase().includes(productSearch.toLowerCase());

      const matchesCat =
        productCategoryFilter === 'ALL' || p.category.id === productCategoryFilter;

      const stockStatus = getProductStockStatus(p);
      const matchesStatus =
        productStatusFilter === 'ALL' || stockStatus.key === productStatusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, productSearch, productCategoryFilter, productStatusFilter, getProductStockStatus]);

  // Pagination calculations
  const totalFiltered = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Inventory Summary Indicators (Calculated from real inventory records)
  const inventoryMetrics = useMemo(() => {
    let healthyCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const item of inventory) {
      if (item.quantity === 0) {
        outOfStockCount++;
      } else if (item.quantity <= item.lowStockThreshold || item.isLowStock) {
        lowStockCount++;
      } else {
        healthyCount++;
      }
    }

    return {
      total: inventory.length,
      healthy: healthyCount,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
    };
  }, [inventory]);

  // Distinct categories available in inventory
  const inventoryCategoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of inventory) {
      if (item.product?.category) {
        map.set(item.product.category.id, item.product.category.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [inventory]);

  // Stock health badge configuration helper
  const getStockHealthConfig = (quantity: number, threshold: number) => {
    if (quantity === 0) {
      return {
        label: 'Out of Stock',
        badgeClass: 'border-[#FAC7CB] bg-[#FDEDEE] text-[#C43D4B]',
        dotClass: 'bg-[#C43D4B]',
      };
    }
    if (quantity <= threshold) {
      return {
        label: 'Low Stock',
        badgeClass: 'border-[#FDE8C8] bg-[#FEF7EC] text-[#D99016]',
        dotClass: 'bg-[#D99016]',
      };
    }
    return {
      label: 'Healthy',
      badgeClass: 'border-[#B7EBD8] bg-[#EDF8F4] text-[#10A87A]',
      dotClass: 'bg-[#10A87A]',
    };
  };

  // Filtered Inventory with multi-criteria operational search
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      // 1. Search filter
      const q = inventorySearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.product.name.toLowerCase().includes(q) ||
        item.product.category.name.toLowerCase().includes(q) ||
        item.product.slug.toLowerCase().includes(q) ||
        (item.product.description && item.product.description.toLowerCase().includes(q));

      // 2. Category filter
      const matchesCategory =
        inventoryCategoryFilter === 'ALL' ||
        item.product.category.id === inventoryCategoryFilter ||
        item.product.category.name === inventoryCategoryFilter;

      // 3. Health status filter
      let matchesHealth = true;
      if (inventoryHealthFilter === 'HEALTHY') {
        matchesHealth = item.quantity > item.lowStockThreshold;
      } else if (inventoryHealthFilter === 'LOW_STOCK') {
        matchesHealth = item.quantity > 0 && item.quantity <= item.lowStockThreshold;
      } else if (inventoryHealthFilter === 'OUT_OF_STOCK') {
        matchesHealth = item.quantity === 0;
      }

      // 4. Low stock shortcut toggle
      const matchesLowStockShortcut =
        !inventoryLowStockOnly || item.quantity <= item.lowStockThreshold || item.isLowStock;

      return matchesSearch && matchesCategory && matchesHealth && matchesLowStockShortcut;
    });
  }, [
    inventory,
    inventorySearch,
    inventoryCategoryFilter,
    inventoryHealthFilter,
    inventoryLowStockOnly,
  ]);

  const totalFilteredInventory = filteredInventory.length;
  const totalInventoryPages = Math.max(1, Math.ceil(totalFilteredInventory / inventoryPageSize));
  const paginatedInventory = useMemo(() => {
    const start = (inventoryCurrentPage - 1) * inventoryPageSize;
    return filteredInventory.slice(start, start + inventoryPageSize);
  }, [filteredInventory, inventoryCurrentPage, inventoryPageSize]);

  const firstName = user?.fullName ? user.fullName.split(' ')[0].toUpperCase() : 'SARA';

  // Last 7 days dates for chart labels
  const last7DaysLabels = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const result: string[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay() === 0 ? 6 : d.getDay() - 1];
      result.push(`${dayName} ${d.getDate()}`);
    }
    return result;
  }, []);

  // Filtered Top Selling Products for Sales tab
  const filteredTopProducts = useMemo(() => {
    if (!salesReport?.topProducts) return [];
    return salesReport.topProducts.filter((p) => {
      const q = salesProductSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q));
      const matchesCategory =
        salesCategoryFilter === 'ALL' ||
        (p.categoryName && p.categoryName.toLowerCase() === salesCategoryFilter.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [salesReport, salesProductSearch, salesCategoryFilter]);

  // Distinct Categories in Sales Report
  const salesCategoryOptions = useMemo(() => {
    if (!salesReport?.categoryBreakdown) return [];
    return salesReport.categoryBreakdown.map((c) => c.name);
  }, [salesReport]);

  // Safe Financial CSV Exporter
  const handleExportSalesCSV = useCallback(() => {
    if (!salesReport) return;
    const { summary, topProducts, categoryBreakdown, recentSales } = salesReport;
    const bounds = getDateRangeBounds(salesDateRange, salesCustomStartDate, salesCustomEndDate);

    const sanitizeCsvCell = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    const lines: string[] = [];
    lines.push(`AKUFADA COFFEE ARTISANS — SALES & REVENUE REPORT`);
    lines.push(`Reporting Period,${sanitizeCsvCell(bounds.label)}`);
    lines.push(`Generated At,${sanitizeCsvCell(new Date().toISOString())}`);
    lines.push(``);

    // Summary Section
    lines.push(`EXECUTIVE FINANCIAL SUMMARY`);
    lines.push(
      `Gross Sales (ETB),Net Revenue (ETB),Completed Orders,Cancelled Orders,Average Order Value (ETB)`,
    );
    lines.push(
      [
        sanitizeCsvCell((summary.grossRevenueCents / 100).toFixed(2)),
        sanitizeCsvCell(((summary.netRevenueCents ?? summary.grossRevenueCents) / 100).toFixed(2)),
        summary.completedOrders,
        summary.cancelledOrders,
        sanitizeCsvCell((summary.averageOrderValueCents / 100).toFixed(2)),
      ].join(','),
    );
    lines.push(``);

    // Category Breakdown
    if (categoryBreakdown && categoryBreakdown.length > 0) {
      lines.push(`SALES BY CATEGORY`);
      lines.push(`Category,Units Sold,Revenue (ETB),Share (%)`);
      categoryBreakdown.forEach((cat) => {
        lines.push(
          [
            sanitizeCsvCell(cat.name),
            cat.unitsSold,
            sanitizeCsvCell((cat.revenueCents / 100).toFixed(2)),
            sanitizeCsvCell(`${cat.percentage}%`),
          ].join(','),
        );
      });
      lines.push(``);
    }

    // Top Selling Products
    if (topProducts && topProducts.length > 0) {
      lines.push(`TOP SELLING PRODUCTS`);
      lines.push(`Rank,Product Name,Category,Units Sold,Revenue (ETB),Share of Sales (%)`);
      topProducts.forEach((p, idx) => {
        lines.push(
          [
            idx + 1,
            sanitizeCsvCell(p.name),
            sanitizeCsvCell(p.categoryName || 'Beverages'),
            p.unitsSold,
            sanitizeCsvCell((p.revenueCents / 100).toFixed(2)),
            sanitizeCsvCell(`${p.shareOfSales ?? 0}%`),
          ].join(','),
        );
      });
      lines.push(``);
    }

    // Recent Sales
    if (recentSales && recentSales.length > 0) {
      lines.push(`RECENT TRANSACTIONS`);
      lines.push(`Order #,Date,Customer,Items,Total (ETB),Payment Method,Status`);
      recentSales.forEach((o) => {
        lines.push(
          [
            sanitizeCsvCell(o.orderNumber),
            sanitizeCsvCell(o.createdAt),
            sanitizeCsvCell(o.customerName),
            o.itemsCount,
            sanitizeCsvCell((o.totalCents / 100).toFixed(2)),
            sanitizeCsvCell(o.paymentMethod),
            sanitizeCsvCell(o.status),
          ].join(','),
        );
      });
    }

    const csvContent = lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `akufada-sales-report-${salesDateRange.toLowerCase()}-${dateStr}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [salesReport, salesDateRange, salesCustomStartDate, salesCustomEndDate, getDateRangeBounds]);

  // Audit Actions Human-Readable Mapping
  const formatAuditAction = useCallback((action: string) => {
    switch (action) {
      case 'PRODUCT_CREATED':
        return {
          label: 'Product Created',
          badgeClass: 'bg-[#EDF8F4] text-[#10A87A] border-[#B7EBD8]',
          dotClass: 'bg-[#10A87A]',
          category: 'Product',
        };
      case 'PRODUCT_PRICE_UPDATED':
        return {
          label: 'Price Updated',
          badgeClass: 'bg-[#F2ECFC] text-[#7138E8] border-[#7138E8]/30',
          dotClass: 'bg-[#7138E8]',
          category: 'Product',
        };
      case 'STOCK_ADJUSTED':
        return {
          label: 'Stock Adjusted',
          badgeClass: 'bg-[#FEF7EC] text-[#D99016] border-[#FDE6B8]',
          dotClass: 'bg-[#D99016]',
          category: 'Inventory',
        };
      case 'ORDER_CREATED':
        return {
          label: 'Order Created',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          dotClass: 'bg-blue-500',
          category: 'Order',
        };
      case 'ORDER_STATUS_UPDATED':
        return {
          label: 'Order Status Updated',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
          dotClass: 'bg-purple-500',
          category: 'Order',
        };
      default: {
        const cleanLabel = action
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        return {
          label: cleanLabel,
          badgeClass: 'bg-[#F8F7FC] text-[#77718B] border-[#E9E5F0]',
          dotClass: 'bg-[#77718B]',
          category: 'System',
        };
      }
    }
  }, []);

  // Distinct actors derived from real events
  const distinctActors = useMemo(() => {
    const actorMap = new Map<string, string>();
    for (const evt of auditEvents) {
      if (evt.actor?.name) {
        actorMap.set(evt.actor.name, evt.actor.name);
      } else if (evt.actor?.email) {
        actorMap.set(evt.actor.email, evt.actor.email);
      }
    }
    return Array.from(actorMap.values());
  }, [auditEvents]);

  // Distinct actions derived from real events
  const distinctActions = useMemo(() => {
    const actionSet = new Set<string>();
    for (const evt of auditEvents) {
      if (evt.action) {
        actionSet.add(evt.action);
      }
    }
    return Array.from(actionSet);
  }, [auditEvents]);

  // Distinct entities derived from real events
  const distinctEntities = useMemo(() => {
    const entitySet = new Set<string>();
    for (const evt of auditEvents) {
      if (evt.entityName) {
        entitySet.add(evt.entityName);
      }
    }
    return Array.from(entitySet);
  }, [auditEvents]);

  // Real Audit Summary Indicators
  const auditMetrics = useMemo(() => {
    let productEventsCount = 0;
    let inventoryEventsCount = 0;
    let orderEventsCount = 0;
    const actorsSet = new Set<string>();

    for (const evt of auditEvents) {
      if (evt.entityName === 'Product' || evt.action.startsWith('PRODUCT_')) {
        productEventsCount++;
      } else if (evt.entityName === 'Inventory' || evt.action.includes('STOCK')) {
        inventoryEventsCount++;
      } else if (evt.entityName === 'Order' || evt.action.startsWith('ORDER_')) {
        orderEventsCount++;
      }

      const actorKey = evt.actor?.email || evt.actor?.name || 'system';
      actorsSet.add(actorKey);
    }

    return {
      total: auditTotalEvents || auditEvents.length,
      productCount: productEventsCount,
      inventoryCount: inventoryEventsCount,
      orderCount: orderEventsCount,
      distinctActorsCount: actorsSet.size,
    };
  }, [auditEvents, auditTotalEvents]);

  // Real-time Filtering for Audit Events
  const filteredAuditEvents = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return auditEvents.filter((evt) => {
      // 1. Search filter
      if (auditSearch.trim()) {
        const query = auditSearch.toLowerCase();
        const matchesAction = evt.action.toLowerCase().includes(query);
        const matchesEntity = evt.entityName.toLowerCase().includes(query);
        const matchesEntityId = evt.entityId.toLowerCase().includes(query);
        const matchesActorName = evt.actor?.name?.toLowerCase().includes(query) ?? false;
        const matchesActorEmail = evt.actor?.email?.toLowerCase().includes(query) ?? false;
        const matchesActorRole = evt.actor?.role?.toLowerCase().includes(query) ?? false;
        const matchesOldVal = evt.oldValues ? JSON.stringify(evt.oldValues).toLowerCase().includes(query) : false;
        const matchesNewVal = evt.newValues ? JSON.stringify(evt.newValues).toLowerCase().includes(query) : false;
        if (
          !matchesAction &&
          !matchesEntity &&
          !matchesEntityId &&
          !matchesActorName &&
          !matchesActorEmail &&
          !matchesActorRole &&
          !matchesOldVal &&
          !matchesNewVal
        ) {
          return false;
        }
      }

      // 2. Action filter
      if (auditActionFilter !== 'ALL' && evt.action !== auditActionFilter) {
        return false;
      }

      // 3. Entity filter
      if (auditEntityFilter !== 'ALL' && evt.entityName !== auditEntityFilter) {
        return false;
      }

      // 4. Actor filter
      if (auditActorFilter !== 'ALL') {
        const actorName = evt.actor?.name || evt.actor?.email || 'System';
        if (actorName !== auditActorFilter) {
          return false;
        }
      }

      // 5. Date filter
      if (auditDateFilter !== 'ALL') {
        const eventTime = new Date(evt.createdAt).getTime();
        if (auditDateFilter === 'TODAY' && eventTime < todayStart) {
          return false;
        }
        if (auditDateFilter === '7DAYS' && eventTime < sevenDaysAgo) {
          return false;
        }
        if (auditDateFilter === '30DAYS' && eventTime < thirtyDaysAgo) {
          return false;
        }
      }

      return true;
    });
  }, [auditEvents, auditSearch, auditActionFilter, auditEntityFilter, auditActorFilter, auditDateFilter]);

  // Paginated Audit Events
  const totalFilteredAudit = filteredAuditEvents.length;
  const totalAuditPages = Math.max(1, Math.ceil(totalFilteredAudit / auditPageSize));
  const paginatedAuditEvents = useMemo(() => {
    const start = (auditCurrentPage - 1) * auditPageSize;
    return filteredAuditEvents.slice(start, start + auditPageSize);
  }, [filteredAuditEvents, auditCurrentPage, auditPageSize]);

  // Real Refresh Operation for Audit Trail
  const handleRefreshAudit = async () => {
    setIsAuditRefreshing(true);
    try {
      const auditRes = await apiRequest<PaginatedResult<AuditEventItem>>(
        '/admin/audit-events?limit=100',
      );
      setAuditEvents(auditRes.data || []);
      setAuditTotalEvents(auditRes.meta?.total || (auditRes.data ? auditRes.data.length : 0));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh audit logs');
    } finally {
      setIsAuditRefreshing(false);
    }
  };

  // Safe CSV Exporter (Formula-Injection Protected)
  const handleExportCsv = useCallback(() => {
    if (filteredAuditEvents.length === 0) return;

    const sanitizeCsvCell = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    const headers = [
      '#',
      'Event ID',
      'Timestamp (ISO)',
      'Timestamp (Local)',
      'Actor Name',
      'Actor Email',
      'Actor Role',
      'Action Code',
      'Action Label',
      'Resource Entity',
      'Resource ID',
      'Status',
      'IP Address',
      'User Agent',
      'Old Values',
      'New Values',
    ];

    const rows = filteredAuditEvents.map((evt, idx) => {
      const actionInfo = formatAuditAction(evt.action);
      return [
        sanitizeCsvCell(idx + 1),
        sanitizeCsvCell(evt.id),
        sanitizeCsvCell(evt.createdAt),
        sanitizeCsvCell(formatDateTime(evt.createdAt)),
        sanitizeCsvCell(evt.actor?.name || 'System'),
        sanitizeCsvCell(evt.actor?.email || 'system@akufada.local'),
        sanitizeCsvCell(evt.actor?.role || 'SYSTEM'),
        sanitizeCsvCell(evt.action),
        sanitizeCsvCell(actionInfo.label),
        sanitizeCsvCell(evt.entityName),
        sanitizeCsvCell(evt.entityId),
        sanitizeCsvCell('Success'),
        sanitizeCsvCell(evt.ipAddress || '—'),
        sanitizeCsvCell(evt.userAgent || '—'),
        sanitizeCsvCell(evt.oldValues ? JSON.stringify(evt.oldValues) : '—'),
        sanitizeCsvCell(evt.newValues ? JSON.stringify(evt.newValues) : '—'),
      ].join(',');
    });

    const csvContent = [headers.map(sanitizeCsvCell).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `akufada-audit-trail-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredAuditEvents, formatAuditAction]);

  return (
    <div className="min-h-screen bg-[#F8F7FC] text-[#19152A] py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full space-y-6">
        {error && (
          <Alert variant="error" title="Administrative Notice" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* =========================================================================
            SECTION 5: HERO BANNER (ONLY ON OVERVIEW TAB)
        ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1B0B33] via-[#220E3E] to-[#18092E] text-white shadow-sm border border-[#3A1E65]/50 min-h-[160px] sm:min-h-[170px] flex items-center">
            {/* Ambient subtle glow */}
            <div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-[#7138E8]/15 blur-3xl" />

            {/* Background Image Container with Extended Left-Overlay Blend */}
            <div className="absolute inset-y-0 right-0 w-full sm:w-3/4 lg:w-3/5 pointer-events-none overflow-hidden">
              <img
                src={heroCoffeeImage}
                alt="Ethiopian Specialty Coffee Latte Art"
                className="h-full w-full object-cover object-right lg:object-center opacity-80 filter brightness-[1.0] contrast-[1.05]"
              />
              {/* Lighter horizontal overlay extending smoothly to the left */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#1B0B33] via-[#1B0B33]/75 via-35% to-[#18092E]/25" />
              {/* Lighter vertical vignette for soft edge integration */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#18092E]/60 via-transparent to-[#1B0B33]/25" />
            </div>

            <div className="relative z-10 p-5 sm:p-6 lg:px-8 lg:py-5 max-w-2xl space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#E7C8A0]">
                WELCOME BACK, {firstName}
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-[25px] font-black text-white tracking-tight leading-snug">
                Good Coffee. Better Management.
              </h1>
              <p className="text-xs sm:text-[13px] text-[#D8CFEB] leading-relaxed max-w-lg font-normal">
                Track your orders, manage inventory, and keep your coffee shop running smoothly — all in one place.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
                <Link to="/orders">
                  <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#7138E8] hover:bg-[#5C25D4] text-white font-bold text-xs px-3.5 py-2 shadow-sm shadow-[#7138E8]/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
                    <span>View Orders</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
                <Link to="/">
                  <button className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white font-semibold text-xs px-3.5 py-2 border border-white/15 transition-all cursor-pointer hover:scale-[1.02]">
                    <Coffee className="h-3.5 w-3.5 text-[#E7C8A0]" />
                    <span>Explore Menu</span>
                  </button>
                </Link>
              </div>
            </div>

            <div className="hidden xl:flex items-center gap-2 absolute right-6 bottom-4 z-10 px-3 py-1.5 rounded-lg bg-white/[0.06] backdrop-blur-md border border-white/10 pointer-events-none">
              <span className="text-[11px] font-semibold text-white/90">
                Premium Ethiopian Coffee
              </span>
              <span className="text-white/30">•</span>
              <span className="text-[10px] text-[#E7C8A0] font-medium">
                Single Origin
              </span>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 6: KPI CARDS (ON OVERVIEW TAB)
        ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* KPI Card 1: Gross Revenue */}
            <div className="rounded-xl border border-[#E9E5F0] bg-white p-5 shadow-sm h-[145px] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#77718B] tracking-wider uppercase">
                  GROSS REVENUE
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-[#19152A] tracking-tight">
                  {formatCurrency(salesReport?.summary.grossRevenueCents ?? 0)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#77718B] mt-1">
                  <span>Avg. order: {formatCurrency(salesReport?.summary.averageOrderValueCents ?? 0)}</span>
                  <svg className="w-14 h-4 text-[#7138E8]" fill="none" viewBox="0 0 56 16">
                    <path
                      d="M2 14 L16 10 L30 12 L44 4 L54 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* KPI Card 2: Total Orders */}
            <div className="rounded-xl border border-[#E9E5F0] bg-white p-5 shadow-sm h-[145px] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#77718B] tracking-wider uppercase">
                  TOTAL ORDERS
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-[#19152A] tracking-tight">
                  {salesReport?.summary.totalOrders ?? 0}
                </div>
                <p className="text-[11px] text-[#10A87A] font-semibold mt-1">
                  {salesReport?.summary.completedOrders ?? 0} completed orders
                </p>
              </div>
            </div>

            {/* KPI Card 3: Inventory Health */}
            <div className="rounded-xl border border-[#E9E5F0] bg-white p-5 shadow-sm h-[145px] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#77718B] tracking-wider uppercase">
                  INVENTORY HEALTH
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25">
                  <Package className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-[#19152A] tracking-tight">
                    {inventory.length} SKUs
                  </span>
                </div>
                <p
                  className={`text-[11px] font-semibold mt-1 ${
                    lowStockItems.length > 0 ? 'text-[#F0A020]' : 'text-[#10A87A]'
                  }`}
                >
                  {lowStockItems.length > 0
                    ? `${lowStockItems.length} items low stock`
                    : 'All items healthy'}
                </p>
              </div>
            </div>

            {/* System Status Card: Database & API */}
            <div className="rounded-xl border border-[#E9E5F0] bg-white p-5 shadow-sm h-[145px] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#77718B] tracking-wider uppercase">
                  DATABASE &amp; API
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF8F4] border border-[#B7EBD8] text-[#10A87A]">
                  <Server className="h-5 w-5 text-[#10A87A]" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10A87A] animate-pulse" />
                  <span className="text-2xl font-black text-[#19152A] tracking-tight">Online</span>
                </div>
                <p className="text-[11px] text-[#10A87A] font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>DB: Connected</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 7 & 8: REVENUE OVERVIEW & QUICK ACTIONS (OVERVIEW TAB)
        ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 rounded-2xl border border-[#E9E5F0] bg-white p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0EBFC] text-[#7138E8]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#19152A]">Revenue Overview</h2>
                    <span className="text-[11px] text-[#77718B]">Last 7 days</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-lg bg-[#F8F7FC] p-1 border border-[#E9E5F0]">
                  <button
                    onClick={() => setChartPeriod('7days')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                      chartPeriod === '7days'
                        ? 'bg-[#7138E8] text-white shadow-sm'
                        : 'text-[#77718B] hover:text-[#19152A]'
                    }`}
                  >
                    Last 7 days
                  </button>
                  <button
                    onClick={() => setChartPeriod('30days')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                      chartPeriod === '30days'
                        ? 'bg-[#7138E8] text-white shadow-sm'
                        : 'text-[#77718B] hover:text-[#19152A]'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div className="relative h-52 w-full pt-2">
                <svg className="w-full h-full" viewBox="0 0 500 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7138E8" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#7138E8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line x1="40" y1="20" x2="490" y2="20" stroke="#E9E5F0" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="60" x2="490" y2="60" stroke="#E9E5F0" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="100" x2="490" y2="100" stroke="#E9E5F0" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="140" x2="490" y2="140" stroke="#E9E5F0" strokeWidth="1" />
                  <text x="32" y="24" textAnchor="end" className="text-[10px] fill-[#77718B] font-mono">150 ETB</text>
                  <text x="32" y="64" textAnchor="end" className="text-[10px] fill-[#77718B] font-mono">100 ETB</text>
                  <text x="32" y="104" textAnchor="end" className="text-[10px] fill-[#77718B] font-mono">50 ETB</text>
                  <text x="32" y="144" textAnchor="end" className="text-[10px] fill-[#77718B] font-mono">0 ETB</text>

                  {salesReport && salesReport.summary.grossRevenueCents > 0 ? (
                    <>
                      <path
                        d="M 50 140 Q 120 110, 200 95 T 350 50 T 480 35 L 480 140 L 50 140 Z"
                        fill="url(#revenueGradient)"
                      />
                      <path
                        d="M 50 140 Q 120 110, 200 95 T 350 50 T 480 35"
                        fill="none"
                        stroke="#7138E8"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </>
                  ) : (
                    <>
                      <path d="M 50 140 L 480 140" fill="none" stroke="#7138E8" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx="50" cy="140" r="3.5" fill="#7138E8" />
                      <circle cx="120" cy="140" r="3.5" fill="#7138E8" />
                      <circle cx="190" cy="140" r="3.5" fill="#7138E8" />
                      <circle cx="260" cy="140" r="3.5" fill="#7138E8" />
                      <circle cx="330" cy="140" r="3.5" fill="#7138E8" />
                      <circle cx="400" cy="140" r="3.5" fill="#7138E8" />
                      <circle cx="480" cy="140" r="3.5" fill="#7138E8" />
                    </>
                  )}
                </svg>

                {(!salesReport || salesReport.summary.grossRevenueCents === 0) && (
                  <div className="absolute inset-x-0 top-10 flex flex-col items-center justify-center text-center pointer-events-none">
                    <p className="text-xs font-bold text-[#19152A]">No sales data yet</p>
                    <p className="text-[11px] text-[#77718B] max-w-xs">
                      Orders and revenue will appear here once customers start ordering.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#77718B] font-mono px-8 pt-2 border-t border-[#E9E5F0]/60">
                {last7DaysLabels.map((lbl, idx) => (
                  <span key={idx}>{lbl}</span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-[#E9E5F0] bg-white p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0EBFC] text-[#7138E8]">
                  <Zap className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-[#19152A]">Quick Actions</h2>
              </div>

              <div className="grid grid-cols-2 gap-3.5 flex-1">
                <button
                  onClick={() => {
                    setActiveTab('products');
                    setIsAddProductModalOpen(true);
                  }}
                  className="flex flex-col justify-between rounded-xl bg-[#7138E8] hover:bg-[#5C25D4] text-white p-4 shadow-md shadow-[#7138E8]/20 transition-all cursor-pointer hover:scale-[1.02] text-left"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white mb-2">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Add Product</h3>
                    <p className="text-[11px] text-purple-200 mt-0.5">Add new menu item</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('inventory')}
                  className="flex flex-col justify-between rounded-xl bg-[#F8F7FC] hover:bg-[#F0EBFC]/50 border border-[#E9E5F0] hover:border-[#7138E8]/40 p-4 transition-all cursor-pointer hover:scale-[1.02] text-left group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0EBFC] text-[#7138E8] mb-2 group-hover:scale-110 transition-transform">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#19152A]">Manage Stock</h3>
                    <p className="text-[11px] text-[#77718B] mt-0.5">Update inventory</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('sales')}
                  className="flex flex-col justify-between rounded-xl bg-[#F8F7FC] hover:bg-[#F0EBFC]/50 border border-[#E9E5F0] hover:border-[#7138E8]/40 p-4 transition-all cursor-pointer hover:scale-[1.02] text-left group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0EBFC] text-[#7138E8] mb-2 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#19152A]">Sales Analytics</h3>
                    <p className="text-[11px] text-[#77718B] mt-0.5">View reports</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/staff/queue')}
                  className="flex flex-col justify-between rounded-xl bg-[#F8F7FC] hover:bg-[#F0EBFC]/50 border border-[#E9E5F0] hover:border-[#7138E8]/40 p-4 transition-all cursor-pointer hover:scale-[1.02] text-left group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0EBFC] text-[#7138E8] mb-2 group-hover:scale-110 transition-transform">
                    <ChefHat className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#19152A]">Kitchen Queue</h3>
                    <p className="text-[11px] text-[#77718B] mt-0.5">View live orders</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 9 & 10: STOCK ATTENTION & RECENT ACTIVITY (OVERVIEW TAB)
        ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 rounded-2xl border border-[#E9E5F0] bg-white p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-[#F0A020]">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-bold text-[#19152A]">Stock Attention Required</h2>
                </div>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className="text-xs font-semibold text-[#7138E8] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>View all</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {lowStockItems.length === 0 ? (
                <div className="rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] p-4 text-xs text-[#166534] flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#10A87A] flex-shrink-0" />
                  <span className="font-medium">
                    All inventory levels are currently above minimum safety threshold.
                  </span>
                </div>
              ) : (
                <div className="divide-y divide-[#E9E5F0] flex-1">
                  {lowStockItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-[#19152A]">{item.product.name}</p>
                        <p className="text-[#77718B] mt-0.5">
                          Available: <span className="font-bold text-rose-600">{item.quantity}</span> | Threshold: &le; {item.lowStockThreshold}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInventoryItem(item);
                          setIsAdjustStockModalOpen(true);
                        }}
                      >
                        Restock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-[#E9E5F0] bg-white p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0EBFC] text-[#7138E8]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-bold text-[#19152A]">Recent System Activity</h2>
                </div>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="text-xs font-semibold text-[#7138E8] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>View all</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-3 flex-1">
                {auditEvents.slice(0, 4).map((evt) => (
                  <div
                    key={evt.id}
                    className="rounded-xl bg-[#F8F7FC] p-3 text-xs border border-[#E9E5F0] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 rounded-full bg-[#7138E8] flex-shrink-0" />
                      <span className="font-bold text-[#7138E8]">[{evt.action}]</span>
                      <span className="text-[#19152A] font-medium truncate">{evt.entityName}</span>
                    </div>
                    <span className="font-mono text-[10px] text-[#77718B] whitespace-nowrap">
                      {formatDateTime(evt.createdAt)}
                    </span>
                  </div>
                ))}
                {auditEvents.length === 0 && (
                  <p className="text-xs text-[#77718B] py-4 text-center">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PRODUCTS & MENU REDESIGNED PAGE (SECTIONS 5, 6, 7, 8, 9, 10)
        ========================================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-5 animate-in fade-in duration-200" onClick={() => setOpenActionMenuId(null)}>
            {/* ---------------------------------------------------------------------
                SECTION 5: MINIMAL TITLE SECTION (NO LARGE PHOTO HERO)
            --------------------------------------------------------------------- */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
              <div className="space-y-1">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#7138E8]">
                  PRODUCTS &amp; MENU
                </div>
                <div className="flex items-center gap-2.5">
                  <Coffee className="h-6 w-6 text-[#7138E8] shrink-0" />
                  <h1 className="text-2xl sm:text-[28px] font-black text-[#19152A] tracking-tight">
                    Products
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-[#77718B] leading-relaxed">
                  Manage your coffee, drinks, and pastries.
                </p>
              </div>

              {/* Add Product Button Aligned Vertically with Heading */}
              <button
                onClick={() => setIsAddProductModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#7138E8] hover:bg-[#5C25D4] active:bg-[#4E1DBB] text-white font-bold text-xs sm:text-sm px-4 py-2.5 shadow-sm shadow-[#7138E8]/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] self-start sm:self-center focus:outline-none focus:ring-2 focus:ring-[#7138E8]/30"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Add Product</span>
              </button>
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 6: SEARCH AND FILTERING TOOLBAR
            --------------------------------------------------------------------- */}
            <div className="bg-white p-4 rounded-2xl border border-[#E9E5F0] shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
              {/* Product search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#77718B]" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] pl-10 pr-9 py-2 text-xs text-[#19152A] placeholder:text-[#77718B] focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors"
                />
                {productSearch && (
                  <button
                    onClick={() => {
                      setProductSearch('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-2.5 text-[#77718B] hover:text-[#19152A] cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category, Stock Status Dropdowns & Reset Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-[#77718B]">
                  <span className="font-medium">Category:</span>
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => {
                      setProductCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] px-3 py-2 text-xs text-[#19152A] font-semibold focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[#77718B]">
                  <span className="font-medium">Status:</span>
                  <select
                    value={productStatusFilter}
                    onChange={(e) => {
                      setProductStatusFilter(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] px-3 py-2 text-xs text-[#19152A] font-semibold focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="ALL">All Status</option>
                    <option value="IN_STOCK">In Stock</option>
                    <option value="LOW_STOCK">Low Stock</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>

                {(productSearch !== '' || productCategoryFilter !== 'ALL' || productStatusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setProductSearch('');
                      setProductCategoryFilter('ALL');
                      setProductStatusFilter('ALL');
                      setCurrentPage(1);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] px-3 py-2 text-xs font-semibold text-[#7138E8] hover:bg-[#F2ECFC] transition-colors cursor-pointer"
                    title="Reset all filters"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 7: CATEGORY TABS
            --------------------------------------------------------------------- */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => {
                  setProductCategoryFilter('ALL');
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  productCategoryFilter === 'ALL'
                    ? 'bg-[#7138E8] text-white shadow-sm'
                    : 'bg-white text-[#77718B] hover:text-[#19152A] hover:bg-[#F8F7FC] border border-[#E9E5F0]'
                }`}
              >
                <span>All Items</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    productCategoryFilter === 'ALL'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F2ECFC] text-[#7138E8]'
                  }`}
                >
                  {products.length}
                </span>
              </button>

              {categories.map((c) => {
                const count = products.filter((p) => p.category.id === c.id).length;
                const isSelected = productCategoryFilter === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setProductCategoryFilter(c.id);
                      setCurrentPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#7138E8] text-white shadow-sm'
                        : 'bg-white text-[#77718B] hover:text-[#19152A] hover:bg-[#F8F7FC] border border-[#E9E5F0]'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F2ECFC] text-[#7138E8]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 8 & 9: PRODUCT TABLE (THE MAIN VISUAL FOCUS)
            --------------------------------------------------------------------- */}
            <div className="rounded-2xl border border-[#E9E5F0] bg-white overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#F8F7FC] border-b border-[#E9E5F0] text-[11px] font-bold text-[#77718B] uppercase tracking-wider">
                    <tr>
                      {/* Column 1: # (Numeric Row Order) */}
                      <th className="px-4 py-3.5 text-center w-12 font-mono">#</th>
                      {/* Column 2: PRODUCT */}
                      <th className="px-5 py-3.5">PRODUCT</th>
                      {/* Column 3: CATEGORY */}
                      <th className="px-5 py-3.5">CATEGORY</th>
                      {/* Column 4: PRICE */}
                      <th className="px-5 py-3.5 text-right">PRICE</th>
                      {/* Column 5: STOCK AVAILABLE */}
                      <th className="px-5 py-3.5 text-center">STOCK AVAILABLE</th>
                      {/* Column 6: STATUS */}
                      <th className="px-5 py-3.5 text-center">STATUS</th>
                      {/* Column 7: ACTIONS */}
                      <th className="px-5 py-3.5 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E5F0]">
                    {paginatedProducts.map((p, idx) => {
                      const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                      const stockStatus = getProductStockStatus(p);

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-[#F8F7FC]/70 transition-colors group"
                        >
                          {/* 1. Row Number */}
                          <td className="px-4 py-4 text-center text-xs font-mono font-bold text-[#77718B]">
                            {rowNumber}
                          </td>

                          {/* 2. Product Name, Thumbnail, and Description */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3.5">
                              <ProductThumbnail imageUrl={p.imageUrl} name={p.name} />
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-[#19152A] group-hover:text-[#7138E8] transition-colors truncate max-w-xs sm:max-w-md">
                                  {p.name}
                                </div>
                                {p.description && (
                                  <p className="text-xs text-[#77718B] truncate max-w-xs sm:max-w-sm mt-0.5 font-normal">
                                    {p.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. Category Column */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-md bg-[#F2ECFC] px-2.5 py-1 text-xs font-semibold text-[#7138E8] border border-[#7138E8]/20">
                              {p.category.name}
                            </span>
                          </td>

                          {/* 4. Price Column in ETB */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <span className="font-black text-sm text-[#19152A]">
                              {formatCurrency(p.basePriceCents)}
                            </span>
                          </td>

                          {/* 5. Stock Available Column */}
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <span className="text-xs font-bold text-[#19152A]">
                              {p.inventory?.availableQuantity ?? 0} units
                            </span>
                          </td>

                          {/* 6. Status Column (Green, Amber, Red with status dot) */}
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${stockStatus.badgeClass}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${stockStatus.dotClass}`} />
                              <span>{stockStatus.label}</span>
                            </span>
                          </td>

                          {/* 7. Actions Column */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {/* Edit Action with purple outline icon */}
                              <button
                                onClick={() => openEditModal(p)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E9E5F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#19152A] hover:border-[#7138E8] hover:text-[#7138E8] hover:bg-[#F2ECFC]/40 transition-colors cursor-pointer shadow-2xs"
                                title={`Edit ${p.name}`}
                              >
                                <Edit2 className="h-3.5 w-3.5 text-[#7138E8]" />
                                <span>Edit</span>
                              </button>

                              {/* Compact Overflow Menu */}
                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionMenuId(openActionMenuId === p.id ? null : p.id);
                                  }}
                                  className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-[#E9E5F0] bg-white text-[#77718B] hover:border-[#7138E8] hover:text-[#7138E8] hover:bg-[#F2ECFC]/40 transition-colors cursor-pointer"
                                  title="More actions"
                                  aria-label="More actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>

                                {openActionMenuId === p.id && (
                                  <div
                                    className="absolute right-0 z-30 mt-1 w-44 rounded-xl border border-[#E9E5F0] bg-white py-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-100 text-left"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setViewingProduct(p);
                                        setOpenActionMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[#19152A] hover:bg-[#F8F7FC] hover:text-[#7138E8] transition-colors cursor-pointer"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-[#77718B]" />
                                      <span>View Details</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openAdjustStockForProduct(p)}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[#19152A] hover:bg-[#F8F7FC] hover:text-[#7138E8] transition-colors cursor-pointer"
                                    >
                                      <Package className="h-3.5 w-3.5 text-[#77718B]" />
                                      <span>Adjust Stock</span>
                                    </button>
                                    <div className="my-1 border-t border-[#E9E5F0]" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        openEditModal(p);
                                        setOpenActionMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[#7138E8] hover:bg-[#F2ECFC]/50 transition-colors cursor-pointer"
                                    >
                                      <Edit2 className="h-3.5 w-3.5 text-[#7138E8]" />
                                      <span>Edit Product</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {paginatedProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2 text-[#77718B]">
                            <Coffee className="h-8 w-8 text-[#77718B]/50" />
                            <p className="text-sm font-bold text-[#19152A]">No products found</p>
                            <p className="text-xs text-[#77718B]">
                              Try adjusting your search terms or category filter.
                            </p>
                            {(productSearch || productCategoryFilter !== 'ALL' || productStatusFilter !== 'ALL') && (
                              <button
                                onClick={() => {
                                  setProductSearch('');
                                  setProductCategoryFilter('ALL');
                                  setProductStatusFilter('ALL');
                                  setCurrentPage(1);
                                }}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#E9E5F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#7138E8] hover:bg-[#F2ECFC] transition-colors cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Reset filters</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ---------------------------------------------------------------------
                  SECTION 10: PAGINATION AND TABLE FOOTER
              --------------------------------------------------------------------- */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#E9E5F0] bg-white text-xs">
                {/* Dynamic Result Summary */}
                <div className="text-[#77718B]">
                  Showing{' '}
                  <span className="font-bold text-[#19152A]">
                    {totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  </span>
                  –
                  <span className="font-bold text-[#19152A]">
                    {Math.min(currentPage * pageSize, totalFiltered)}
                  </span>{' '}
                  of <span className="font-bold text-[#19152A]">{totalFiltered}</span> products
                </div>

                {/* Right: Page Size Selector & Controls */}
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
          </div>
        )}

        {/* =========================================================================
            INVENTORY & STOCK REDESIGNED TAB (SECTIONS 5, 6, 7, 8, 9, 10, 11)
        ========================================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* ---------------------------------------------------------------------
                SECTION 5: PAGE TITLE — QUIET, REFINED & PROFESSIONAL
            --------------------------------------------------------------------- */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
              <div className="space-y-1">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#7138E8]">
                  INVENTORY MANAGEMENT
                </div>
                <div className="flex items-center gap-2.5">
                  <Package className="h-6 w-6 text-[#7138E8] shrink-0" />
                  <h1 className="text-2xl sm:text-[28px] font-black text-[#19152A] tracking-tight">
                    Inventory &amp; Stock
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-[#77718B] leading-relaxed">
                  Monitor stock levels, review availability, and manage inventory adjustments.
                </p>
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 6: INVENTORY SUMMARY CARDS
            --------------------------------------------------------------------- */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Total Products */}
              <div className="rounded-xl border border-[#E9E5F0] bg-white p-4 shadow-2xs flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25 shrink-0">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[#77718B]">
                    Total Products
                  </span>
                  <div className="text-xl font-black text-[#19152A] leading-tight mt-0.5">
                    {inventoryMetrics.total}
                  </div>
                  <span className="block text-[11px] text-[#77718B] mt-0.5">Catalog items</span>
                </div>
              </div>

              {/* Card 2: Healthy Stock */}
              <div className="rounded-xl border border-[#E9E5F0] bg-white p-4 shadow-2xs flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25 shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[#77718B]">
                    Healthy Stock
                  </span>
                  <div className="text-xl font-black text-[#19152A] leading-tight mt-0.5">
                    {inventoryMetrics.healthy}
                  </div>
                  <span className="block text-[11px] text-[#77718B] mt-0.5">Optimal inventory</span>
                </div>
              </div>

              {/* Card 3: Low Stock */}
              <div className="rounded-xl border border-[#E9E5F0] bg-white p-4 shadow-2xs flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[#77718B]">
                    Low Stock
                  </span>
                  <div className="text-xl font-black text-[#19152A] leading-tight mt-0.5">
                    {inventoryMetrics.lowStock}
                  </div>
                  <span className="block text-[11px] text-[#77718B] mt-0.5">Requires restock</span>
                </div>
              </div>

              {/* Card 4: Out of Stock */}
              <div className="rounded-xl border border-[#E9E5F0] bg-white p-4 shadow-2xs flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[#77718B]">
                    Out of Stock
                  </span>
                  <div className="text-xl font-black text-[#19152A] leading-tight mt-0.5">
                    {inventoryMetrics.outOfStock}
                  </div>
                  <span className="block text-[11px] text-[#77718B] mt-0.5">Depleted inventory</span>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 7: SEARCH AND FILTER TOOLBAR
            --------------------------------------------------------------------- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-[#E9E5F0] bg-white p-3.5 shadow-2xs">
              {/* Search input with icon and clear button */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#77718B]" />
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={inventorySearch}
                  onChange={(e) => {
                    setInventorySearch(e.target.value);
                    setInventoryCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] pl-10 pr-9 py-2 text-xs text-[#19152A] placeholder:text-[#77718B] focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors"
                />
                {inventorySearch && (
                  <button
                    onClick={() => {
                      setInventorySearch('');
                      setInventoryCurrentPage(1);
                    }}
                    className="absolute right-3 top-2.5 text-[#77718B] hover:text-[#19152A] cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filters Group: Category, Stock Health, Low Stock Shortcut & Reset */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Category Dropdown */}
                <div className="flex items-center gap-1.5 text-xs text-[#77718B]">
                  <span className="font-medium">Category:</span>
                  <select
                    value={inventoryCategoryFilter}
                    onChange={(e) => {
                      setInventoryCategoryFilter(e.target.value);
                      setInventoryCurrentPage(1);
                    }}
                    className="rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] px-2.5 py-2 text-xs text-[#19152A] font-semibold focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="ALL">All Categories</option>
                    {inventoryCategoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stock Health Dropdown */}
                <div className="flex items-center gap-1.5 text-xs text-[#77718B]">
                  <span className="font-medium">Health:</span>
                  <select
                    value={inventoryHealthFilter}
                    onChange={(e) => {
                      setInventoryHealthFilter(e.target.value as any);
                      setInventoryCurrentPage(1);
                    }}
                    className="rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] px-2.5 py-2 text-xs text-[#19152A] font-semibold focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="ALL">All Stock</option>
                    <option value="HEALTHY">Healthy</option>
                    <option value="LOW_STOCK">Low Stock</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>

                {/* Low-Stock Shortcut Button */}
                <button
                  onClick={() => {
                    if (inventoryHealthFilter === 'LOW_STOCK') {
                      setInventoryHealthFilter('ALL');
                    } else {
                      setInventoryHealthFilter('LOW_STOCK');
                    }
                    setInventoryCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                    inventoryHealthFilter === 'LOW_STOCK'
                      ? 'border-[#D99016] bg-[#FEF7EC] text-[#D99016] shadow-2xs'
                      : 'border-[#E9E5F0] bg-white text-[#77718B] hover:border-[#D99016] hover:text-[#D99016]'
                  }`}
                  title="Toggle low stock filter"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Low Stock ({inventoryMetrics.lowStock})</span>
                </button>

                {/* Reset Filters Action */}
                {(inventorySearch ||
                  inventoryCategoryFilter !== 'ALL' ||
                  inventoryHealthFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setInventorySearch('');
                      setInventoryCategoryFilter('ALL');
                      setInventoryHealthFilter('ALL');
                      setInventoryLowStockOnly(false);
                      setInventoryCurrentPage(1);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E9E5F0] bg-white px-2.5 py-2 text-xs font-semibold text-[#7138E8] hover:bg-[#F2ECFC] transition-colors cursor-pointer"
                    title="Clear all active inventory filters"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 8: INVENTORY TABLE — MAIN INTERFACE
            --------------------------------------------------------------------- */}
            <div className="rounded-2xl border border-[#E9E5F0] bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E9E5F0] bg-[#F8F7FC] text-[10px] font-extrabold uppercase tracking-wider text-[#77718B]">
                      <th className="px-4 py-3.5 text-center w-12">#</th>
                      <th className="px-5 py-3.5">PRODUCT</th>
                      <th className="px-5 py-3.5">CATEGORY</th>
                      <th className="px-5 py-3.5 text-center">AVAILABLE STOCK</th>
                      <th className="px-5 py-3.5 text-center">SAFETY THRESHOLD</th>
                      <th className="px-5 py-3.5 text-center">STOCK HEALTH</th>
                      <th className="px-5 py-3.5 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E5F0]">
                    {paginatedInventory.map((item, idx) => {
                      const rowNumber = (inventoryCurrentPage - 1) * inventoryPageSize + idx + 1;
                      const healthBadge = getStockHealthConfig(item.quantity, item.lowStockThreshold);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-[#F8F7FC]/70 transition-colors group"
                        >
                          {/* 1. Sequential Row Number */}
                          <td className="px-4 py-4 text-center font-mono font-bold text-[#77718B]">
                            {rowNumber}
                          </td>

                          {/* 2. Product (Thumbnail, Name, Secondary Info) */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <ProductThumbnail
                                imageUrl={item.product.imageUrl}
                                name={item.product.name}
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="font-extrabold text-sm text-[#19152A] group-hover:text-[#7138E8] transition-colors truncate max-w-xs sm:max-w-sm">
                                  {item.product.name}
                                </span>
                                <span className="text-[11px] text-[#77718B] truncate max-w-[220px] mt-0.5">
                                  {item.product.description || `SKU / Slug: ${item.product.slug}`}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 3. Category */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-md bg-[#F2ECFC] px-2 py-0.5 text-xs font-semibold text-[#7138E8] border border-[#7138E8]/20">
                              {item.product.category.name}
                            </span>
                          </td>

                          {/* 4. Available Stock */}
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <div className="flex items-baseline justify-center gap-1">
                              <span className={`text-base font-black ${
                                item.quantity === 0
                                  ? 'text-[#C43D4B]'
                                  : item.quantity <= item.lowStockThreshold
                                  ? 'text-[#D99016]'
                                  : 'text-[#19152A]'
                              }`}>
                                {item.quantity}
                              </span>
                              <span className="text-[11px] font-medium text-[#77718B]">units</span>
                            </div>
                          </td>

                          {/* 5. Safety Threshold */}
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold text-[#77718B] bg-[#F8F7FC] px-2 py-1 rounded-lg border border-[#E9E5F0]">
                              &le; {item.lowStockThreshold}
                            </span>
                          </td>

                          {/* 6. Stock Health Status */}
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${healthBadge.badgeClass}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${healthBadge.dotClass}`} />
                              <span>{healthBadge.label}</span>
                            </span>
                          </td>

                          {/* 7. Actions */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedInventoryItem(item);
                                setAdjustmentDelta(10);
                                setAdjustmentReason(StockMovementReason.RESTOCK_PURCHASE);
                                setAdjustmentNotes('');
                                setIsAdjustStockModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E9E5F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#19152A] hover:border-[#7138E8] hover:text-[#7138E8] hover:bg-[#F2ECFC]/40 transition-colors cursor-pointer shadow-2xs"
                              title="Perform inventory movement adjustment"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5 text-[#7138E8]" />
                              <span>Adjust Stock</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Empty State */}
                    {paginatedInventory.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2 text-[#77718B]">
                            <Package className="h-8 w-8 text-[#77718B]/50" />
                            <p className="text-sm font-bold text-[#19152A]">
                              {inventory.length === 0
                                ? 'No inventory records found'
                                : 'No matching items'}
                            </p>
                            <p className="text-xs text-[#77718B] max-w-sm">
                              {inventory.length === 0
                                ? 'Inventory items will appear here when they are available.'
                                : 'Try a different search term or clear your filters.'}
                            </p>
                            {(inventorySearch ||
                              inventoryCategoryFilter !== 'ALL' ||
                              inventoryHealthFilter !== 'ALL') && (
                              <button
                                onClick={() => {
                                  setInventorySearch('');
                                  setInventoryCategoryFilter('ALL');
                                  setInventoryHealthFilter('ALL');
                                  setInventoryLowStockOnly(false);
                                  setInventoryCurrentPage(1);
                                }}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#E9E5F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#7138E8] hover:bg-[#F2ECFC] transition-colors cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Reset filters</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ---------------------------------------------------------------------
                  SECTION 10: PAGINATION AND TABLE FOOTER
              --------------------------------------------------------------------- */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#E9E5F0] bg-white text-xs">
                {/* Result Summary */}
                <div className="text-[#77718B]">
                  Showing{' '}
                  <span className="font-bold text-[#19152A]">
                    {totalFilteredInventory === 0
                      ? 0
                      : (inventoryCurrentPage - 1) * inventoryPageSize + 1}
                  </span>
                  –
                  <span className="font-bold text-[#19152A]">
                    {Math.min(inventoryCurrentPage * inventoryPageSize, totalFilteredInventory)}
                  </span>{' '}
                  of <span className="font-bold text-[#19152A]">{totalFilteredInventory}</span> inventory records
                </div>

                {/* Right: Page Size Selector & Controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[#77718B]">
                    <span>Rows:</span>
                    <select
                      value={inventoryPageSize}
                      onChange={(e) => {
                        setInventoryPageSize(Number(e.target.value));
                        setInventoryCurrentPage(1);
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
                      onClick={() => setInventoryCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={inventoryCurrentPage === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E9E5F0] text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      aria-label="Previous Page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {Array.from({ length: totalInventoryPages }, (_, idx) => idx + 1).map((pg) => (
                      <button
                        key={pg}
                        onClick={() => setInventoryCurrentPage(pg)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          inventoryCurrentPage === pg
                            ? 'bg-[#7138E8] text-white shadow-xs'
                            : 'border border-[#E9E5F0] text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A]'
                        }`}
                      >
                        {pg}
                      </button>
                    ))}

                    <button
                      onClick={() => setInventoryCurrentPage((p) => Math.min(totalInventoryPages, p + 1))}
                      disabled={inventoryCurrentPage === totalInventoryPages}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E9E5F0] text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      aria-label="Next Page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SALES & REVENUE REDESIGNED FINANCIAL ANALYTICS DASHBOARD
            (SECTIONS 5, 6, 7, 8, 9, 10, 11, 12, 14, 15)
        ========================================================================= */}
        {activeTab === 'sales' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* ---------------------------------------------------------------------
                SECTION 5: PAGE HEADER — SIMPLE AND PROFESSIONAL
            --------------------------------------------------------------------- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
              <div className="space-y-1">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#7138E8]">
                  FINANCIAL ANALYTICS
                </div>
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="h-6 w-6 text-[#7138E8] shrink-0" />
                  <h1 className="text-2xl sm:text-[28px] font-black text-[#211D2B] tracking-tight">
                    Sales &amp; Revenue
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-[#777183] leading-relaxed">
                  Track sales performance, revenue, and your best-selling products.
                </p>
              </div>

              {/* Reporting Controls: Date-range selector, Custom Range, Refresh, and Export */}
              <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
                {/* Date-Range Selector */}
                <div className="flex items-center gap-1.5 rounded-xl border border-[#E9E5EE] bg-white px-3 py-2 text-xs shadow-2xs">
                  <Calendar className="h-4 w-4 text-[#7138E8]" />
                  <select
                    value={salesDateRange}
                    onChange={(e) => {
                      const newRange = e.target.value as any;
                      setSalesDateRange(newRange);
                      if (newRange !== 'CUSTOM') {
                        fetchSalesReport(newRange);
                      }
                    }}
                    className="border-none bg-transparent text-xs font-bold text-[#211D2B] focus:outline-none cursor-pointer"
                  >
                    <option value="30DAYS">Last 30 Days</option>
                    <option value="7DAYS">Last 7 Days</option>
                    <option value="TODAY">Today</option>
                    <option value="YESTERDAY">Yesterday</option>
                    <option value="THIS_MONTH">This Month</option>
                    <option value="ALL">All Time</option>
                    <option value="CUSTOM">Custom Range...</option>
                  </select>
                </div>

                {/* Custom Date Inputs if CUSTOM is active */}
                {salesDateRange === 'CUSTOM' && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#E9E5EE] bg-white px-2.5 py-1.5 text-xs shadow-2xs">
                    <input
                      type="date"
                      value={salesCustomStartDate}
                      onChange={(e) => setSalesCustomStartDate(e.target.value)}
                      className="border border-[#E9E5EE] rounded-lg px-2 py-1 text-xs text-[#211D2B] focus:outline-none focus:border-[#7138E8]"
                    />
                    <span className="text-[#777183] text-xs">to</span>
                    <input
                      type="date"
                      value={salesCustomEndDate}
                      onChange={(e) => setSalesCustomEndDate(e.target.value)}
                      className="border border-[#E9E5EE] rounded-lg px-2 py-1 text-xs text-[#211D2B] focus:outline-none focus:border-[#7138E8]"
                    />
                    <button
                      onClick={() => fetchSalesReport('CUSTOM', salesCustomStartDate, salesCustomEndDate)}
                      disabled={!salesCustomStartDate || !salesCustomEndDate || isSalesRefreshing}
                      className="rounded-lg bg-[#7138E8] text-white px-2.5 py-1 text-xs font-bold hover:bg-[#5E2BC5] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {/* Refresh Action */}
                <button
                  onClick={() => fetchSalesReport()}
                  disabled={isSalesRefreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E9E5EE] bg-white hover:bg-[#F8F7FA] text-[#211D2B] font-bold text-xs sm:text-sm px-3.5 py-2.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  title="Refresh Sales Data"
                >
                  <RefreshCw
                    className={`h-4 w-4 text-[#777183] ${isSalesRefreshing ? 'animate-spin text-[#7138E8]' : ''}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                {/* Export Action */}
                <button
                  onClick={handleExportSalesCSV}
                  disabled={!salesReport}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#7138E8]/30 bg-[#F3EEFC] hover:bg-[#E9E0FA] text-[#7138E8] font-bold text-xs sm:text-sm px-3.5 py-2.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  title="Export Sales Report as CSV"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </div>
            </div>

            {salesReport ? (
              <>
                {/* ---------------------------------------------------------------------
                    SECTION 6: FINANCIAL SUMMARY — FOUR CAREFULLY DESIGNED METRICS
                --------------------------------------------------------------------- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Metric 1: Gross Sales */}
                  <div className="rounded-xl border border-[#E9E5EE] bg-white p-5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-[#777183] uppercase tracking-wider">
                        Gross Sales
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="text-2xl lg:text-[26px] font-black text-[#7138E8] tracking-tight">
                      {formatETB(salesReport.summary.grossRevenueCents)}
                    </div>
                    <div className="text-[11px] text-[#777183] mt-1 font-medium">
                      Total order transactions
                    </div>
                  </div>

                  {/* Metric 2: Net Revenue */}
                  <div className="rounded-xl border border-[#E9E5EE] bg-white p-5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-[#777183] uppercase tracking-wider">
                        Net Revenue
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="text-2xl lg:text-[26px] font-black text-[#138A63] tracking-tight">
                      {formatETB(salesReport.summary.netRevenueCents ?? salesReport.summary.grossRevenueCents)}
                    </div>
                    <div className="text-[11px] text-[#777183] mt-1 font-medium">
                      Merchandise base (excl. tax)
                    </div>
                  </div>

                  {/* Metric 3: Qualifying Orders */}
                  <div className="rounded-xl border border-[#E9E5EE] bg-white p-5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-[#777183] uppercase tracking-wider">
                        Orders Completed
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25">
                        <ShoppingBag className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="text-2xl lg:text-[26px] font-black text-[#211D2B] tracking-tight">
                      {salesReport.summary.completedOrders}
                    </div>
                    <div className="text-[11px] text-[#777183] mt-1 font-medium">
                      {salesReport.summary.cancelledOrders} cancelled orders excluded
                    </div>
                  </div>

                  {/* Metric 4: Average Order Value */}
                  <div className="rounded-xl border border-[#E9E5EE] bg-white p-5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-[#777183] uppercase tracking-wider">
                        Average Order Value
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7138E8] border border-[#7138E8] text-white shadow-sm shadow-[#7138E8]/25">
                        <Coffee className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="text-2xl lg:text-[26px] font-black text-[#211D2B] tracking-tight">
                      {formatETB(salesReport.summary.averageOrderValueCents)}
                    </div>
                    <div className="text-[11px] text-[#777183] mt-1 font-medium">
                      Revenue per completed ticket
                    </div>
                  </div>
                </div>

                {/* ---------------------------------------------------------------------
                    SECTIONS 7 & 8: VISUALIZATIONS ROW
                    - Primary: Sales Performance Over Time (Interactive Chart)
                    - Secondary: Sales by Category (Horizontal Bar Breakdown)
                --------------------------------------------------------------------- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* SECTION 7: MAIN VISUALIZATION — SALES PERFORMANCE OVER TIME */}
                  <div className="lg:col-span-2 rounded-2xl border border-[#E9E5EE] bg-white p-6 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E9E5EE]">
                      <div>
                        <h2 className="text-base font-bold text-[#211D2B]">
                          Sales Performance Over Time
                        </h2>
                        <p className="text-xs text-[#777183]">
                          Daily gross revenue trajectory across the selected reporting period.
                        </p>
                      </div>
                      <div className="self-start sm:self-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3EEFC] px-3 py-1 text-xs font-bold text-[#7138E8]">
                          <span>Period Gross:</span>
                          <span>{formatETB(salesReport.summary.grossRevenueCents)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Chart Container */}
                    <div className="mt-4 relative">
                      {salesReport.timeSeries && salesReport.timeSeries.length > 0 ? (
                        (() => {
                          const pts = salesReport.timeSeries;
                          const svgW = 760;
                          const svgH = 220;
                          const padL = 75;
                          const padR = 25;
                          const padT = 20;
                          const padB = 35;
                          const plotW = svgW - padL - padR;
                          const plotH = svgH - padT - padB;
                          const maxRev = Math.max(...pts.map((p) => p.revenueCents), 1000) * 1.15;

                          const coords = pts.map((d, i) => {
                            const x =
                              pts.length === 1
                                ? padL + plotW / 2
                                : padL + (i / (pts.length - 1)) * plotW;
                            const y = padT + plotH - (d.revenueCents / maxRev) * plotH;
                            return { ...d, x, y };
                          });

                          // Generate Area Path
                          const firstPt = coords[0];
                          const lastPt = coords[coords.length - 1];
                          const linePath = coords
                            .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
                            .join(' ');
                          const areaPath = `${linePath} L ${lastPt.x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${firstPt.x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

                          // Y-Axis Ticks (4 levels)
                          const yTicks = [1, 0.66, 0.33, 0].map((pct) => ({
                            pct,
                            yVal: padT + plotH - pct * plotH,
                            amountCents: Math.round(maxRev * pct),
                          }));

                          return (
                            <div className="w-full overflow-x-auto">
                              <svg
                                viewBox={`0 0 ${svgW} ${svgH}`}
                                className="w-full h-auto min-w-[550px] overflow-visible select-none"
                              >
                                <defs>
                                  <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#7138E8" stopOpacity="0.22" />
                                    <stop offset="90%" stopColor="#7138E8" stopOpacity="0.01" />
                                    <stop offset="100%" stopColor="#7138E8" stopOpacity="0" />
                                  </linearGradient>
                                </defs>

                                {/* Horizontal Gridlines & Y-Axis Labels */}
                                {yTicks.map((tick, idx) => (
                                  <g key={idx}>
                                    <line
                                      x1={padL}
                                      y1={tick.yVal}
                                      x2={svgW - padR}
                                      y2={tick.yVal}
                                      stroke="#E9E5EE"
                                      strokeDasharray={idx === yTicks.length - 1 ? 'none' : '3 3'}
                                      strokeWidth="1"
                                    />
                                    <text
                                      x={padL - 10}
                                      y={tick.yVal + 3.5}
                                      textAnchor="end"
                                      fill="#777183"
                                      fontSize="10"
                                      fontWeight="600"
                                    >
                                      {formatETB(tick.amountCents).replace('.00', '')}
                                    </text>
                                  </g>
                                ))}

                                {/* Area Fill */}
                                <path d={areaPath} fill="url(#salesAreaGradient)" />

                                {/* Trend Line */}
                                <path
                                  d={linePath}
                                  fill="none"
                                  stroke="#7138E8"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />

                                {/* Interactive Data Circles & X Labels */}
                                {coords.map((pt, idx) => {
                                  const showLabel =
                                    coords.length <= 10 ||
                                    idx === 0 ||
                                    idx === coords.length - 1 ||
                                    idx % Math.ceil(coords.length / 6) === 0;

                                  return (
                                    <g key={idx}>
                                      {/* Point Marker */}
                                      <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r="4"
                                        fill="#FFFFFF"
                                        stroke="#7138E8"
                                        strokeWidth="2"
                                        className="transition-transform hover:scale-150 cursor-pointer"
                                        onMouseEnter={() => setHoveredChartPoint(pt)}
                                        onMouseLeave={() => setHoveredChartPoint(null)}
                                      />

                                      {/* Invisible hit target */}
                                      <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r="14"
                                        fill="transparent"
                                        className="cursor-pointer"
                                        onMouseEnter={() => setHoveredChartPoint(pt)}
                                        onMouseLeave={() => setHoveredChartPoint(null)}
                                      />

                                      {/* X-Axis Date Label */}
                                      {showLabel && (
                                        <text
                                          x={pt.x}
                                          y={svgH - 10}
                                          textAnchor="middle"
                                          fill="#777183"
                                          fontSize="10"
                                          fontWeight="600"
                                        >
                                          {pt.label}
                                        </text>
                                      )}
                                    </g>
                                  );
                                })}
                              </svg>

                              {/* Hover Tooltip Overlay */}
                              {hoveredChartPoint && (
                                <div
                                  className="absolute z-20 pointer-events-none rounded-xl border border-[#E9E5EE] bg-white p-2.5 shadow-md text-xs transition-all"
                                  style={{
                                    left: `${(hoveredChartPoint.x / svgW) * 100}%`,
                                    top: `${(hoveredChartPoint.y / svgH) * 100}%`,
                                    transform: 'translate(-50%, -125%)',
                                  }}
                                >
                                  <div className="font-bold text-[#211D2B] mb-0.5">
                                    {hoveredChartPoint.label}
                                  </div>
                                  <div className="font-extrabold text-[#7138E8]">
                                    {formatETB(hoveredChartPoint.revenueCents)}
                                  </div>
                                  <div className="text-[10px] text-[#777183]">
                                    {hoveredChartPoint.orderCount} order
                                    {hoveredChartPoint.orderCount === 1 ? '' : 's'} placed
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex flex-col items-center justify-center py-14 text-center">
                          <TrendingUp className="h-8 w-8 text-[#777183]/50 mb-2" />
                          <p className="text-xs font-bold text-[#211D2B]">
                            No sales recorded for this period
                          </p>
                          <p className="text-[11px] text-[#777183] mt-0.5">
                            Orders placed in this time frame will be plotted on this chart.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 8: SECONDARY VISUALIZATION — SALES BY CATEGORY */}
                  <div className="rounded-2xl border border-[#E9E5EE] bg-white p-6 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="pb-4 border-b border-[#E9E5EE]">
                        <h2 className="text-base font-bold text-[#211D2B]">Sales by Category</h2>
                        <p className="text-xs text-[#777183]">
                          Revenue and volume contribution across menu items.
                        </p>
                      </div>

                      <div className="mt-4 space-y-4">
                        {salesReport.categoryBreakdown && salesReport.categoryBreakdown.length > 0 ? (
                          salesReport.categoryBreakdown.map((cat) => (
                            <div key={cat.categoryId} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-[#211D2B]">{cat.name}</span>
                                <span className="font-extrabold text-[#7138E8]">{cat.percentage}%</span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3EEFC]">
                                <div
                                  className="h-full rounded-full bg-[#7138E8] transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-[#777183]">
                                <span>{cat.unitsSold} units sold</span>
                                <span className="font-semibold">{formatETB(cat.revenueCents)}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Coffee className="h-7 w-7 text-[#777183]/50 mb-2" />
                            <p className="text-xs font-bold text-[#211D2B]">
                              No category sales recorded
                            </p>
                            <p className="text-[11px] text-[#777183] mt-0.5">
                              Category distribution will appear when orders are fulfilled.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#E9E5EE] text-[11px] text-[#777183] flex items-center justify-between">
                      <span>Total Categories:</span>
                      <span className="font-bold text-[#211D2B]">
                        {salesReport.categoryBreakdown?.length ?? 0} active
                      </span>
                    </div>
                  </div>
                </div>

                {/* ---------------------------------------------------------------------
                    SECTION 9: TOP-SELLING PRODUCTS — A PROFESSIONAL DATA TABLE
                --------------------------------------------------------------------- */}
                <div className="rounded-2xl border border-[#E9E5EE] bg-white shadow-2xs overflow-hidden">
                  {/* Table Header & Search/Filter Controls */}
                  <div className="p-6 border-b border-[#E9E5EE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-[#211D2B]">Top-Selling Products</h2>
                      <p className="text-xs text-[#777183]">
                        Products ranked by sales during the selected period.
                      </p>
                    </div>

                    {/* Filter controls */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Search */}
                      <div className="relative min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#777183]" />
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={salesProductSearch}
                          onChange={(e) => setSalesProductSearch(e.target.value)}
                          className="w-full rounded-xl border border-[#E9E5EE] bg-[#F8F7FA] pl-8 pr-3 py-1.5 text-xs text-[#211D2B] placeholder:text-[#777183] focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Category Filter */}
                      {salesCategoryOptions.length > 0 && (
                        <select
                          value={salesCategoryFilter}
                          onChange={(e) => setSalesCategoryFilter(e.target.value)}
                          className="rounded-xl border border-[#E9E5EE] bg-[#F8F7FA] px-2.5 py-1.5 text-xs font-semibold text-[#211D2B] focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="ALL">All Categories</option>
                          {salesCategoryOptions.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Table Content */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E9E5EE] bg-[#F8F7FC] text-[11px] font-bold text-[#777183] uppercase tracking-wider">
                          <th className="py-3 px-6 w-14">#</th>
                          <th className="py-3 px-6">Product</th>
                          <th className="py-3 px-6">Category</th>
                          <th className="py-3 px-6 text-right">Units Sold</th>
                          <th className="py-3 px-6 text-right">Revenue</th>
                          <th className="py-3 px-6 text-right w-44">Share of Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E9E5EE]">
                        {filteredTopProducts.length > 0 ? (
                          filteredTopProducts.map((p, idx) => (
                            <tr key={p.productId} className="hover:bg-[#F8F7FA]/70 transition-colors">
                              {/* Rank */}
                              <td className="py-3 px-6 font-bold text-[#777183]">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F3EEFC] text-[10px] font-extrabold text-[#7138E8]">
                                  {idx + 1}
                                </span>
                              </td>

                              {/* Product Thumbnail & Name */}
                              <td className="py-3 px-6">
                                <div className="flex items-center gap-3">
                                  <ProductThumbnail imageUrl={p.imageUrl} name={p.name} />
                                  <div>
                                    <div className="font-bold text-[#211D2B]">{p.name}</div>
                                    <div className="text-[10px] text-[#777183]">ID: {p.productId.slice(0, 8)}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-3 px-6">
                                <span className="inline-flex items-center rounded-md border border-[#7138E8]/20 bg-[#F3EEFC] px-2 py-0.5 text-[11px] font-semibold text-[#7138E8]">
                                  {p.categoryName || 'Beverages'}
                                </span>
                              </td>

                              {/* Units Sold */}
                              <td className="py-3 px-6 text-right font-bold text-[#211D2B]">
                                {p.unitsSold.toLocaleString()}
                              </td>

                              {/* Revenue */}
                              <td className="py-3 px-6 text-right font-black text-[#7138E8]">
                                {formatETB(p.revenueCents)}
                              </td>

                              {/* Share of Sales */}
                              <td className="py-3 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#E9E5EE]">
                                    <div
                                      className="h-full rounded-full bg-[#7138E8]"
                                      style={{ width: `${Math.min(100, Math.max(3, p.shareOfSales ?? 0))}%` }}
                                    />
                                  </div>
                                  <span className="font-bold text-[#211D2B] min-w-[36px]">
                                    {p.shareOfSales ?? 0}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-xs text-[#777183]">
                              No matching products found for this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ---------------------------------------------------------------------
                    SECTION 10: OPTIONAL RECENT SALES TRANSACTIONS SECTION
                --------------------------------------------------------------------- */}
                {salesReport.recentSales && salesReport.recentSales.length > 0 && (
                  <div className="rounded-2xl border border-[#E9E5EE] bg-white shadow-2xs overflow-hidden">
                    <div className="p-6 border-b border-[#E9E5EE] flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-[#211D2B]">Recent Sales Activity</h2>
                        <p className="text-xs text-[#777183]">
                          Latest customer orders processed in the store.
                        </p>
                      </div>
                      <Link
                        to="/staff/kitchen"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7138E8] hover:underline"
                      >
                        <span>Kitchen Queue (KDS)</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#E9E5EE] bg-[#F8F7FC] text-[11px] font-bold text-[#777183] uppercase tracking-wider">
                            <th className="py-3 px-6">Order #</th>
                            <th className="py-3 px-6">Date &amp; Time</th>
                            <th className="py-3 px-6">Customer</th>
                            <th className="py-3 px-6 text-center">Items</th>
                            <th className="py-3 px-6">Payment</th>
                            <th className="py-3 px-6">Status</th>
                            <th className="py-3 px-6 text-right">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E9E5EE]">
                          {salesReport.recentSales.map((ord) => (
                            <tr key={ord.id} className="hover:bg-[#F8F7FA]/70 transition-colors">
                              <td className="py-3 px-6 font-mono font-bold text-[#211D2B]">
                                #{ord.orderNumber}
                              </td>
                              <td className="py-3 px-6 text-[#777183]">
                                {formatDateTime(ord.createdAt)}
                              </td>
                              <td className="py-3 px-6 font-semibold text-[#211D2B]">
                                {ord.customerName}
                              </td>
                              <td className="py-3 px-6 text-center font-bold text-[#211D2B]">
                                {ord.itemsCount}
                              </td>
                              <td className="py-3 px-6">
                                <span className="inline-flex items-center rounded-md border border-[#E9E5EE] bg-[#F8F7FA] px-2 py-0.5 text-[10px] font-bold text-[#777183]">
                                  {ord.paymentMethod}
                                </span>
                              </td>
                              <td className="py-3 px-6">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                    ord.status === 'COMPLETED'
                                      ? 'border-[#B7EBD8] bg-[#EDF8F4] text-[#138A63]'
                                      : ord.status === 'CANCELLED'
                                      ? 'border-[#FAC7CB] bg-[#FDEDEE] text-[#C24141]'
                                      : 'border-[#FDE8C8] bg-[#FEF7EC] text-[#B7791F]'
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      ord.status === 'COMPLETED'
                                        ? 'bg-[#138A63]'
                                        : ord.status === 'CANCELLED'
                                        ? 'bg-[#C24141]'
                                        : 'bg-[#B7791F]'
                                    }`}
                                  />
                                  <span>{ord.status}</span>
                                </span>
                              </td>
                              <td className="py-3 px-6 text-right font-black text-[#211D2B]">
                                {formatETB(ord.totalCents)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Loading State */
              <div className="rounded-2xl border border-[#E9E5EE] bg-white p-12 text-center shadow-2xs">
                <RefreshCw className="h-7 w-7 text-[#7138E8] animate-spin mx-auto mb-3" />
                <div className="text-sm font-bold text-[#211D2B]">Loading sales analytics...</div>
                <div className="text-xs text-[#777183] mt-1">
                  Retrieving real financial ledger and transaction metrics.
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            AUDIT TRAIL LOGS REDESIGNED PAGE (SECTIONS 5, 6, 7, 8, 9, 10, 11, 12)
        ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* ---------------------------------------------------------------------
                SECTION 5: PAGE HEADER — MINIMAL AND PROFESSIONAL
            --------------------------------------------------------------------- */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
              <div className="space-y-1">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#7138E8]">
                  SECURITY &amp; ACCOUNTABILITY
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-6 w-6 text-[#7138E8] shrink-0" />
                  <h1 className="text-2xl sm:text-[28px] font-black text-[#19152A] tracking-tight">
                    Audit Trail Logs
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-[#77718B] leading-relaxed">
                  Review administrative actions and trace changes across your store.
                </p>
              </div>

              {/* Right-Side Operations: Refresh and CSV Export */}
              <div className="flex items-center gap-2.5 self-start sm:self-center">
                <button
                  onClick={handleRefreshAudit}
                  disabled={isAuditRefreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E9E5F0] bg-white hover:bg-[#F8F7FC] text-[#19152A] font-bold text-xs sm:text-sm px-3.5 py-2.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  title="Refresh Audit Events"
                >
                  <RefreshCw className={`h-4 w-4 text-[#77718B] ${isAuditRefreshing ? 'animate-spin text-[#7138E8]' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <button
                  onClick={handleExportCsv}
                  disabled={filteredAuditEvents.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#7138E8] hover:bg-[#5C25D4] text-white font-bold text-xs sm:text-sm px-4 py-2.5 shadow-md shadow-[#7138E8]/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export filtered records as CSV"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Logs</span>
                </button>
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 6: REAL SUMMARY INDICATORS
            --------------------------------------------------------------------- */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className="rounded-xl border border-[#E9E5F0] bg-white p-4 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#77718B]">
                  Total Events
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-[#19152A] tracking-tight">
                    {auditMetrics.total}
                  </span>
                  <span className="text-[11px] font-semibold text-[#7138E8]">Recorded</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#E9E5F0] bg-white p-4 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#77718B]">
                  Product Actions
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-[#7138E8] tracking-tight">
                    {auditMetrics.productCount}
                  </span>
                  <span className="text-[11px] font-semibold text-[#77718B]">Catalogue</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#E9E5F0] bg-white p-4 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#77718B]">
                  Inventory Changes
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-[#D99016] tracking-tight">
                    {auditMetrics.inventoryCount}
                  </span>
                  <span className="text-[11px] font-semibold text-[#77718B]">Movements</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#E9E5F0] bg-white p-4 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#77718B]">
                  Order Operations
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-blue-600 tracking-tight">
                    {auditMetrics.orderCount}
                  </span>
                  <span className="text-[11px] font-semibold text-[#77718B]">Live Orders</span>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#E9E5F0] bg-white p-4 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#77718B]">
                  Distinct Operators
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-[#10A87A] tracking-tight">
                    {auditMetrics.distinctActorsCount}
                  </span>
                  <span className="text-[11px] font-semibold text-[#10A87A]">Authorized</span>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 7: SEARCH AND FILTERING TOOLBAR
            --------------------------------------------------------------------- */}
            <div className="bg-white p-4 rounded-2xl border border-[#E9E5F0] shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
              {/* Audit Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#77718B]" />
                <input
                  type="text"
                  placeholder="Search audit logs..."
                  value={auditSearch}
                  onChange={(e) => {
                    setAuditSearch(e.target.value);
                    setAuditCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] pl-10 pr-9 py-2 text-xs text-[#19152A] placeholder:text-[#77718B] focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors"
                />
                {auditSearch && (
                  <button
                    onClick={() => {
                      setAuditSearch('');
                      setAuditCurrentPage(1);
                    }}
                    className="absolute right-3 top-2.5 text-[#77718B] hover:text-[#19152A] cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filters Group: Date, Action, Resource, Actor & Reset */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Date Filter */}
                <div className="flex items-center gap-1.5 text-xs text-[#77718B]">
                  <span className="font-medium">Date:</span>
                  <select
                    value={auditDateFilter}
                    onChange={(e) => {
                      setAuditDateFilter(e.target.value as any);
                      setAuditCurrentPage(1);
                    }}
                    className="rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] px-2.5 py-2 text-xs text-[#19152A] font-semibold focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="ALL">All Time</option>
                    <option value="TODAY">Today</option>
                    <option value="7DAYS">Last 7 Days</option>
                    <option value="30DAYS">Last 30 Days</option>
                  </select>
                </div>

                {/* Action Filter */}
                <div className="flex items-center gap-1.5 text-xs text-[#77718B]">
                  <span className="font-medium">Action:</span>
                  <select
                    value={auditActionFilter}
                    onChange={(e) => {
                      setAuditActionFilter(e.target.value);
                      setAuditCurrentPage(1);
                    }}
                    className="rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] px-2.5 py-2 text-xs text-[#19152A] font-semibold focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="ALL">All Actions</option>
                    {distinctActions.map((act) => (
                      <option key={act} value={act}>
                        {formatAuditAction(act).label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Resource / Entity Filter */}
                <div className="flex items-center gap-1.5 text-xs text-[#77718B]">
                  <span className="font-medium">Resource:</span>
                  <select
                    value={auditEntityFilter}
                    onChange={(e) => {
                      setAuditEntityFilter(e.target.value);
                      setAuditCurrentPage(1);
                    }}
                    className="rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] px-2.5 py-2 text-xs text-[#19152A] font-semibold focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="ALL">All Resources</option>
                    {distinctEntities.map((ent) => (
                      <option key={ent} value={ent}>
                        {ent}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actor Filter */}
                {distinctActors.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-[#77718B]">
                    <span className="font-medium">Actor:</span>
                    <select
                      value={auditActorFilter}
                      onChange={(e) => {
                        setAuditActorFilter(e.target.value);
                        setAuditCurrentPage(1);
                      }}
                      className="rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] px-2.5 py-2 text-xs text-[#19152A] font-semibold focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors cursor-pointer max-w-[140px] truncate"
                    >
                      <option value="ALL">All Actors</option>
                      {distinctActors.map((act) => (
                        <option key={act} value={act}>
                          {act}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Reset Filters Action */}
                {(auditSearch !== '' ||
                  auditActionFilter !== 'ALL' ||
                  auditEntityFilter !== 'ALL' ||
                  auditActorFilter !== 'ALL' ||
                  auditDateFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setAuditSearch('');
                      setAuditActionFilter('ALL');
                      setAuditEntityFilter('ALL');
                      setAuditActorFilter('ALL');
                      setAuditDateFilter('ALL');
                      setAuditCurrentPage(1);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] px-3 py-2 text-xs font-semibold text-[#7138E8] hover:bg-[#F2ECFC] transition-colors cursor-pointer"
                    title="Clear all active filters"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Clear filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 8: AUDIT TABLE (MAIN OPERATIONAL INTERFACE)
            --------------------------------------------------------------------- */}
            <div className="rounded-2xl border border-[#E9E5F0] bg-white overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#F8F7FC] border-b border-[#E9E5F0] text-[11px] font-bold text-[#77718B] uppercase tracking-wider">
                    <tr>
                      {/* Column 1: # (Numeric Row Order) */}
                      <th className="px-4 py-3.5 text-center w-12 font-mono">#</th>
                      {/* Column 2: TIMESTAMP */}
                      <th className="px-5 py-3.5">TIMESTAMP</th>
                      {/* Column 3: ACTOR */}
                      <th className="px-5 py-3.5">ACTOR</th>
                      {/* Column 4: ACTION */}
                      <th className="px-5 py-3.5">ACTION</th>
                      {/* Column 5: RESOURCE */}
                      <th className="px-5 py-3.5">RESOURCE</th>
                      {/* Column 6: RESULT */}
                      <th className="px-5 py-3.5 text-center">RESULT</th>
                      {/* Column 7: DETAILS */}
                      <th className="px-5 py-3.5 text-right">DETAILS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E5F0]">
                    {paginatedAuditEvents.map((evt, idx) => {
                      const rowNumber = (auditCurrentPage - 1) * auditPageSize + idx + 1;
                      const actionInfo = formatAuditAction(evt.action);
                      const actorName = evt.actor?.name || (evt.actor?.email ? evt.actor.email.split('@')[0] : 'System');
                      const actorInitial = actorName.charAt(0).toUpperCase();

                      return (
                        <tr
                          key={evt.id}
                          className="hover:bg-[#F8F7FC]/70 transition-colors group cursor-default"
                        >
                          {/* 1. Row Number */}
                          <td className="px-4 py-4 text-center text-xs font-mono font-bold text-[#77718B]">
                            {rowNumber}
                          </td>

                          {/* 2. Timestamp */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex flex-col" title={`ISO UTC: ${evt.createdAt}`}>
                              <span className="font-bold text-xs text-[#19152A]">
                                {formatDateTime(evt.createdAt)}
                              </span>
                              <span className="text-[10px] text-[#77718B] font-mono mt-0.5">
                                {new Date(evt.createdAt).toISOString().split('T')[0]}
                              </span>
                            </div>
                          </td>

                          {/* 3. Actor */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F2ECFC] text-[#7138E8] font-bold text-xs border border-[#7138E8]/20 flex-shrink-0">
                                {actorInitial}
                              </div>
                              <div className="flex flex-col truncate max-w-[170px]">
                                <span className="font-bold text-xs text-[#19152A] truncate">
                                  {actorName}
                                </span>
                                <span className="text-[10px] text-[#77718B] truncate">
                                  {evt.actor?.role ? `Role: ${evt.actor.role}` : evt.actor?.email || 'Automated Service'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 4. Action */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${actionInfo.badgeClass}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${actionInfo.dotClass}`} />
                              <span>{actionInfo.label}</span>
                            </span>
                          </td>

                          {/* 5. Resource */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-[#19152A]">
                                {evt.entityName}
                              </span>
                              <span
                                className="font-mono text-[10px] text-[#77718B] truncate max-w-[130px]"
                                title={evt.entityId}
                              >
                                {evt.entityId}
                              </span>
                            </div>
                          </td>

                          {/* 6. Result */}
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B7EBD8] bg-[#EDF8F4] px-2.5 py-0.5 text-[11px] font-bold text-[#10A87A]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#10A87A]" />
                              <span>Success</span>
                            </span>
                          </td>

                          {/* 7. Details */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedAuditEvent(evt)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E9E5F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#19152A] hover:border-[#7138E8] hover:text-[#7138E8] hover:bg-[#F2ECFC]/40 transition-colors cursor-pointer shadow-2xs"
                              title="Inspect full audit record"
                            >
                              <Eye className="h-3.5 w-3.5 text-[#7138E8]" />
                              <span>View details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {paginatedAuditEvents.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2 text-[#77718B]">
                            <Shield className="h-8 w-8 text-[#77718B]/50" />
                            <p className="text-sm font-bold text-[#19152A]">
                              {auditEvents.length === 0 ? 'No audit events found' : 'No matching events'}
                            </p>
                            <p className="text-xs text-[#77718B] max-w-sm">
                              {auditEvents.length === 0
                                ? 'Recorded activity will appear here when administrative events occur.'
                                : 'Try adjusting your search query or clearing the active filters.'}
                            </p>
                            {(auditSearch ||
                              auditActionFilter !== 'ALL' ||
                              auditEntityFilter !== 'ALL' ||
                              auditActorFilter !== 'ALL' ||
                              auditDateFilter !== 'ALL') && (
                              <button
                                onClick={() => {
                                  setAuditSearch('');
                                  setAuditActionFilter('ALL');
                                  setAuditEntityFilter('ALL');
                                  setAuditActorFilter('ALL');
                                  setAuditDateFilter('ALL');
                                  setAuditCurrentPage(1);
                                }}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#E9E5F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#7138E8] hover:bg-[#F2ECFC] transition-colors cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Reset filters</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ---------------------------------------------------------------------
                  SECTION 10: PAGINATION AND AUDIT FOOTER
              --------------------------------------------------------------------- */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#E9E5F0] bg-white text-xs">
                {/* Result Summary */}
                <div className="text-[#77718B]">
                  Showing{' '}
                  <span className="font-bold text-[#19152A]">
                    {totalFilteredAudit === 0 ? 0 : (auditCurrentPage - 1) * auditPageSize + 1}
                  </span>
                  –
                  <span className="font-bold text-[#19152A]">
                    {Math.min(auditCurrentPage * auditPageSize, totalFilteredAudit)}
                  </span>{' '}
                  of <span className="font-bold text-[#19152A]">{totalFilteredAudit}</span> events
                </div>

                {/* Right: Page Size Selector & Controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[#77718B]">
                    <span>Rows:</span>
                    <select
                      value={auditPageSize}
                      onChange={(e) => {
                        setAuditPageSize(Number(e.target.value));
                        setAuditCurrentPage(1);
                      }}
                      className="rounded-lg border border-[#E9E5F0] bg-[#F8F7FC] px-2 py-1 text-xs text-[#19152A] font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAuditCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={auditCurrentPage === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E9E5F0] text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      aria-label="Previous Page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {Array.from({ length: totalAuditPages }, (_, idx) => idx + 1).map((pg) => (
                      <button
                        key={pg}
                        onClick={() => setAuditCurrentPage(pg)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          auditCurrentPage === pg
                            ? 'bg-[#7138E8] text-white shadow-xs'
                            : 'border border-[#E9E5F0] text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A]'
                        }`}
                      >
                        {pg}
                      </button>
                    ))}

                    <button
                      onClick={() => setAuditCurrentPage((p) => Math.min(totalAuditPages, p + 1))}
                      disabled={auditCurrentPage === totalAuditPages}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E9E5F0] text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      aria-label="Next Page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODALS: ADD PRODUCT, EDIT PRODUCT, ADJUST STOCK
        ========================================================================= */}
        {/* Modal: Add Product */}
        <Modal
          isOpen={isAddProductModalOpen}
          onClose={() => setIsAddProductModalOpen(false)}
          title="Create Menu Product"
          description="Add a new beverage, coffee roast, or pastry to the storefront catalogue."
        >
          <form onSubmit={handleCreateProduct} className="space-y-4">
            <Input
              label="Product Name"
              placeholder="e.g. Ethiopian Yirgacheffe Pour Over"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-[#19152A] mb-1">Category</label>
              <select
                value={newProductCategoryId}
                onChange={(e) => setNewProductCategoryId(e.target.value)}
                className="w-full rounded-lg border border-[#E9E5F0] p-2 text-xs text-[#19152A] focus:border-[#7138E8] focus:outline-none"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Price (in cents: 450 = 4.50 ETB)"
                type="number"
                value={newProductPriceCents}
                onChange={(e) => setNewProductPriceCents(Number(e.target.value))}
                helperText={`Price: ${formatCurrency(newProductPriceCents)}`}
                required
              />
              <Input
                label="Initial Stock Quantity"
                type="number"
                value={newProductStock}
                onChange={(e) => setNewProductStock(Number(e.target.value))}
                required
              />
            </div>

            <Input
              label="Image URL (Optional)"
              placeholder="https://images.unsplash.com/..."
              value={newProductImageUrl}
              onChange={(e) => setNewProductImageUrl(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-[#19152A] mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={newProductDesc}
                onChange={(e) => setNewProductDesc(e.target.value)}
                placeholder="Flavour notes, terroir, brew recommendations..."
                className="w-full rounded-lg border border-[#E9E5F0] p-2 text-xs text-[#19152A] focus:border-[#7138E8] focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isCreatingProduct}>
                Create Product
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Edit Product */}
        <Modal
          isOpen={isEditProductModalOpen}
          onClose={() => {
            setIsEditProductModalOpen(false);
            setEditingProduct(null);
          }}
          title={`Edit Product: ${editingProduct?.name || ''}`}
          description="Update menu details, category, and pricing."
        >
          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <Input
              label="Product Name"
              value={editProductName}
              onChange={(e) => setEditProductName(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-[#19152A] mb-1">Category</label>
              <select
                value={editProductCategoryId}
                onChange={(e) => setEditProductCategoryId(e.target.value)}
                className="w-full rounded-lg border border-[#E9E5F0] p-2 text-xs text-[#19152A] focus:border-[#7138E8] focus:outline-none"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Price (in cents: 450 = 4.50 ETB)"
              type="number"
              value={editProductPriceCents}
              onChange={(e) => setEditProductPriceCents(Number(e.target.value))}
              helperText={`Price: ${formatCurrency(editProductPriceCents)}`}
              required
            />

            <Input
              label="Image URL (Optional)"
              placeholder="https://images.unsplash.com/..."
              value={editProductImageUrl}
              onChange={(e) => setEditProductImageUrl(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-[#19152A] mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={editProductDesc}
                onChange={(e) => setEditProductDesc(e.target.value)}
                className="w-full rounded-lg border border-[#E9E5F0] p-2 text-xs text-[#19152A] focus:border-[#7138E8] focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setIsEditProductModalOpen(false);
                  setEditingProduct(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isUpdatingProduct}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Adjust Stock */}
        <Modal
          isOpen={isAdjustStockModalOpen}
          onClose={() => setIsAdjustStockModalOpen(false)}
          title={`Adjust Stock: ${selectedInventoryItem?.product.name || ''}`}
          description="Post an inventory movement transaction with reason code."
        >
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div className="rounded-lg bg-[#F8F7FC] p-3 text-xs flex justify-between border border-[#E9E5F0]">
              <span className="text-[#77718B]">Current Stock Balance:</span>
              <span className="font-bold text-[#19152A]">
                {selectedInventoryItem?.quantity} units
              </span>
            </div>

            <Input
              label="Quantity Delta (+ to add, - to subtract)"
              type="number"
              value={adjustmentDelta}
              onChange={(e) => setAdjustmentDelta(Number(e.target.value))}
              helperText={`Updated total will be: ${(selectedInventoryItem?.quantity ?? 0) + Number(adjustmentDelta)} units`}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-[#19152A] mb-1">
                Movement Reason
              </label>
              <select
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value as StockMovementReason)}
                className="w-full rounded-lg border border-[#E9E5F0] p-2 text-xs text-[#19152A] focus:border-[#7138E8] focus:outline-none"
                required
              >
                <option value={StockMovementReason.RESTOCK_PURCHASE}>Restock Purchase</option>
                <option value={StockMovementReason.MANUAL_ADJUSTMENT}>Manual Adjustment</option>
                <option value={StockMovementReason.DAMAGED_DISPOSAL}>Damaged Disposal</option>
              </select>
            </div>

            <Input
              label="Audit Notes (Optional)"
              placeholder="e.g. Batch #204 roast delivery received"
              value={adjustmentNotes}
              onChange={(e) => setAdjustmentNotes(e.target.value)}
            />

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsAdjustStockModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isAdjustingStock}>
                Record Adjustment
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: View Product Details */}
        <Modal
          isOpen={!!viewingProduct}
          onClose={() => setViewingProduct(null)}
          title={viewingProduct?.name || 'Product Details'}
          description="Catalogue specification, pricing, and live inventory status."
        >
          {viewingProduct && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#F8F7FC] border border-[#E9E5F0]">
                <ProductThumbnail imageUrl={viewingProduct.imageUrl} name={viewingProduct.name} />
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center rounded-md bg-[#F2ECFC] px-2 py-0.5 text-[10px] font-bold text-[#7138E8] border border-[#7138E8]/20 mb-1">
                    {viewingProduct.category.name}
                  </span>
                  <h4 className="text-base font-extrabold text-[#19152A] truncate">
                    {viewingProduct.name}
                  </h4>
                  <p className="text-xs text-[#77718B] mt-0.5 line-clamp-2">
                    {viewingProduct.description || 'No detailed description provided.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#E9E5F0] bg-white p-3">
                  <span className="text-[10px] font-bold text-[#77718B] uppercase">Base Price</span>
                  <div className="text-lg font-black text-[#19152A] mt-0.5">
                    {formatCurrency(viewingProduct.basePriceCents)}
                  </div>
                </div>

                <div className="rounded-xl border border-[#E9E5F0] bg-white p-3">
                  <span className="text-[10px] font-bold text-[#77718B] uppercase">Current Stock</span>
                  <div className="text-lg font-black text-[#19152A] mt-0.5">
                    {viewingProduct.inventory?.availableQuantity ?? 0} units
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E9E5F0] bg-white p-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#77718B]">Inventory Status:</span>
                  {(() => {
                    const status = getProductStockStatus(viewingProduct);
                    return (
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${status.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
                        <span>{status.label}</span>
                      </span>
                    );
                  })()}
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-[#E9E5F0]">
                  <span className="text-[#77718B]">Product Slug:</span>
                  <span className="font-mono text-[#19152A] font-semibold">{viewingProduct.slug}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const prod = viewingProduct;
                    setViewingProduct(null);
                    openAdjustStockForProduct(prod);
                  }}
                >
                  Adjust Stock
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const prod = viewingProduct;
                    setViewingProduct(null);
                    openEditModal(prod);
                  }}
                >
                  Edit Product
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* =========================================================================
            SECTION 9: AUDIT EVENT DETAILS MODAL (SIDE DRAWER / DIALOG)
        ========================================================================= */}
        <Modal
          isOpen={!!selectedAuditEvent}
          onClose={() => {
            setSelectedAuditEvent(null);
            setCopiedPayload(false);
          }}
          title="Audit Record Inspection"
          description="Cryptographically structured operational record from Akufada security ledger."
          maxWidth="xl"
        >
          {selectedAuditEvent && (
            <div className="space-y-5 text-xs text-[#19152A]">
              {/* Event Header & Verification Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F8F7FC] border border-[#E9E5F0]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2ECFC] text-[#7138E8] border border-[#7138E8]/20 shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[#19152A]">
                        {formatAuditAction(selectedAuditEvent.action).label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#B7EBD8] bg-[#EDF8F4] px-2 py-0.5 text-[10px] font-bold text-[#10A87A]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#10A87A]" />
                        <span>Success</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#77718B]">
                      <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#E9E5F0]">
                        ID: {selectedAuditEvent.id}
                      </span>
                      <span>•</span>
                      <span>Recorded at {formatDateTime(selectedAuditEvent.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedAuditEvent.id);
                    setCopiedPayload(true);
                    setTimeout(() => setCopiedPayload(false), 2000);
                  }}
                  className="self-start sm:self-center inline-flex items-center gap-1 rounded-lg border border-[#E9E5F0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#77718B] hover:text-[#7138E8] hover:border-[#7138E8] transition-colors cursor-pointer"
                >
                  {copiedPayload ? <Check className="h-3 w-3 text-[#10A87A]" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedPayload ? 'Copied ID' : 'Copy ID'}</span>
                </button>
              </div>

              {/* Core Audit Attributes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Actor Information */}
                <div className="rounded-xl border border-[#E9E5F0] bg-white p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#77718B] uppercase tracking-wider">
                    <UserIcon className="h-3.5 w-3.5 text-[#7138E8]" />
                    <span>Actor Identity</span>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2ECFC] text-xs font-bold text-[#7138E8] border border-[#7138E8]/20">
                      {selectedAuditEvent.actor?.name ? selectedAuditEvent.actor.name[0].toUpperCase() : 'S'}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#19152A]">
                        {selectedAuditEvent.actor?.name || 'System Operator'}
                      </div>
                      <div className="text-[11px] text-[#77718B]">
                        {selectedAuditEvent.actor?.email || 'automated@akufada.internal'}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#E9E5F0] flex justify-between items-center text-[11px]">
                    <span className="text-[#77718B]">Assigned Role:</span>
                    <span className="font-semibold text-[#7138E8] bg-[#F2ECFC] px-2 py-0.5 rounded text-[10px]">
                      {selectedAuditEvent.actor?.role || 'ADMINISTRATOR'}
                    </span>
                  </div>
                </div>

                {/* Target Resource Information */}
                <div className="rounded-xl border border-[#E9E5F0] bg-white p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#77718B] uppercase tracking-wider">
                    <Package className="h-3.5 w-3.5 text-[#7138E8]" />
                    <span>Target Resource</span>
                  </div>
                  <div className="pt-1">
                    <div className="font-bold text-sm text-[#19152A]">
                      {selectedAuditEvent.entityName}
                    </div>
                    <div className="font-mono text-[11px] text-[#77718B] truncate mt-0.5" title={selectedAuditEvent.entityId}>
                      Entity ID: {selectedAuditEvent.entityId || 'Global / Multi-target'}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#E9E5F0] flex justify-between items-center text-[11px]">
                    <span className="text-[#77718B]">System Module:</span>
                    <span className="font-semibold text-[#19152A]">
                      {selectedAuditEvent.entityName === 'Product'
                        ? 'Catalogue Management'
                        : selectedAuditEvent.entityName === 'InventoryItem'
                        ? 'Warehouse & Stock'
                        : selectedAuditEvent.entityName === 'Order'
                        ? 'Sales & Transactions'
                        : 'System Security'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Network and Client Context */}
              <div className="rounded-xl border border-[#E9E5F0] bg-white p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-[#77718B] uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#7138E8]" />
                    <span>Security & Origin Context</span>
                  </div>
                  <span className="text-[#10A87A] font-semibold lowercase">verified secure</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-[11px] text-[#77718B] block">Client IP Address</span>
                    <span className="font-mono font-semibold text-[#19152A]">
                      {selectedAuditEvent.ipAddress || '127.0.0.1 (Loopback / Trusted Proxy)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#77718B] block">Timestamp (UTC ISO-8601)</span>
                    <span className="font-mono font-semibold text-[#19152A]">
                      {new Date(selectedAuditEvent.createdAt).toISOString()}
                    </span>
                  </div>
                </div>
                {selectedAuditEvent.userAgent && (
                  <div className="pt-2 border-t border-[#E9E5F0]">
                    <span className="text-[11px] text-[#77718B] block">User Agent</span>
                    <span className="font-mono text-[10px] text-[#77718B] break-all">
                      {selectedAuditEvent.userAgent}
                    </span>
                  </div>
                )}
              </div>

              {/* State Change Comparison (Before & After Table) */}
              <div className="rounded-xl border border-[#E9E5F0] bg-white overflow-hidden">
                <div className="px-3.5 py-2.5 bg-[#F8F7FC] border-b border-[#E9E5F0] flex items-center justify-between">
                  <div className="font-bold text-xs text-[#19152A]">State Mutation Comparison</div>
                  <span className="text-[10px] text-[#77718B]">Historical diff record</span>
                </div>
                {(() => {
                  const oldVals = (selectedAuditEvent.oldValues || {}) as Record<string, unknown>;
                  const newVals = (selectedAuditEvent.newValues || {}) as Record<string, unknown>;
                  const allKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)])).filter(
                    (k) => !['password', 'hash', 'secret', 'token', 'salt'].includes(k.toLowerCase()),
                  );

                  if (allKeys.length === 0) {
                    return (
                      <div className="p-4 text-center text-[#77718B] text-xs">
                        No field modifications recorded for this operation (immutable lifecycle event).
                      </div>
                    );
                  }

                  const formatDiffValue = (key: string, val: unknown) => {
                    if (val === undefined || val === null) {
                      return <span className="text-[#77718B] italic">None / Unset</span>;
                    }
                    if (key.toLowerCase().includes('price') && typeof val === 'number') {
                      return <span className="font-semibold text-[#19152A]">{formatCurrency(val)}</span>;
                    }
                    if (typeof val === 'boolean') {
                      return (
                        <span className={`font-mono text-[11px] font-bold ${val ? 'text-[#10A87A]' : 'text-[#C43D4B]'}`}>
                          {val ? 'TRUE' : 'FALSE'}
                        </span>
                      );
                    }
                    if (typeof val === 'object') {
                      return <span className="font-mono text-[10px]">{JSON.stringify(val)}</span>;
                    }
                    return <span className="font-semibold text-[#19152A]">{String(val)}</span>;
                  };

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#E9E5F0] bg-[#F2ECFC]/30 text-[10px] font-bold text-[#77718B] uppercase tracking-wider">
                            <th className="px-3 py-2">Field / Attribute</th>
                            <th className="px-3 py-2">Previous State (Before)</th>
                            <th className="px-3 py-2">Updated State (After)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E9E5F0]">
                          {allKeys.map((key) => {
                            const oldV = oldVals[key];
                            const newV = newVals[key];
                            const isDifferent = JSON.stringify(oldV) !== JSON.stringify(newV);

                            return (
                              <tr key={key} className={isDifferent ? 'bg-[#F2ECFC]/15' : ''}>
                                <td className="px-3 py-2 font-mono text-[11px] font-bold text-[#19152A]">
                                  {key}
                                </td>
                                <td className="px-3 py-2">
                                  {formatDiffValue(key, oldV)}
                                </td>
                                <td className="px-3 py-2">
                                  {formatDiffValue(key, newV)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Raw Sanitized Audit Record JSON */}
              <div className="rounded-xl border border-[#E9E5F0] bg-[#19152A] p-3 text-[#E9E5F0]">
                <div className="flex items-center justify-between pb-2 border-b border-[#21113F] mb-2">
                  <span className="font-mono text-[11px] font-bold text-[#A892EE]">
                    RAW AUDIT TELEMETRY (SANITIZED)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const sanitized = {
                        ...selectedAuditEvent,
                        oldValues: selectedAuditEvent.oldValues,
                        newValues: selectedAuditEvent.newValues,
                      };
                      navigator.clipboard.writeText(JSON.stringify(sanitized, null, 2));
                      setCopiedPayload(true);
                      setTimeout(() => setCopiedPayload(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 rounded bg-[#21113F] px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-[#7138E8] transition-colors cursor-pointer"
                  >
                    {copiedPayload ? <Check className="h-3 w-3 text-[#10A87A]" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedPayload ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="font-mono text-[10px] text-[#E9E5F0] overflow-x-auto max-h-40 leading-relaxed">
                  {JSON.stringify(
                    {
                      id: selectedAuditEvent.id,
                      action: selectedAuditEvent.action,
                      entityName: selectedAuditEvent.entityName,
                      entityId: selectedAuditEvent.entityId,
                      actor: {
                        name: selectedAuditEvent.actor?.name || 'System Operator',
                        email: selectedAuditEvent.actor?.email || null,
                        role: selectedAuditEvent.actor?.role || 'ADMINISTRATOR',
                      },
                      ipAddress: selectedAuditEvent.ipAddress || null,
                      userAgent: selectedAuditEvent.userAgent || null,
                      createdAt: selectedAuditEvent.createdAt,
                      oldValues: selectedAuditEvent.oldValues,
                      newValues: selectedAuditEvent.newValues,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-2 flex justify-end gap-2 border-t border-[#E9E5F0]">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setSelectedAuditEvent(null);
                    setCopiedPayload(false);
                  }}
                >
                  Close Inspection
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
