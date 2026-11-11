import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  ArrowLeftRight,
  BarChart3,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  AlertTriangle,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Products', to: '/products', icon: Package },
  { label: 'Categories', to: '/categories', icon: FolderTree },
  { label: 'Inventory', to: '/inventory', icon: Boxes },
  { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    setMobileOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    let active = true;
    async function loadAlerts() {
      try {
        const res = await api.get('/dashboard/stats');
        if (active && res.data?.data?.lowStockAlerts) {
          setAlerts(res.data.data.lowStockAlerts);
        }
      } catch {
        // handled per page
      }
    }
    loadAlerts();
    return () => {
      active = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    const trimmed = globalSearch.trim();
    if (trimmed) {
      navigate(`/products?search=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/products');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.name || 'Admin')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex h-full flex-col">
      {/* Brand header */}
      <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <NavLink to="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black text-white dark:bg-white dark:text-black">
            <Boxes className="h-4 w-4" />
          </div>
          {(!collapsed || isMobile) && (
            <span className="text-sm font-semibold tracking-tight text-neutral-950 dark:text-white">
              StockFlow
            </span>
          )}
        </NavLink>

        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 lg:inline-flex dark:hover:bg-neutral-900 dark:hover:text-white"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation items */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed && !isMobile ? item.label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                  isActive
                    ? 'bg-neutral-100 font-medium text-neutral-950 dark:bg-neutral-900 dark:text-white'
                    : 'font-normal text-neutral-600 hover:bg-neutral-100/70 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900/60 dark:hover:text-white'
                } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar footer user */}
      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        <div
          className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
            collapsed && !isMobile ? 'justify-center' : ''
          }`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-[11px] font-semibold text-white dark:bg-white dark:text-black">
            {initials}
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-neutral-950 dark:text-white">
                {user?.name || 'Admin'}
              </p>
              <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                {user?.email || ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-950 dark:bg-black dark:text-neutral-100">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-neutral-200 bg-white transition-all duration-200 lg:block dark:border-neutral-800 dark:bg-black ${
          collapsed ? 'w-[64px]' : 'w-60'
        }`}
      >
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-60 border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black">
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-neutral-200 bg-white/85 px-4 backdrop-blur-md sm:px-6 dark:border-neutral-800 dark:bg-black/85">
          <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 lg:hidden dark:text-neutral-300 dark:hover:bg-neutral-900"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <form onSubmit={handleGlobalSearch} className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search products or SKU..."
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-xs text-neutral-950 placeholder-neutral-400 transition-colors focus:border-neutral-950 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:placeholder-neutral-500 dark:focus:border-neutral-400"
              />
            </form>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
                aria-label="Stock alerts"
              >
                <Bell className="h-4 w-4" />
                {alerts.length > 0 && (
                  <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
                  <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                    <span className="text-xs font-medium text-neutral-950 dark:text-white">
                      Low-Stock Alerts ({alerts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/inventory?status=low_stock');
                      }}
                      className="text-xs font-medium text-neutral-600 underline-offset-2 hover:text-neutral-950 hover:underline dark:text-neutral-400 dark:hover:text-white"
                    >
                      Restock
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-900">
                    {alerts.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-neutral-500">
                        All products are well stocked.
                      </div>
                    ) : (
                      alerts.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate('/inventory');
                          }}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        >
                          <AlertTriangle
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              item.quantity === 0 ? 'text-red-500' : 'text-amber-500'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-neutral-950 dark:text-white">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                              {item.quantity === 0 ? 'Out of stock' : `${item.quantity} left`} · min{' '}
                              {item.min_stock_level}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white dark:bg-white dark:text-black">
                  {initials}
                </div>
                <span className="hidden max-w-[110px] truncate font-medium text-neutral-800 sm:inline dark:text-neutral-200">
                  {user?.name || 'Admin'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
                  <div className="border-b border-neutral-100 px-3.5 py-2.5 dark:border-neutral-800">
                    <p className="truncate text-xs font-medium text-neutral-950 dark:text-white">
                      {user?.name}
                    </p>
                    <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
                  >
                    <User className="h-3.5 w-3.5 text-neutral-400" />
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
