import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Coffee,
  Package,
  TrendingUp,
  FileText,
  Users,
  ChefHat,
  Clock,
  Store,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  RefreshCw,
  Server,
  Database,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminSidebar } from '../../context/AdminSidebarContext';
import { RoleType } from '../../types/api';
import { apiRequest } from '../../lib/api-client';

interface HealthCheckStatus {
  status: string;
  database: string;
}

interface NavItem {
  name: string;
  path: string;
  tab?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const AdminSidebar: React.FC = () => {
  const { user, hasRole, logout } = useAuth();
  const {
    isOpen,
    isCollapsed,
    toggleOpen,
    closeSidebar,
    toggleCollapsed,
  } = useAdminSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = hasRole(RoleType.ADMIN);
  const isStaff = hasRole(RoleType.STAFF);
  const hasAccess = isAdmin || isStaff;

  const [health, setHealth] = useState<HealthCheckStatus>({
    status: 'checking',
    database: 'checking',
  });
  const [isHealthRefreshing, setIsHealthRefreshing] = useState(false);

  const fetchHealth = async () => {
    setIsHealthRefreshing(true);
    try {
      const data = await apiRequest<{
        status: string;
        checks?: { database: string };
      }>('/health/ready');
      setHealth({
        status: data.status,
        database: data.checks?.database || 'connected',
      });
    } catch {
      setHealth({
        status: 'error',
        database: 'disconnected',
      });
    } finally {
      setIsHealthRefreshing(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchHealth();
      const interval = setInterval(fetchHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [hasAccess]);

  if (!hasAccess) {
    return null;
  }

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'overview';

  const isNavActive = (path: string, tab?: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' && (tab ? currentTab === tab : currentTab === 'overview');
    }
    return location.pathname === path;
  };

  // Nav sections exact to Section 3 of Master Prompt
  const navSections: NavSection[] = [];

  if (isAdmin) {
    navSections.push({
      title: 'MAIN NAVIGATION',
      items: [
        {
          name: 'Dashboard',
          path: '/admin',
          tab: 'overview',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          name: 'Products & Menu',
          path: '/admin',
          tab: 'products',
          icon: Coffee,
          badge: null,
        },
        {
          name: 'Inventory & Stock',
          path: '/admin',
          tab: 'inventory',
          icon: Package,
          badge: 'Live',
        },
        {
          name: 'Sales & Revenue',
          path: '/admin',
          tab: 'sales',
          icon: TrendingUp,
          badge: null,
        },
        {
          name: 'Audit Trail Logs',
          path: '/admin',
          tab: 'audit',
          icon: FileText,
          badge: null,
        },
        {
          name: 'Users & Roles',
          path: '/admin/users',
          icon: Users,
          badge: null,
        },
      ],
    });
  }

  navSections.push({
    title: 'STORE OPERATIONS',
    items: [
      {
        name: 'Kitchen Queue (KDS)',
        path: '/staff/queue',
        icon: ChefHat,
        badge: 'Live',
      },
      {
        name: 'Order History',
        path: '/orders',
        icon: Clock,
        badge: null,
      },
      {
        name: 'Storefront View',
        path: '/',
        icon: Store,
        badge: 'Public',
      },
    ],
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const displayName = user?.fullName || (isAdmin ? 'Administrator' : 'Staff Member');
  const displayEmail = user?.email || 'Signed in account';
  const roleLabel = isAdmin ? '(Admin)' : '(Staff)';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Floating Action Trigger Button (Visible when sidebar is closed on desktop/mobile) */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          aria-label="Open Admin Control Sidebar"
          className="fixed bottom-6 left-6 z-40 flex items-center gap-2.5 rounded-full bg-[#21113F]/95 text-white px-4 py-2.5 shadow-2xl hover:bg-[#7138E8] transition-all duration-200 border border-white/10 hover:scale-105 cursor-pointer backdrop-blur-md"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7138E8] text-white shadow">
            <Coffee className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold tracking-wide">
            {isAdmin ? 'Akufada Admin' : 'Staff Operations'}
          </span>
        </button>
      )}

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 z-50 bg-[#21113F]/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Main Left Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-gradient-to-b from-[#21113F] to-[#1B0C34] text-slate-100 transition-all duration-300 border-r border-[#30145B]/60 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${!isOpen ? 'hidden lg:hidden' : isCollapsed ? 'w-20' : 'w-[280px]'}`}
      >
        {/* Floating Toggle Button on Sidebar Border for seamless collapse/expand */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapsed();
          }}
          className="hidden lg:flex absolute -right-3 top-5 z-[60] h-6 w-6 items-center justify-center rounded-full bg-[#7138E8] text-white shadow-md shadow-[#7138E8]/40 hover:bg-[#58259A] hover:scale-110 active:scale-95 transition-all cursor-pointer border border-[#30145B]"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Brand Header */}
        <div className={`flex h-[68px] items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-[#30145B]/70 bg-[#1E0F39]`}>
          <Link
            to={isAdmin ? '/admin' : '/staff/queue'}
            className="flex items-center gap-3 overflow-hidden group cursor-pointer"
            title="Akufada Coffee Artisans"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#7138E8] text-white shadow-md shadow-[#7138E8]/40 group-hover:scale-105 transition-transform">
              <Coffee className="h-5 w-5" />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-white truncate">
                    Akufada
                  </span>
                  <span className="inline-flex items-center rounded-md bg-[#7138E8]/25 border border-[#7138E8]/40 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                    Admin
                  </span>
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#D4C6F7] truncate">
                  COFFEE ARTISANS
                </span>
              </div>
            )}
          </Link>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={closeSidebar}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-[#938BA8] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title="Close Sidebar"
            aria-label="Close Sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              {!isCollapsed && (
                <h3 className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-[#938BA8]">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(item.path, item.tab);
                  const targetUrl = item.tab ? `${item.path}?tab=${item.tab}` : item.path;

                  return (
                    <Link
                      key={item.name}
                      to={targetUrl}
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          closeSidebar();
                        }
                      }}
                      title={isCollapsed ? item.name : undefined}
                      className={`group flex items-center ${
                        isCollapsed ? 'h-10 w-10 mx-auto justify-center' : 'px-3 gap-3 py-2.5'
                      } rounded-xl text-[14px] font-semibold transition-all duration-150 ${
                        active
                          ? 'bg-[#7138E8] text-white shadow-md shadow-[#7138E8]/35 font-bold'
                          : 'text-[#C5BFE0] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`h-[15px] w-[15px] flex-shrink-0 transition-transform group-hover:scale-110 ${
                          active ? 'text-white' : 'text-[#A098BD] group-hover:text-white'
                        }`}
                      />

                      {!isCollapsed && (
                        <div className="flex flex-1 items-center justify-between truncate">
                          <span className="truncate text-[14px]">{item.name}</span>
                          {item.badge && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                active
                                  ? 'bg-white/25 text-white'
                                  : 'bg-[#30145B] text-[#D4C6F7] border border-white/10'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* SERVICE HEALTH SECTION */}
          <div className="space-y-2 pt-3 border-t border-[#30145B]/60">
            {!isCollapsed && (
              <div className="flex items-center justify-between px-3 text-[10px] font-extrabold uppercase tracking-wider text-[#938BA8]">
                <span>SERVICE HEALTH</span>
                <button
                  onClick={fetchHealth}
                  className="hover:text-white cursor-pointer"
                  title="Refresh Health"
                >
                  <RefreshCw className={`h-3 w-3 ${isHealthRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}

            <div
              className={`rounded-xl border border-[#30145B]/80 bg-[#1A0C30] p-2.5 ${
                isCollapsed ? 'text-center' : 'space-y-2'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                {!isCollapsed && (
                  <span className="flex items-center gap-1.5 text-[#C5BFE0]">
                    <Server className="h-3.5 w-3.5 text-[#7138E8]" />
                    API Service
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#10A87A]">
                  <span className="h-2 w-2 rounded-full bg-[#10A87A] animate-pulse" />
                  {!isCollapsed && (health.status === 'ok' ? 'Online' : 'Degraded')}
                </span>
              </div>

              {!isCollapsed && (
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#30145B]/50">
                  <span className="flex items-center gap-1.5 text-[#C5BFE0]">
                    <Database className="h-3.5 w-3.5 text-[#7138E8]" />
                    Database
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#10A87A]">
                    <span className="h-2 w-2 rounded-full bg-[#10A87A]" />
                    {health.database === 'connected' ? 'Connected' : 'Offline'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR FOOTER: ADMIN USER PROFILE */}
        <div className="border-t border-[#30145B]/70 bg-[#1A0C30] p-3">
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2 justify-center' : 'justify-between gap-2'}`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#7138E8] text-white font-black text-sm shadow">
                {avatarLetter}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col truncate">
                  <div className="flex items-center gap-1">
                    <span className="text-[14px] font-bold text-white truncate">{displayName}</span>
                    <span className="text-[11px] font-medium text-[#D4C6F7]">{roleLabel}</span>
                  </div>
                  <span className="text-[11px] text-[#938BA8] truncate">{displayEmail}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#938BA8] hover:bg-white/10 hover:text-rose-400 transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-[15px] w-[15px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
