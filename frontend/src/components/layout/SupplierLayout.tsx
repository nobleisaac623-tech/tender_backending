import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Send,
  FileCheck,
  Star,
  User,
  Bell,
  Phone,
  Menu,
  X,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications';
import type { Notification } from '@/types';
import { cn } from '@/utils/cn';
import FloatingProcureAI from '@/components/ai/FloatingProcureAI';
import { InstallAppButton } from '@/components/InstallAppButton';
import { playNotificationSound } from '@/utils/notificationSound';

const SIDEBAR_WIDTH = 260;

const mainNav = [
  { to: '/supplier/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/supplier/tenders', label: 'Browse Tenders', icon: FileText },
  { to: '/supplier/bids', label: 'My Bids', icon: Send },
  { to: '/supplier/contracts', label: 'My Contracts', icon: FileCheck },
  { to: '/supplier/performance', label: 'Performance', icon: Star },
  { to: '/supplier/profile', label: 'Profile', icon: User },
];

const supportNav = [
  { to: '/supplier/notifications', label: 'Notifications', icon: Bell, badge: true },
  { to: '/supplier/intelligence', label: 'ProcureAI', icon: Sparkles },
  { to: 'mailto:procurement@example.com', label: 'Contact Admin', icon: Phone, external: true },
];

const pathToTitle: Record<string, string> = {
  '/supplier/dashboard': 'Dashboard',
  '/supplier/tenders': 'Browse Tenders',
  '/supplier/tenders/': 'Tender Details',
  '/supplier/bids': 'My Bids',
  '/supplier/bids/': 'Bid Details',
  '/supplier/contracts': 'My Contracts',
  '/supplier/contracts/': 'Contract Details',
  '/supplier/performance': 'Performance',
  '/supplier/profile': 'Profile',
  '/supplier/notifications': 'Notifications',
  '/supplier/intelligence': 'ProcureAI',
};

function getPageTitle(pathname: string): string {
  if (pathToTitle[pathname]) return pathToTitle[pathname];
  if (pathname.startsWith('/supplier/tenders/')) return 'Tender Details';
  if (pathname.startsWith('/supplier/bids/')) return 'Bid Details';
  if (pathname.startsWith('/supplier/contracts/')) return 'Contract Details';
  return 'Supplier Portal';
}

function NavSection({
  title,
  items,
  pathname,
  badgeCount,
}: {
  title: string;
  items: { to: string; label: string; icon: React.ElementType; external?: boolean; badge?: boolean }[];
  pathname: string;
  badgeCount?: number;
}) {
  return (
    <>
      <p className="px-5 pb-2 pt-4 text-[11px] font-medium uppercase tracking-widest text-[#64748b] first:pt-0">
        {title}
      </p>
      {items.map(({ to, label, icon: Icon, external, badge }) => {
        const active = pathname === to || (to !== '/supplier/dashboard' && pathname.startsWith(to + '/'));
        
        const content = (
          <div
            className={cn(
              'mx-3 mb-0.5 flex items-center justify-between rounded-lg px-5 py-2.5 text-[15px] transition-colors',
              active
                ? 'bg-[#1e40af] text-white'
                : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#e2e8f0]'
            )}
          >
            <div className="flex items-center">
              <Icon className="mr-3 h-[18px] w-[18px] shrink-0" />
              {label}
            </div>
            {badge && badgeCount !== undefined && badgeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </div>
        );

        if (external) {
          return (
            <a key={to} href={to} target="_blank" rel="noopener noreferrer" className="block">
              {content}
            </a>
          );
        }

        return (
          <Link key={to} to={to} className="block">
            {content}
          </Link>
        );
      })}
    </>
  );
}

export function SupplierLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const pathname = location.pathname;
  const pageTitle = getPageTitle(pathname);

  // Get notification count
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list({ unread_only: true }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = notificationsData?.total ?? 0;
  const [prevUnreadCount, setPrevUnreadCount] = useState<number | null>(null);
  const recentNotifications: Notification[] = notificationsData?.items?.slice(0, 5) ?? [];

  useEffect(() => {
    if (prevUnreadCount === null) {
      setPrevUnreadCount(unreadCount);
      return;
    }
    if (unreadCount > prevUnreadCount) {
      playNotificationSound();
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, prevUnreadCount]);

  // Get supplier profile for company name and status
  const { data: profileData } = useQuery({
    queryKey: ['supplier', 'profile'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/suppliers/show.php?id=${user?.id}`);
      const data = await response.json();
      return data;
    },
    enabled: !!user?.id,
  });

  const companyName = profileData?.user?.company_name || profileData?.profile?.company_name || user?.name || 'Supplier';
  const supplierStatus = profileData?.user?.status || user?.status || 'active';

  const initials = companyName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const statusColors = {
    active: 'bg-green-500',
    pending: 'bg-amber-500',
    suspended: 'bg-red-500',
  };

  const statusLabels = {
    active: 'Active',
    pending: 'Pending',
    suspended: 'Suspended',
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await notificationsService.markRead(notification.id);
    }
    setNotificationDropdownOpen(false);
    // Navigate based on notification type
    if (notification.title.toLowerCase().includes('bid')) {
      navigate('/supplier/bids');
    } else if (notification.title.toLowerCase().includes('contract')) {
      navigate('/supplier/contracts');
    } else if (notification.title.toLowerCase().includes('tender')) {
      navigate('/supplier/tenders');
    }
  };

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    const unreadIds = recentNotifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await notificationsService.markReadMany(unreadIds);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Sidebar overlay (mobile) */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        aria-hidden
        style={{ opacity: sidebarOpen ? 1 : 0, pointerEvents: sidebarOpen ? 'auto' : 'none' }}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-[260px] shrink-0 flex-col border-r border-[#1e293b] bg-[#0f172a] transition-transform duration-300 ease-out md:flex',
          sidebarOpen ? 'translate-x-0 flex' : '-translate-x-full md:translate-x-0'
        )}
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-[#1e293b] px-4 md:justify-start">
            <Link to="/supplier/dashboard" className="flex items-center gap-2 font-bold text-white" style={{ fontSize: 18 }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e40af]">
                <LayoutDashboard className="h-5 w-5" />
              </span>
              Supplier Portal
            </Link>
            <button
              type="button"
              className="rounded p-2 text-[#94a3b8] hover:bg-[#1e293b] hover:text-white md:hidden md:p-2"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav 
            className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 #0f172a' }}
          >
            <NavSection title="Menu" items={mainNav} pathname={pathname} />
            <NavSection title="Support" items={supportNav} pathname={pathname} badgeCount={unreadCount} />
          </nav>

          {/* User section at bottom */}
          <div className="border-t border-[#1e293b] p-4">
            <div className="mb-3 flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e40af] text-sm font-bold text-white"
                style={{ width: 36, height: 36 }}
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{companyName}</p>
                <div className="flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full', statusColors[supplierStatus as keyof typeof statusColors])} />
                  <p className="truncate text-xs text-[#64748b]">{statusLabels[supplierStatus as keyof typeof statusLabels] || 'Active'}</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout().then(() => navigate('/login'))}
              className="flex items-center gap-1 text-xs text-[#94a3b8] transition-colors hover:text-red-400"
            >
              <LogOut className="h-3 w-3" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="min-h-screen md:ml-[260px]">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[#e2e8f0] bg-white px-3 md:h-16 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              type="button"
              className="rounded p-1.5 text-gray-600 hover:bg-gray-100 md:hidden md:p-2"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 md:text-xl">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <InstallAppButton />
            {/* Notification bell with dropdown */}
            <div className="relative">
              <button
                type="button"
                className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {notificationDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-100 p-4">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {recentNotifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No notifications yet
                      </div>
                    ) : (
                      recentNotifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            'w-full p-4 text-left hover:bg-gray-50',
                            !notification.is_read && 'bg-blue-50'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', notification.is_read ? 'bg-gray-300' : 'bg-blue-500')} />
                            <div className="min-w-0 flex-1">
                              <p className={cn('text-sm', notification.is_read ? 'text-gray-600' : 'font-medium text-gray-900')}>
                                {notification.title}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {new Date(notification.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <Link
                    to="/supplier/notifications"
                    onClick={() => setNotificationDropdownOpen(false)}
                    className="block border-t border-gray-100 p-3 text-center text-sm font-medium text-blue-600 hover:bg-gray-50"
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </div>

            {/* User name */}
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-sm font-medium text-gray-700">{companyName}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-3 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Click outside to close notification dropdown */}
      {notificationDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setNotificationDropdownOpen(false)}
        />
      )}
      <FloatingProcureAI />
    </div>
  );
}
