import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bidsService } from '@/services/bids';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/ui/ExportButton';
import { toastSuccess } from '@/hooks/useToast';
import { exportToExcel } from '@/utils/exportExcel';

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function formatDateTime(value?: string): string {
  if (!value) return 'Draft';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function displayBidStatus(status: string): string {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'submitted') return 'Submitted';
  if (normalized === 'under_review') return 'Under review';
  if (normalized === 'accepted') return 'Accepted';
  if (normalized === 'rejected') return 'Rejected';
  if (normalized === 'draft') return 'Draft';
  return status || 'Unknown';
}

export function SupplierBids() {
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
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Bids</h1>
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
                <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base sm:text-lg">{b.tender_title ?? `Bid #${b.id}`}</CardTitle>
                  <Badge variant={b.status === 'submitted' ? 'success' : 'secondary'}>{displayBidStatus(b.status)}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{b.reference_number}</p>
                  <p className="text-sm text-gray-500">Amount: {b.bid_amount != null ? formatUsd(b.bid_amount) : '—'}</p>
                  <p className="text-sm text-gray-500">Submitted: {formatDateTime(b.submitted_at)}</p>
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
    </div>
  );
}
