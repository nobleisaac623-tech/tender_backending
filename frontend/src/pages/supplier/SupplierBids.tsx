import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bidsService } from '@/services/bids';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/ui/ExportButton';
import { toastSuccess } from '@/hooks/useToast';
import { exportToExcel } from '@/utils/exportExcel';
import { LogOut } from 'lucide-react';

export function SupplierBids() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['supplier', 'bids', page],
    queryFn: () => bidsService.list({ page, per_page: 10 }),
  });

  const exportMyBids = () => {
    if (!data?.items?.length) return;
    toastSuccess('Exporting... your download will start shortly');
    const rows = data.items.map((b: { tender_title?: string; reference_number?: string; bid_amount?: number; status: string; submitted_at?: string }) => ({
      'Tender Title': b.tender_title ?? '—',
      Reference: b.reference_number ?? '—',
      'Bid Amount': b.bid_amount != null ? b.bid_amount : '—',
      Status: b.status,
      'Submitted At': b.submitted_at ? new Date(b.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
    }));
    exportToExcel(rows, 'my_bids');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/supplier/dashboard" className="font-semibold text-primary">Supplier</Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">My Bids</h1>
          <ExportButton
            label="Export My Bids"
            onClick={exportMyBids}
            empty={!data?.items?.length}
          />
        </div>
        {isLoading && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {data?.items && (
          <div className="mt-6 space-y-4">
            {data.items.map((b) => (
              <Card key={b.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">{b.tender_title ?? `Bid #${b.id}`}</CardTitle>
                  <Badge variant={b.status === 'submitted' ? 'success' : 'secondary'}>{b.status}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{b.reference_number}</p>
                  <p className="text-sm text-gray-500">Amount: {b.bid_amount != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(b.bid_amount) : '—'}</p>
                  <p className="text-sm text-gray-500">Submitted: {b.submitted_at ?? 'Draft'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {data && data.total > 10 && (
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="flex items-center px-4 text-sm text-gray-600">Page {page}</span>
            <Button variant="outline" disabled={page * 10 >= data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </main>
    </div>
  );
}
