import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analytics';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Users,
  Send,
  Clock,
  Plus,
  UserCheck,
  UserPlus,
  BarChart2,
  Calendar,
} from 'lucide-react';
import { TendersByStatusChart } from '@/components/charts/TendersByStatusChart';
import { BidsPerTenderChart } from '@/components/charts/BidsPerTenderChart';
import { SupplierRegistrationsChart } from '@/components/charts/SupplierRegistrationsChart';
import { EvaluationCompletionChart } from '@/components/charts/EvaluationCompletionChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { cn } from '@/utils/cn';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const statCardConfig = [
  {
    key: 'tenders',
    label: 'Total Tenders',
    gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    borderColor: '#bfdbfe',
    icon: FileText,
    iconColor: '#3b82f6',
    link: '/admin/tenders',
    linkLabel: 'View all',
    trend: '+1 this month',
    trendUp: true,
  },
  {
    key: 'suppliers',
    label: 'Total Suppliers',
    gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    borderColor: '#bbf7d0',
    icon: Users,
    iconColor: '#16a34a',
    link: '/admin/suppliers',
    linkLabel: 'View all',
    trend: '+1 this month',
    trendUp: true,
  },
  {
    key: 'bids',
    label: 'Total Bids',
    gradient: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
    borderColor: '#fde68a',
    icon: Send,
    iconColor: '#ca8a04',
    link: '/admin/tenders',
    linkLabel: 'View tenders',
    trend: '+0 this month',
    trendUp: false,
  },
  {
    key: 'pending',
    label: 'Pending Approvals',
    gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    borderColor: '#fed7aa',
    icon: Clock,
    iconColor: '#ea580c',
    link: '/admin/suppliers',
    linkLabel: 'Review suppliers',
    trend: null,
    trendUp: false,
    pulseWhenPositive: true,
  },
];

export function AdminDashboard() {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => analyticsService.getAnalytics(),
  });

  const summary = analytics?.summary;
  const tendersByStatusEmpty =
    !analytics?.tenders_by_status?.length ||
    analytics.tenders_by_status.every((d) => d.count === 0);
  const bidsPerTenderEmpty =
    !analytics?.bids_per_tender?.length ||
    analytics.bids_per_tender.every((d) => d.bid_count === 0);
  const registrationsEmpty =
    !analytics?.supplier_registrations?.length ||
    analytics.supplier_registrations.every((d) => d.count === 0);
  const evalCompletion = analytics?.evaluation_completion;
  const evalEmpty =
    !evalCompletion ||
    (evalCompletion.completed === 0 && evalCompletion.pending === 0);

  const greeting = getGreeting();
  const pendingCount = summary?.pending_approvals ?? 0;

  const statValues: Record<string, number> = {
    tenders: summary?.total_tenders ?? 0,
    suppliers: summary?.total_suppliers ?? 0,
    bids: summary?.total_bids ?? 0,
    pending: pendingCount,
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <Card className="overflow-hidden rounded-xl border-slate-100 shadow-sm" style={{ borderLeft: '4px solid #3b82f6' }}>
        <CardContent className="flex flex-col gap-4 bg-gradient-to-r from-[#f0f9ff] to-white p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {greeting}, {user?.name?.split(' ')[0] ?? 'Admin'}! 👋
            </h2>
            <p className="mt-1 text-gray-600">
              Here&apos;s what&apos;s happening with your procurement today.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 md:items-end">
            <p className="text-sm font-medium text-gray-700">
              {formatDate(time)}
            </p>
            <p className="text-lg font-mono text-gray-800">
              {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <span className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-4 w-4" />
              {time.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCardConfig.map((config) => {
          const value = statValues[config.key];
          const Icon = config.icon;
          const showPulse = config.pulseWhenPositive && value > 0;
          return (
            <Link
              key={config.key}
              to={config.link}
              className={cn(
                'rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-md',
                showPulse ? 'border-[#f97316]' : ''
              )}
              style={{
                background: config.gradient,
                borderColor: showPulse ? '#f97316' : config.borderColor,
                borderWidth: 1,
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748b]">{config.label}</p>
                  {isLoading ? (
                    <div className="mt-1 h-12 w-16 animate-pulse rounded bg-black/10" />
                  ) : (
                    <p className="mt-1 text-4xl font-bold text-[#0f172a]">{value}</p>
                  )}
                  {config.trend && (
                    <p
                      className={cn(
                        'mt-1 text-xs',
                        config.trendUp ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {config.trendUp ? '↑' : '↓'} {config.trend}
                    </p>
                  )}
                </div>
                <span
                  className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-lg"
                  style={{ boxShadow: `0 4px 12px ${config.iconColor}33` }}
                >
                  {showPulse && (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-orange-500 animate-pulse"
                      aria-hidden
                    />
                  )}
                  <Icon className="h-7 w-7" style={{ color: config.iconColor }} />
                </span>
              </div>
              <div className="mt-4 border-t border-black/5 pt-3">
                <span
                  className="text-sm font-medium"
                  style={{ color: config.iconColor }}
                >
                  {config.linkLabel} →
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="rounded-xl border-slate-100 p-6 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-gray-900">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/tenders/create"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#3b82f6] bg-transparent px-4 py-2 text-sm font-medium text-[#3b82f6] transition-colors hover:bg-[#3b82f6] hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Create Tender
          </Link>
          <Link
            to="/admin/suppliers?filter=pending"
            className="relative inline-flex items-center gap-2 rounded-full border-2 border-[#16a34a] bg-transparent px-4 py-2 text-sm font-medium text-[#16a34a] transition-colors hover:bg-[#16a34a] hover:text-white"
          >
            <UserCheck className="h-4 w-4" />
            Approve Suppliers
            {pendingCount > 0 && (
              <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
          <Link
            to="/admin/evaluators"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#8b5cf6] bg-transparent px-4 py-2 text-sm font-medium text-[#8b5cf6] transition-colors hover:bg-[#8b5cf6] hover:text-white"
          >
            <UserPlus className="h-4 w-4" />
            Add Evaluator
          </Link>
          <Link
            to="/admin/reports"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#f59e0b] bg-transparent px-4 py-2 text-sm font-medium text-[#f59e0b] transition-colors hover:bg-[#f59e0b] hover:text-white"
          >
            <BarChart2 className="h-4 w-4" />
            View Reports
          </Link>
        </div>
      </Card>

      {/* Tenders by Status + Evaluation Donut */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-xl border-slate-100 p-6 shadow-sm">
          <CardHeader className="px-0 pb-2 pt-0">
            <CardTitle className="text-base font-bold text-gray-900">
              Tenders by Status
            </CardTitle>
            <p className="text-sm text-gray-500">Count of tenders in each status</p>
          </CardHeader>
          <CardContent className="px-0">
            {isLoading ? (
              <div className="h-[280px] animate-pulse rounded bg-gray-100" />
            ) : (
              <TendersByStatusChart
                data={analytics?.tenders_by_status ?? []}
                isEmpty={tendersByStatusEmpty}
              />
            )}
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-slate-100 p-6 shadow-sm">
          <CardHeader className="px-0 pb-2 pt-0">
            <CardTitle className="text-base font-bold text-gray-900">
              Evaluation Completion
            </CardTitle>
            <p className="text-sm text-gray-500">
              Closed tenders: evaluated vs pending review
            </p>
          </CardHeader>
          <CardContent className="px-0">
            {isLoading ? (
              <div className="h-[280px] animate-pulse rounded bg-gray-100" />
            ) : (
              <EvaluationCompletionChart
                completed={evalCompletion?.completed ?? 0}
                pending={evalCompletion?.pending ?? 0}
                isEmpty={evalEmpty}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bids per Tender (60%) + Recent Activity (40%) */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card className="overflow-hidden rounded-xl border-slate-100 p-6 shadow-sm">
            <CardHeader className="px-0 pb-2 pt-0">
              <CardTitle className="text-base font-bold text-gray-900">
                Bids per Tender (Top 8)
              </CardTitle>
              <p className="text-sm text-gray-500">
                Number of bids received per tender
              </p>
            </CardHeader>
            <CardContent className="px-0">
              {isLoading ? (
                <div className="h-[280px] animate-pulse rounded bg-gray-100" />
              ) : (
                <BidsPerTenderChart
                  data={analytics?.bids_per_tender ?? []}
                  isEmpty={bidsPerTenderEmpty}
                />
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed
            items={analytics?.recent_activity}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Supplier Registrations - full width */}
      <Card className="overflow-hidden rounded-xl border-slate-100 p-6 shadow-sm">
        <CardHeader className="px-0 pb-2 pt-0">
          <CardTitle className="text-base font-bold text-gray-900">
            Supplier Registrations
          </CardTitle>
          <p className="text-sm text-gray-500">
            New supplier sign-ups in the last 6 months
          </p>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="h-[280px] animate-pulse rounded bg-gray-100" />
          ) : (
            <SupplierRegistrationsChart
              data={analytics?.supplier_registrations ?? []}
              isEmpty={registrationsEmpty}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
