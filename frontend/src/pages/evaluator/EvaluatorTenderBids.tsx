import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { bidsService } from '@/services/bids';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/ui/ExportButton';
import { toastSuccess } from '@/hooks/useToast';
import { exportToExcel } from '@/utils/exportExcel';
import { LogOut, ArrowLeft } from 'lucide-react';

export function EvaluatorTenderBids() {
  const { id } = useParams<{ id: string }>();
  const tenderId = id ? parseInt(id, 10) : 0;
  const { user, logout } = useAuth();

  const { data: tender } = useQuery({
    queryKey: ['tender', tenderId],
    queryFn: () => tendersService.show(tenderId),
    enabled: tenderId > 0,
  });

  const { data: bidsData, isLoading } = useQuery({
    queryKey: ['bids', tenderId],
    queryFn: () => bidsService.list({ tender_id: tenderId }),
    enabled: tenderId > 0,
  });

  const [exportLoading, setExportLoading] = useState(false);
  const formatDate = (d: string | undefined) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const exportBids = () => {
    if (!bidsData?.items?.length || !tender) return;
    setExportLoading(true);
    toastSuccess('Exporting... your download will start shortly');
    const rows = bidsData.items.map((b: { supplier_name?: string; company_name?: string; bid_amount?: number; technical_proposal?: string; status: string; submitted_at?: string }) => ({
      'Supplier Name': b.supplier_name ?? '—',
      Company: (b as { company_name?: string }).company_name ?? '—',
      'Bid Amount (GHS)': b.bid_amount != null ? b.bid_amount : '—',
      'Technical Proposal (truncated)': (b.technical_proposal ?? '').slice(0, 200) + ((b.technical_proposal?.length ?? 0) > 200 ? '...' : ''),
      Status: b.status,
      'Submitted At': formatDate(b.submitted_at),
    }));
    exportToExcel(rows, `bids_${tender.reference_number}`);
    setExportLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/evaluator/dashboard" className="font-semibold text-primary">Evaluator</Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/evaluator/tenders" className="mb-4 inline-flex items-center text-sm text-primary hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Tenders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{tender?.title ?? 'Bids'}</h1>
            <p className="mt-1 text-sm text-gray-600">{tender?.reference_number}</p>
          </div>
          <ExportButton
            label="Export Bids"
            onClick={exportBids}
            loading={exportLoading}
            empty={!bidsData?.items?.length}
          />
        </div>
        {isLoading && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {bidsData?.items && (
          <div className="mt-6 space-y-4">
            {bidsData.items.map((b) => (
              <Card key={b.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Bid #{b.id}</CardTitle>
                  <Badge variant="secondary">{b.status}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Amount: {b.bid_amount != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(b.bid_amount) : '—'}</p>
                  <Link to={`/evaluator/bids/${b.id}/evaluate`}>
                    <Button variant="outline" size="sm" className="mt-2">Score / Evaluate</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {bidsData?.items?.length === 0 && !isLoading && (
          <p className="mt-6 text-gray-500">No submitted bids yet.</p>
        )}
      </main>
    </div>
  );
}
