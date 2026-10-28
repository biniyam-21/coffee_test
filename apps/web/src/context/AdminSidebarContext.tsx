import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface AdminSidebarContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  toggleOpen: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleCollapsed: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined);

export const AdminSidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default open for admin convenience, remember preference across sessions
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('akufada_admin_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('akufada_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('akufada_admin_sidebar_open', String(isOpen));
    } catch {
      // Ignore local storage error
    }
  }, [isOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('akufada_admin_sidebar_collapsed', String(isCollapsed));
    } catch {
      // Ignore local storage error
    }
  }, [isCollapsed]);

  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);
  const toggleCollapsed = useCallback(() => setIsCollapsed((prev) => !prev), []);
  const collapseSidebar = useCallback(() => setIsCollapsed(true), []);
  const expandSidebar = useCallback(() => setIsCollapsed(false), []);

  const value = useMemo(
    () => ({
      isOpen,
      isCollapsed,
      toggleOpen,
      openSidebar,
      closeSidebar,
      toggleCollapsed,
      collapseSidebar,
      expandSidebar,
    }),
    [
      isOpen,
      isCollapsed,
      toggleOpen,
      openSidebar,
      closeSidebar,
      toggleCollapsed,
      collapseSidebar,
      expandSidebar,
    ],
  );

  return (
    <AdminSidebarContext.Provider value={value}>
      {children}
    </AdminSidebarContext.Provider>
  );
};

const defaultAdminSidebarContext: AdminSidebarContextType = {
  isOpen: true,
  isCollapsed: false,
  toggleOpen: () => {},
  openSidebar: () => {},
  closeSidebar: () => {},
  toggleCollapsed: () => {},
  collapseSidebar: () => {},
  expandSidebar: () => {},
};

export const useAdminSidebar = (): AdminSidebarContextType => {
  const context = useContext(AdminSidebarContext);
  return context || defaultAdminSidebarContext;
};
