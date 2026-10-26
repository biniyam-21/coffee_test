import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Coffee,
  ShoppingCart,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ChefHat,
  LayoutDashboard,
  Search,
  Bell,
  ChevronDown,
  Clock,
  Store,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useAdminSidebar } from '../../context/AdminSidebarContext';
import { useToast } from '../../context/ToastContext';
import { RoleType } from '../../types/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const toast = useToast();
  const { itemCount, openDrawer } = useCart();
  const {
    isOpen,
    isCollapsed,
    toggleOpen,
    openSidebar,
    toggleCollapsed,
    expandSidebar,
  } = useAdminSidebar();

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      toggleOpen();
    } else {
      if (!isOpen) {
        openSidebar();
        expandSidebar();
      } else {
        toggleCollapsed();
      }
    }
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdmin = hasRole(RoleType.ADMIN);
  const isStaff = hasRole(RoleType.STAFF);
  const hasAccess = isAdmin || isStaff;

  const sidebarMarginClass =
    hasAccess && isOpen ? (isCollapsed ? 'lg:pl-20' : 'lg:pl-[280px]') : '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    toast.info('Signed Out', 'You have been signed out safely.');
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;
  const displayName = user?.fullName || (isAdmin ? 'Sara Haile' : 'Customer');
  const displayRole = isAdmin ? 'Admin' : isStaff ? 'Staff' : 'Customer';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-[#E9E5F0] bg-white text-[#19152A] shadow-xs transition-all duration-300 ${sidebarMarginClass}`}
    >
      {/* Top Status & Info Bar: Primary color strip with location, operating hours, and user greeting */}
      <div className="w-full bg-[#58259A] text-white text-[11px] py-1.5 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="mx-auto flex flex-wrap items-center justify-between gap-3 max-w-7xl">
          {/* Shop location on the left */}
          <div className="flex items-center gap-1.5 font-medium text-white/95">
            <MapPin className="h-3 w-3 text-[#E7C8A0]" />
            <span>Addis Ababa, Ethiopia</span>
          </div>

          {/* Operating hours in the center */}
          <div className="hidden sm:flex items-center gap-1.5 font-medium text-white/85">
            <Clock className="h-3 w-3 text-[#E7C8A0]" />
            <span>Mon - Sat: 7AM - 10PM</span>
          </div>

          {/* User greeting with profile avatar on the right or neutral welcome message */}
          <div className="flex items-center gap-2 font-medium">
            {user ? (
              <>
                <span className="text-[#E7C8A0]">
                  Welcome back, {user.fullName?.split(' ')[0] || user.email.split('@')[0]}!
                </span>
                <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white/20 text-white text-[9px] font-black border border-white/30 shadow-xs">
                  {avatarLetter}
                </div>
              </>
            ) : (
              <span className="text-white/90">
                Specialty Ethiopian Coffee • Artisanal Roasts
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[60px] w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Section: Sidebar Toggle + Akufada Brand */}
        <div className="flex items-center gap-3">
          {/* Sidebar Collapse / Expand Toggle Button */}
          {(isAdmin || isStaff) && (
            <button
              type="button"
              onClick={handleToggleSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A] transition-colors cursor-pointer border border-[#E9E5F0]"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          {/* Akufada Coffee Cup Logo & Title */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-[#19152A] font-bold tracking-tight hover:opacity-90 transition-opacity ml-2 sm:ml-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#58259A] text-white shadow-xs">
              <Coffee className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base leading-tight text-[#19152A]">Akufada</span>
              <span className="text-[9px] font-extrabold tracking-widest uppercase text-[#7138E8]">
                Coffee Artisans
              </span>
            </div>
          </Link>
        </div>

        {/* Center Section: Search Field with "Search anything..." placeholder */}
        <div className="hidden md:flex flex-1 max-w-xl mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#58259A]" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full rounded-xl border border-[#E9E5F0] bg-[#F8F7FC] pl-9 pr-3 py-1.5 text-xs text-[#19152A] placeholder:text-[#77718B] focus:border-[#7138E8] focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Right Section: Navigation Links, Notifications, Cart, & User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Navigation Links (Visible on non-admin routes) */}
          {!isAdminRoute && (
            <nav className="hidden lg:flex items-center gap-1 mr-2">
              <Link
                to="/"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive('/')
                    ? 'bg-purple-50 text-[#7138E8]'
                    : 'text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A]'
                }`}
              >
                Menu
              </Link>

              {isAuthenticated && (
                <Link
                  to="/orders"
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive('/orders')
                      ? 'bg-purple-50 text-[#7138E8]'
                      : 'text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A]'
                  }`}
                >
                  My Orders
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive('/admin')
                      ? 'bg-purple-50 text-[#7138E8]'
                      : 'text-[#77718B] hover:bg-[#F8F7FC] hover:text-[#19152A]'
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-[#7138E8]" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>
          )}

          {/* Notification Bell with filled primary color & no outline */}
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#58259A] hover:bg-purple-50 transition-colors cursor-pointer"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="h-4.5 w-4.5 fill-[#58259A] text-[#58259A]" />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-[#E7C8A0] ring-2 ring-white" />
          </button>

          {/* Customer Cart Trigger with ShoppingCart icon, filled primary color & no outline */}
          <button
            onClick={openDrawer}
            aria-label={`Open shopping cart with ${itemCount} items`}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#58259A] hover:bg-purple-50 transition-colors cursor-pointer"
          >
            <ShoppingCart className="h-4.5 w-4.5 fill-[#58259A] text-[#58259A]" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#58259A] text-[10px] font-bold text-white shadow-xs">
                {itemCount}
              </span>
            )}
          </button>

          {/* User Profile & Account Dropdown (Items 8, 9, 10 in Section 4) */}
          {isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl p-1 hover:bg-[#F8F7FC] transition-colors cursor-pointer"
                aria-label="User Account Menu"
              >
                {/* User Avatar */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#58259A] text-white text-xs font-black shadow-xs">
                  {avatarLetter}
                </div>

                {/* User Name & Role Badge */}
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#19152A] leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[10px] font-semibold text-[#7138E8] leading-tight">
                    {displayRole}
                  </span>
                </div>

                {/* Account dropdown indicator */}
                <ChevronDown className="h-3.5 w-3.5 text-[#77718B]" />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[#E9E5F0] bg-white py-1 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-[#E9E5F0]">
                    <p className="text-xs font-bold text-[#19152A] truncate">{displayName}</p>
                    <p className="text-[10px] text-[#77718B] truncate">{user.email}</p>
                  </div>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#19152A] hover:bg-[#F8F7FC] transition-colors"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-[#7138E8]" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}

                  {(isAdmin || isStaff) && (
                    <Link
                      to="/staff/queue"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#19152A] hover:bg-[#F8F7FC] transition-colors"
                    >
                      <ChefHat className="h-3.5 w-3.5 text-[#7138E8]" />
                      <span>Kitchen Queue</span>
                    </Link>
                  )}

                  <Link
                    to="/orders"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#19152A] hover:bg-[#F8F7FC] transition-colors"
                  >
                    <Clock className="h-3.5 w-3.5 text-[#77718B]" />
                    <span>My Orders</span>
                  </Link>

                  <Link
                    to="/"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#19152A] hover:bg-[#F8F7FC] transition-colors"
                  >
                    <Store className="h-3.5 w-3.5 text-[#77718B]" />
                    <span>Storefront Menu</span>
                  </Link>

                  <div className="border-t border-[#E9E5F0] my-1" />

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#58259A] hover:bg-purple-50 hover:text-[#481E7F] border-none"
                  leftIcon={<UserIcon className="h-4 w-4 fill-[#58259A] text-[#58259A]" />}
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm" className="bg-[#58259A] hover:bg-[#481E7F]">
                  Register
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E9E5F0] text-[#77718B] hover:bg-[#F8F7FC] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E9E5F0] bg-white px-4 pt-2 pb-6 space-y-3">
          <nav className="flex flex-col space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                isActive('/') ? 'bg-purple-50 text-[#7138E8]' : 'text-[#19152A] hover:bg-[#F8F7FC]'
              }`}
            >
              Menu
            </Link>

            {isAuthenticated && (
              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive('/orders')
                    ? 'bg-purple-50 text-[#7138E8]'
                    : 'text-[#19152A] hover:bg-[#F8F7FC]'
                }`}
              >
                My Orders
              </Link>
            )}

            {(isAdmin || isStaff) && (
              <>
                <Link
                  to="/staff/queue"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive('/staff/queue')
                      ? 'bg-purple-50 text-[#7138E8]'
                      : 'text-[#19152A] hover:bg-[#F8F7FC]'
                  }`}
                >
                  <ChefHat className="h-4 w-4 text-[#7138E8]" />
                  Kitchen Queue
                </Link>

                <button
                  onClick={() => {
                    openSidebar();
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-[#21113F] text-white hover:bg-[#7138E8] cursor-pointer"
                >
                  <Coffee className="h-4 w-4 text-[#E7C8A0]" />
                  <span>Open Operations Sidebar</span>
                </button>
              </>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive('/admin')
                    ? 'bg-purple-50 text-[#7138E8]'
                    : 'text-[#19152A] hover:bg-[#F8F7FC]'
                }`}
              >
                <LayoutDashboard className="h-4 w-4 text-[#7138E8]" />
                Admin Dashboard
              </Link>
            )}
          </nav>

          <div className="border-t border-[#E9E5F0] pt-3">
            {isAuthenticated && user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#19152A]">{displayName}</p>
                    <p className="text-xs text-[#77718B]">{user.email}</p>
                  </div>
                  <Badge size="sm" variant="brand">
                    {displayRole}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleLogout}
                  leftIcon={<LogOut className="h-4 w-4" />}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" fullWidth>
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" fullWidth>
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
