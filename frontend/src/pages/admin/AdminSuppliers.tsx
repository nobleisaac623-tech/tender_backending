import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { suppliersService } from '@/services/suppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/ui/ExportButton';
import { toastSuccess } from '@/hooks/useToast';
import { exportToExcel } from '@/utils/exportExcel';
import { Search } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';

export function AdminSuppliers() {
  const [searchParams] = useSearchParams();
  const filterPending = searchParams.get('filter') === 'pending';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [blacklistedOnly, setBlacklistedOnly] = useState(false);
  const statusFilter = filterPending ? 'pending' : undefined;
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'suppliers', page, search, blacklistedOnly, statusFilter],
    queryFn: () => suppliersService.list({ page, per_page: 10, search: search || undefined, blacklisted_only: blacklistedOnly || undefined, status: statusFilter }),
  });

  return (
    <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <ExportButton
            label="Export Suppliers"
            onClick={() => {
              if (!data?.items?.length) return;
              toastSuccess('Exporting... your download will start shortly');
              const rows = data.items.map((s: { name: string; email: string; company_name?: string; registration_number?: string; category?: string; phone?: string; status: string; is_approved?: boolean; created_at?: string }) => ({
                Name: s.name,
                Email: s.email,
                Company: (s as { company_name?: string }).company_name ?? '—',
                'Registration No.': (s as { registration_number?: string }).registration_number ?? '—',
                Category: (s as { category?: string }).category ?? '—',
                Phone: (s as { phone?: string }).phone ?? '—',
                Status: s.status,
                Approved: (s as { is_approved?: boolean }).is_approved ? 'Yes' : 'No',
                'Registered At': s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
              }));
              exportToExcel(rows, 'suppliers_list');
            }}
            empty={!data?.items?.length}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={blacklistedOnly}
              onChange={(e) => setBlacklistedOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show blacklisted only
          </label>
        </div>
        {isLoading && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
            {data?.items && (
          <div className="mt-6 space-y-4">
            {data.items.map((s) => {
              const ratingSummary = (s as { rating_summary?: { average_overall: number | null; total_contracts_rated: number } }).rating_summary;
              return (
              <Card key={s.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">
                    <Link to={`/admin/suppliers/${s.id}`} className="hover:underline">{s.name}</Link>
                    {ratingSummary && ratingSummary.total_contracts_rated > 0 ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-sm font-normal text-amber-700">
                        <StarRating value={ratingSummary.average_overall ?? 0} size="sm" showValue={true} />
                        <span className="text-gray-500">({ratingSummary.total_contracts_rated} ratings)</span>
                      </span>
                    ) : (
                      <span className="ml-2 text-sm font-normal text-gray-500">No ratings yet</span>
                    )}
                    {(s as { is_blacklisted?: boolean }).is_blacklisted && (
                      <Badge variant="destructive" className="ml-2">Blacklisted</Badge>
                    )}
                  </CardTitle>
                  <Badge variant={s.status === 'active' ? 'success' : s.status === 'pending' ? 'warning' : 'secondary'}>{s.status}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{s.email}</p>
                  <p className="text-sm text-gray-500">{(s as { company_name?: string }).company_name ?? '—'}</p>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
        {data?.items && data.items.length === 0 && !isLoading && (
          <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white/50 py-12 text-center">
            <p className="text-gray-500">No suppliers found.</p>
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
