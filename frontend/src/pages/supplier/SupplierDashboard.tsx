import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { bidsService } from '@/services/bids';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, FileText, ClipboardList } from 'lucide-react';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';

export function SupplierDashboard() {
  const { user, logout } = useAuth();
  const { data: tendersData } = useQuery({
    queryKey: ['supplier', 'tenders'],
    queryFn: () => tendersService.list({ per_page: 5 }),
  });
  const { data: bidsData } = useQuery({
    queryKey: ['supplier', 'bids'],
    queryFn: () => bidsService.list({ per_page: 5 }),
  });
  const { data: notifData } = useQuery({
    queryKey: ['supplier', 'notifications'],
    queryFn: () => notificationsService.list({ per_page: 5, unread_only: true }),
  });

  const openTenders = tendersData?.items ?? [];
  const myBids = bidsData?.items ?? [];
  const tendersLoading = tendersData === undefined;
  const bidsLoading = bidsData === undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl flex-wrap items-center justify-between gap-2 px-4">
          <Link to="/supplier/dashboard" className="font-semibold text-primary">Supplier</Link>
          <nav className="flex gap-4">
            <Link to="/supplier/tenders" className="text-sm text-gray-600 hover:text-primary">Tenders</Link>
            <Link to="/supplier/bids" className="text-sm text-gray-600 hover:text-primary">My Bids</Link>
            <Link to="/supplier/contracts" className="text-sm text-gray-600 hover:text-primary">My Contracts</Link>
            <Link to="/supplier/performance" className="text-sm text-gray-600 hover:text-primary">Performance</Link>
            <Link to="/supplier/profile" className="text-sm text-gray-600 hover:text-primary">Profile</Link>
          </nav>
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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-gray-600">Open tenders and your bids.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Open Tenders</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              {tendersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
                  ))}
                </div>
              ) : openTenders.length === 0 ? (
                <p className="text-sm text-gray-500">No open tenders.</p>
              ) : (
                <>
                  {openTenders.slice(0, 3).map((t) => (
                    <Link key={t.id} to={`/supplier/tenders/${t.id}`} className="block rounded p-2 hover:bg-gray-50">
                      <p className="font-medium">{t.title}</p>
                      <p className="text-sm text-gray-500">{t.reference_number}</p>
                    </Link>
                  ))}
                  <Link to="/supplier/tenders">
                    <Button variant="link" className="mt-2 p-0 text-primary">View all</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">My Bids</CardTitle>
              <ClipboardList className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              {bidsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
                  ))}
                </div>
              ) : myBids.length === 0 ? (
                <p className="text-sm text-gray-500">No bids yet.</p>
              ) : (
                <>
                  {myBids.slice(0, 3).map((b) => (
                    <div key={b.id} className="rounded p-2">
                      <p className="font-medium">{b.tender_title ?? `Bid #${b.id}`}</p>
                      <Badge variant="secondary" className="mt-1">{b.status}</Badge>
                    </div>
                  ))}
                  <Link to="/supplier/bids">
                    <Button variant="link" className="mt-2 p-0 text-primary">View all</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
