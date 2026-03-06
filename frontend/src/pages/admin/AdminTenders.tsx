import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TenderFilterBar, type TenderFilterState } from '@/components/tenders/TenderFilterBar';
import { CategoryBadge } from '@/components/tenders/CategoryBadge';
import { TagChip } from '@/components/tenders/TagChip';
import { ExportButton } from '@/components/ui/ExportButton';
import { toastSuccess } from '@/hooks/useToast';
import { exportToExcel } from '@/utils/exportExcel';
import { Plus } from 'lucide-react';

export function AdminTenders() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TenderFilterState>({ category_id: null, search: '', tag: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'tenders', page, filters, statusFilter],
    queryFn: () => tendersService.list({
      page, per_page: 10,
      search: filters.search || undefined,
      status: statusFilter || undefined,
      category_id: filters.category_id ?? undefined,
      tag: filters.tag || undefined,
    }),
  });

  return (
    <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Tenders</h1>
          <div className="flex items-center gap-2">
            <ExportButton
              label="Export Tenders"
              onClick={() => {
                if (!data?.items?.length) return;
                toastSuccess('Exporting... your download will start shortly');
                const rows = data.items.map((t: { reference_number: string; title: string; category_name?: string; budget?: number; submission_deadline: string; status: string; bids_count?: number; created_at?: string }) => ({
                  Reference: t.reference_number,
                  Title: t.title,
                  Category: t.category_name ?? '—',
                  Budget: t.budget != null ? t.budget : '—',
                  Deadline: t.submission_deadline,
                  Status: t.status,
                  'Bids Received': (t as { bids_count?: number }).bids_count ?? 0,
                  'Created At': t.created_at ? new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
                }));
                exportToExcel(rows, 'tenders_list');
              }}
              empty={!data?.items?.length}
            />
            <Link to="/admin/tenders/create">
              <Button><Plus className="mr-2 h-4 w-4" />Create Tender</Button>
            </Link>
          </div>
        </div>
        <TenderFilterBar
          filters={filters}
          onFilterChange={setFilters}
          total={data?.total}
          showStatusFilter
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
        {isLoading && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {data?.items && data.items.length === 0 && (
          <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white/50 py-12 text-center">
            <p className="text-gray-500">No tenders match your filters.</p>
            <Link to="/admin/tenders/create" className="mt-2 inline-block">
              <Button variant="outline" size="sm">Create your first tender</Button>
            </Link>
          </div>
        )}
        {data?.items && data.items.length > 0 && (
          <div className="mt-6 space-y-4">
            {data.items.map((t) => (
              <Card key={t.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">
                    <Link to={`/admin/tenders/${t.id}`} className="hover:underline">{t.title}</Link>
                  </CardTitle>
                  <Badge variant={t.status === 'published' ? 'success' : 'secondary'}>{t.status}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {t.category_name && (
                      <CategoryBadge category_name={t.category_name} category_color={t.category_color} />
                    )}
                    {t.tags && t.tags.length > 0 && (
                      <>
                        {t.tags.slice(0, 3).map((tag) => (
                          <TagChip key={tag} tag={tag} />
                        ))}
                        {t.tags.length > 3 && (
                          <span className="text-xs text-gray-500">+{t.tags.length - 3} more</span>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{t.reference_number}</p>
                  <p className="text-sm text-gray-500">Deadline: {t.submission_deadline}</p>
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
