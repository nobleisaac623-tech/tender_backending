import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analytics';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, FileText, Users, ClipboardList, LayoutDashboard, Clock } from 'lucide-react';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { TendersByStatusChart } from '@/components/charts/TendersByStatusChart';
import { BidsPerTenderChart } from '@/components/charts/BidsPerTenderChart';
import { SupplierRegistrationsChart } from '@/components/charts/SupplierRegistrationsChart';
import { EvaluationCompletionChart } from '@/components/charts/EvaluationCompletionChart';

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => analyticsService.getAnalytics(),
  });

  const summary = analytics?.summary;
  const tendersByStatusEmpty = !analytics?.tenders_by_status?.length || analytics.tenders_by_status.every((d) => d.count === 0);
  const bidsPerTenderEmpty = !analytics?.bids_per_tender?.length || analytics.bids_per_tender.every((d) => d.bid_count === 0);
  const registrationsEmpty = !analytics?.supplier_registrations?.length || analytics.supplier_registrations.every((d) => d.count === 0);
  const evalCompletion = analytics?.evaluation_completion;
  const evalEmpty = !evalCompletion || (evalCompletion.completed === 0 && evalCompletion.pending === 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl flex-wrap items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-6">
            <Link to="/admin/dashboard" className="font-semibold text-primary">
              Admin
            </Link>
            <nav className="flex gap-4">
              <Link to="/admin/tenders" className="text-sm text-gray-600 hover:text-primary">Tenders</Link>
              <Link to="/admin/suppliers" className="text-sm text-gray-600 hover:text-primary">Suppliers</Link>
              <Link to="/admin/blacklist" className="text-sm text-gray-600 hover:text-primary">Blacklist</Link>
              <Link to="/admin/evaluators" className="text-sm text-gray-600 hover:text-primary">Evaluators</Link>
              <Link to="/admin/reports" className="text-sm text-gray-600 hover:text-primary">Reports</Link>
              <Link to="/admin/audit-log" className="text-sm text-gray-600 hover:text-primary">Audit Log</Link>
              <Link to="/admin/categories" className="text-sm text-gray-600 hover:text-primary">Categories</Link>
              <Link to="/admin/contracts" className="text-sm text-gray-600 hover:text-primary">Contracts</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">Overview of tenders, suppliers, and bids.</p>

        {/* Summary stat cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Tenders</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-12 animate-pulse rounded bg-gray-200" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{summary?.total_tenders ?? 0}</p>
                  <Link to="/admin/tenders">
                    <Button variant="link" className="mt-1 p-0 h-auto text-primary text-sm">View all</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Suppliers</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-12 animate-pulse rounded bg-gray-200" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{summary?.total_suppliers ?? 0}</p>
                  <Link to="/admin/suppliers">
                    <Button variant="link" className="mt-1 p-0 h-auto text-primary text-sm">View all</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Bids</CardTitle>
              <ClipboardList className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-12 animate-pulse rounded bg-gray-200" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{summary?.total_bids ?? 0}</p>
                  <Link to="/admin/tenders">
                    <Button variant="link" className="mt-1 p-0 h-auto text-primary text-sm">View tenders</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
          <Card
            className={`rounded-lg border shadow-sm ${
              (summary?.pending_approvals ?? 0) > 0
                ? 'border-amber-200 bg-amber-50/50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-12 animate-pulse rounded bg-gray-200" />
              ) : (
                <>
                  <p className={`text-2xl font-bold ${(summary?.pending_approvals ?? 0) > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                    {summary?.pending_approvals ?? 0}
                  </p>
                  <Link to="/admin/suppliers">
                    <Button variant="link" className="mt-1 p-0 h-auto text-primary text-sm">Review suppliers</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts row 1: Tenders by status + Evaluation donut */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <CardHeader className="px-0 pb-2 pt-0">
              <CardTitle className="text-base font-bold text-gray-900">Tenders by Status</CardTitle>
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
          <Card className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <CardHeader className="px-0 pb-2 pt-0">
              <CardTitle className="text-base font-bold text-gray-900">Evaluation Completion</CardTitle>
              <p className="text-sm text-gray-500">Closed tenders: evaluated vs pending review</p>
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

        {/* Bids per tender - full width */}
        <Card className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <CardHeader className="px-0 pb-2 pt-0">
            <CardTitle className="text-base font-bold text-gray-900">Bids per Tender (Top 8)</CardTitle>
            <p className="text-sm text-gray-500">Number of bids received per tender</p>
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

        {/* Supplier registrations - full width */}
        <Card className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <CardHeader className="px-0 pb-2 pt-0">
            <CardTitle className="text-base font-bold text-gray-900">Supplier Registrations</CardTitle>
            <p className="text-sm text-gray-500">New supplier sign-ups in the last 6 months</p>
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

        <div className="mt-8">
          <Link to="/admin/tenders/create">
            <Button>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Create Tender
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
