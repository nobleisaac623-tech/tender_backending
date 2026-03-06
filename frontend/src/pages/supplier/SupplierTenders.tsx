import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TenderFilterBar, type TenderFilterState } from '@/components/tenders/TenderFilterBar';
import { CategoryBadge } from '@/components/tenders/CategoryBadge';
import { TagChip } from '@/components/tenders/TagChip';
import { LogOut } from 'lucide-react';

export function SupplierTenders() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TenderFilterState>({ category_id: null, search: '', tag: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['supplier', 'tenders', page, filters],
    queryFn: () => tendersService.list({
      page, per_page: 10,
      search: filters.search || undefined,
      category_id: filters.category_id ?? undefined,
      tag: filters.tag || undefined,
    }),
  });

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
        <h1 className="text-2xl font-bold">Open Tenders</h1>
        <TenderFilterBar filters={filters} onFilterChange={setFilters} total={data?.total} />
        {isLoading && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {data?.items && (
          <div className="mt-6 space-y-4">
            {data.items.map((t) => (
              <Card key={t.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">
                    <Link to={`/supplier/tenders/${t.id}`} className="hover:underline">{t.title}</Link>
                  </CardTitle>
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
                  <p className="text-sm text-gray-600">{t.reference_number} · Deadline: {t.submission_deadline}</p>
                  <Link to={`/supplier/tenders/${t.id}`}>
                    <Button variant="outline" size="sm" className="mt-2">View & Bid</Button>
                  </Link>
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
