import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { bidsService } from '@/services/bids';
import { notificationsService } from '@/services/notifications';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Send,
  FileCheck,
  Star,
  Search,
  User,
  Clock,
  AlertTriangle,
  Bell,
  ChevronRight,
  Check,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Bid } from '@/types';

// ── Helper functions ────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getTimeRemaining(endDate: string): { days: number; hours: number; text: string } {
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);

  let text = '';
  if (days > 0) text += `${days}d `;
  text += `${hours}h`;
  if (days < 0 || hours < 0) text = 'Closed';

  return { days: Math.max(0, days), hours: Math.max(0, hours), text };
}

function getDeadlineColor(daysLeft: number): string {
  if (daysLeft > 7) return 'text-green-600';
  if (daysLeft >= 3) return 'text-amber-600';
  return 'text-red-600';
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

// ── Stat Card Component ─────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  link,
  isRating,
  rating,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  link?: string;
  isRating?: boolean;
  rating?: number;
}) {
  const colorClasses: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600' },
    green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600' },
    amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600' },
  };
  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {isRating ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-3xl font-bold text-gray-900">{rating && rating > 0 ? rating.toFixed(1) : '—'}</span>
              {rating && rating > 0 && <Star className="h-5 w-5 text-amber-500" fill="currentColor" />}
            </div>
          ) : (
            <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          )}
          {link && (
            <Link to={link} className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
              View <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', colors.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

// ── Tender Card Component ──────────────────────────────────────────────────────

function TenderCard({ tender, hasBid }: { tender: any; hasBid: boolean; onBid?: () => void }) {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(tender.submission_deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining(tender.submission_deadline));
    }, 60000);
    return () => clearInterval(timer);
  }, [tender.submission_deadline]);

  const deadlineColor = getDeadlineColor(timeRemaining.days);
  const categoryColor = tender.category_color || '#3b82f6';

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: categoryColor }} />
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-gray-900">{tender.title}</h3>
            <p className="text-sm text-gray-500">{tender.reference_number}</p>
          </div>
          {tender.category && (
            <Badge variant="secondary" className="ml-2 shrink-0 text-xs">
              {tender.category}
            </Badge>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
          {tender.budget && (
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Budget: {formatUsd(Number(tender.budget))}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Closes: {new Date(tender.submission_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className={cn('text-sm font-medium', deadlineColor)}>
            ⏱ {timeRemaining.text} left
          </span>
          <span className="text-sm text-gray-500">
            📬 {tender.bids_count || 0} bids
          </span>
        </div>

        <div className="mt-4">
          {hasBid ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-green-700">
              <Check className="h-5 w-5" />
              <span className="font-medium">Bid Submitted</span>
            </div>
          ) : (
            <Link
              to={`/supplier/tenders/${tender.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              View & Bid →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Deadline Alert Component ───────────────────────────────────────────────────

function DeadlineAlert({ tender }: { tender: any }) {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(tender.submission_deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining(tender.submission_deadline));
    }, 60000);
    return () => clearInterval(timer);
  }, [tender.submission_deadline]);

  const isUrgent = timeRemaining.days < 3;
  const colorClass = isUrgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const dotClass = isUrgent ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className={cn('flex items-center justify-between rounded-lg border p-3', colorClass)}>
      <div className="flex items-center gap-3">
        <span className={cn('h-2.5 w-2.5 rounded-full', dotClass)} />
        <div>
          <p className="font-medium text-gray-900">{tender.title}</p>
          <p className="text-sm text-gray-600">Closes in {timeRemaining.text}</p>
        </div>
      </div>
      <Link
        to={`/supplier/tenders/${tender.id}`}
        className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50"
      >
        Bid Now
      </Link>
    </div>
  );
}

// ── Bid Progress Tracker ───────────────────────────────────────────────────────

function BidProgressTracker({ bid }: { bid: any }) {
  const statusSteps = ['submitted', 'under_review', 'evaluated', 'result'];
  const currentStatus = bid.status?.toLowerCase().replace(' ', '_') || 'submitted';
  const currentIndex = statusSteps.indexOf(currentStatus);

  const stepLabels = ['Submitted', 'Under Review', 'Evaluated', 'Result'];
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500',
    submitted: 'bg-blue-500',
    under_review: 'bg-amber-500',
    evaluated: 'bg-blue-500',
    accepted: 'bg-green-500',
    rejected: 'bg-red-500',
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h4 className="font-semibold text-gray-900">{bid.tender_title || `Bid #${bid.id}`}</h4>
        <p className="text-sm text-gray-500">
          {bid.tender_reference && `${bid.tender_reference} • `}
          {bid.amount ? formatUsd(Number(bid.amount)) : ''}
        </p>
      </div>

      {/* Progress tracker */}
      <div className="flex items-center justify-between">
        {stepLabels.map((label, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === stepLabels.length - 1;

          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                    isCompleted ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white',
                    isCurrent && 'ring-2 ring-blue-500 ring-offset-2'
                  )}
                >
                  {isCompleted && <Check className="h-3.5 w-3.5 text-white" />}
                </div>
                <span className={cn('mt-1 text-[11px] text-gray-500', isCurrent && 'font-medium text-blue-600')}>
                  {label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'h-0.5 flex-1',
                    index < currentIndex ? 'bg-blue-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Badge className={cn('text-xs', statusColors[bid.status?.toLowerCase()] || 'bg-gray-100 text-gray-800')}>
          {bid.status || 'Unknown'}
        </Badge>
        <span className="text-xs text-gray-500">
          {bid.created_at && `Submitted ${new Date(bid.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        </span>
      </div>
    </div>
  );
}

// ── Main Dashboard Component ───────────────────────────────────────────────────

export function SupplierDashboard() {
  const { user } = useAuth();

  // Fetch data
  const { data: tendersData, isLoading: tendersLoading } = useQuery({
    queryKey: ['tenders', 'public'],
    queryFn: () => tendersService.list({ status: 'published', per_page: 10 }),
  });

  const { data: bidsData, isLoading: bidsLoading } = useQuery({
    queryKey: ['supplier', 'bids'],
    queryFn: () => bidsService.list({ per_page: 10 }),
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list({ per_page: 10 }),
  });

  const { data: supplierData } = useQuery({
    queryKey: ['supplier', 'profile'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/suppliers/show.php?id=${user?.id}`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Extract data
  const tenders = tendersData?.items || [];
  const bids = bidsData?.items || [];
  const notifications = notificationsData?.items || [];
  const unreadNotifications = notifications.filter((n: any) => !n.is_read).length;
  
  const supplier = supplierData?.user || supplierData?.profile || {};
  const companyName = supplier.company_name || user?.name || 'Supplier';
  const supplierStatus = supplier.status || user?.status || 'active';

  // Get tender IDs that have bids
  const tenderIdsWithBids = new Set(bids.map((b: Bid) => b.tender_id));

  // Calculate deadline alerts (tenders closing within 3 days without bids)
  const deadlineAlerts = tenders
    .filter((t: any) => {
      if (tenderIdsWithBids.has(t.id)) return false;
      const { days } = getTimeRemaining(t.submission_deadline);
      return days >= 0 && days <= 3;
    })
    .slice(0, 5);

  // Get active bids count
  const activeBidsCount = bids.filter((b: any) => 
    b.status?.toLowerCase() === 'submitted' || b.status?.toLowerCase() === 'under_review'
  ).length;

  // Get contracts count
  const { data: contractsData } = useQuery({
    queryKey: ['supplier', 'contracts'],
    queryFn: () => fetch(`${import.meta.env.VITE_API_URL || ''}/api/contracts/index.php`).then(r => r.json()),
  });
  const contractsCount = contractsData?.total || 0;

  // Get rating
  const { data: ratingData } = useQuery({
    queryKey: ['supplier', 'rating'],
    queryFn: () => fetch(`${import.meta.env.VITE_API_URL || ''}/api/ratings/by-contract.php?supplier_id=${user?.id}`).then(r => r.json()),
    enabled: !!user?.id,
  });
  const avgRating = ratingData?.average_overall || 0;

  // Current time for greeting
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = getGreeting();
  const formattedDate = currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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

  const canSubmitBid = supplierStatus === 'active';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {greeting}! 👋
            </h1>
            <p className="mt-1 font-medium text-gray-700">
              {companyName}
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">
                <span className={cn('h-2 w-2 rounded-full', statusColors[supplierStatus as keyof typeof statusColors])} />
                {statusLabels[supplierStatus as keyof typeof statusLabels] || 'Active'}
              </span>
            </p>
            {supplierStatus === 'pending' ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                ⏳ Your account is awaiting admin approval. You cannot submit bids until approved.
              </p>
            ) : supplierStatus === 'suspended' ? (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                ⚠️ Your account is suspended. Contact admin to resolve.
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-600">
                You have {unreadNotifications} unread notification{unreadNotifications !== 1 ? 's' : ''} 
                {deadlineAlerts.length > 0 && ` and ${deadlineAlerts.length} tender${deadlineAlerts.length !== 1 ? 's' : ''} closing soon`}.
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{formattedDate}</p>
            <p className="font-mono text-lg font-medium text-gray-900">{formattedTime}</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Open Tenders"
          value={tenders.length}
          color="blue"
          link="/supplier/tenders"
        />
        <StatCard
          icon={Send}
          label="Active Bids"
          value={activeBidsCount}
          color="green"
          link="/supplier/bids"
        />
        <StatCard
          icon={FileCheck}
          label="Contracts"
          value={contractsCount}
          color="purple"
          link="/supplier/contracts"
        />
        <StatCard
          icon={Star}
          label="Avg Rating"
          value={avgRating || '—'}
          color="amber"
          link="/supplier/performance"
          isRating={true}
          rating={avgRating}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link to="/supplier/tenders">
              <Button variant="outline" className="gap-2">
                <Search className="h-4 w-4" />
                Browse Tenders
              </Button>
            </Link>
            <Link to={canSubmitBid ? "/supplier/tenders" : "#"}>
              <Button 
                variant="outline" 
                className="gap-2 border-green-600 text-green-700 hover:bg-green-50"
                disabled={!canSubmitBid}
                title={!canSubmitBid ? "Your account must be active to submit bids" : ""}
              >
                <Send className="h-4 w-4" />
                Submit a Bid
              </Button>
            </Link>
            <Link to="/supplier/contracts">
              <Button variant="outline" className="gap-2 border-purple-600 text-purple-700 hover:bg-purple-50">
                <FileCheck className="h-4 w-4" />
                My Contracts
              </Button>
            </Link>
            <Link to="/supplier/profile">
              <Button variant="outline" className="gap-2">
                <User className="h-4 w-4" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left Column - Tenders & Alerts */}
        <div className="space-y-6 lg:col-span-3">
          {/* Open Tenders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Open Tenders</CardTitle>
              <Link to="/supplier/tenders" className="text-sm font-medium text-blue-600 hover:underline">
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              {tendersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : tenders.length === 0 ? (
                <div className="py-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-gray-500">No open tenders available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tenders.slice(0, 4).map((tender: any) => (
                    <TenderCard
                      key={tender.id}
                      tender={tender}
                      hasBid={tenderIdsWithBids.has(tender.id)}
                    />
                  ))}
                  {tenders.length > 4 && (
                    <Link to="/supplier/tenders" className="block text-center text-sm font-medium text-blue-600 hover:underline">
                      View all {tenders.length} tenders →
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deadline Alerts */}
          {deadlineAlerts.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Deadline Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deadlineAlerts.map((tender: any) => (
                  <DeadlineAlert key={tender.id} tender={tender} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Bids & Notifications */}
        <div className="space-y-6 lg:col-span-2">
          {/* My Recent Bids */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">My Recent Bids</CardTitle>
              <Link to="/supplier/bids" className="text-sm font-medium text-blue-600 hover:underline">
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              {bidsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : bids.length === 0 ? (
                <div className="py-8 text-center">
                  <Send className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-gray-500">No bids submitted yet</p>
                  <p className="text-sm text-gray-400">Browse open tenders and submit your first bid.</p>
                  <Link to="/supplier/tenders">
                    <Button variant="outline" className="mt-4">
                      Browse Tenders
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {bids.slice(0, 3).map((bid: any) => (
                    <BidProgressTracker key={bid.id} bid={bid} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications Panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Bell className="h-5 w-5" />
                Notifications
                {unreadNotifications > 0 && (
                  <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {unreadNotifications}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="py-6 text-center">
                  <Bell className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((notification: any) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'flex items-start gap-3 rounded-lg p-2',
                        !notification.is_read && 'bg-blue-50'
                      )}
                    >
                      <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', notification.is_read ? 'bg-gray-300' : 'bg-blue-500')} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm', notification.is_read ? 'text-gray-600' : 'font-medium text-gray-900')}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500">{formatRelativeTime(notification.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  <Link to="/supplier/notifications" className="block text-center text-sm font-medium text-blue-600 hover:underline">
                    View all notifications →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
