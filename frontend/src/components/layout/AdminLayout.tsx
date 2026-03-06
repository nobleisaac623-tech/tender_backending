import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Users,
  Ban,
  UserCog,
  BarChart2,
  FileCheck,
  Tags,
  FileSignature,
  Menu,
  X,
} from 'lucide-react';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { cn } from '@/utils/cn';

const SIDEBAR_WIDTH = 260;

const mainNav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/tenders', label: 'Tenders', icon: FileText },
  { to: '/admin/suppliers', label: 'Suppliers', icon: Users },
  { to: '/admin/blacklist', label: 'Blacklist', icon: Ban },
  { to: '/admin/evaluators', label: 'Evaluators', icon: UserCog },
];

const reportsNav = [
  { to: '/admin/reports', label: 'Reports', icon: BarChart2 },
  { to: '/admin/audit-log', label: 'Audit Log', icon: FileCheck },
];

const settingsNav = [
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/contracts', label: 'Contracts', icon: FileSignature },
];

const pathToTitle: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/tenders': 'Tenders',
  '/admin/tenders/create': 'Create Tender',
  '/admin/tenders/': 'Tender Details',
  '/admin/suppliers': 'Suppliers',
  '/admin/suppliers/': 'Supplier Details',
  '/admin/evaluators': 'Evaluators',
  '/admin/reports': 'Reports',
  '/admin/audit-log': 'Audit Log',
  '/admin/blacklist': 'Blacklist',
  '/admin/categories': 'Categories',
  '/admin/contracts': 'Contracts',
  '/admin/contracts/create': 'Create Contract',
  '/admin/contracts/': 'Contract Details',
};

function getPageTitle(pathname: string): string {
  if (pathToTitle[pathname]) return pathToTitle[pathname];
  if (pathname.startsWith('/admin/tenders/') && pathname !== '/admin/tenders/create')
    return 'Tender Details';
  if (pathname.startsWith('/admin/suppliers/')) return 'Supplier Details';
  if (pathname.startsWith('/admin/contracts/') && pathname !== '/admin/contracts/create')
    return 'Contract Details';
  return 'Admin';
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: { to: string; label: string; icon: React.ElementType }[];
  pathname: string;
}) {
  return (
    <>
      <p className="px-5 pb-2 pt-4 text-[11px] font-medium uppercase tracking-widest text-[#64748b] first:pt-0">
        {title}
      </p>
      {items.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || (to !== '/admin/dashboard' && pathname.startsWith(to + '/'));
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              'mx-3 mb-0.5 flex items-center rounded-lg px-5 py-2.5 text-[15px] transition-colors',
              active
                ? 'bg-[#1e40af] text-white'
                : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#e2e8f0]'
            )}
          >
            <Icon className="mr-3 h-[18px] w-[18px] shrink-0" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = location.pathname;
  const pageTitle = getPageTitle(pathname);

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'AD';

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
            <Link to="/admin/dashboard" className="flex items-center gap-2 font-bold text-white" style={{ fontSize: 18 }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e40af]">
                <LayoutDashboard className="h-5 w-5" />
              </span>
              Admin Panel
            </Link>
            <button
              type="button"
              className="rounded p-2 text-[#94a3b8] hover:bg-[#1e293b] hover:text-white md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-2">
            <NavSection title="Main Menu" items={mainNav} pathname={pathname} />
            <NavSection title="Reports" items={reportsNav} pathname={pathname} />
            <NavSection title="Settings" items={settingsNav} pathname={pathname} />
          </nav>

          <div className="border-t border-[#1e293b] p-4">
            <div className="mb-3 flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e40af] text-sm font-bold text-white"
                style={{ width: 36, height: 36 }}
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{user?.name}</p>
                <p className="truncate text-xs text-[#64748b]">{user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout().then(() => navigate('/login'))}
              className="text-xs text-[#94a3b8] transition-colors hover:text-red-400"
            >
              → Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="min-h-screen md:ml-[260px]">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[#e2e8f0] bg-white px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded p-2 text-gray-600 hover:bg-gray-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationsDropdown />
            <span className="hidden text-sm text-gray-600 sm:inline">{user?.name}</span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white sm:hidden"
              style={{ width: 32, height: 32 }}
            >
              {initials.slice(0, 1)}
            </span>
          </div>
        </header>

        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
