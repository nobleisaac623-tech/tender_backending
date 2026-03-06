import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/services/categories';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';

export interface TenderFilterState {
  category_id: number | null;
  search: string;
  tag: string;
}

interface TenderFilterBarProps {
  filters: TenderFilterState;
  onFilterChange: (f: TenderFilterState) => void;
  total?: number;
  /** Show status dropdown (admin list) */
  showStatusFilter?: boolean;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

export function TenderFilterBar({
  filters,
  onFilterChange,
  total,
  showStatusFilter,
  statusFilter = '',
  onStatusFilterChange,
}: TenderFilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const setCategory = (id: number | null) => {
    onFilterChange({ ...filters, category_id: id });
  };
  const setSearch = (search: string) => {
    onFilterChange({ ...filters, search });
  };
  const setTag = (tag: string) => {
    onFilterChange({ ...filters, tag });
  };

  const hasActiveFilters = filters.category_id != null || filters.search !== '' || filters.tag !== '';

  const filterContent = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={filters.category_id == null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategory(null)}
        >
          All
        </Button>
        {categories.map((c) => (
          <Button
            key={c.id}
            type="button"
            variant={filters.category_id === c.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory(c.id)}
            style={filters.category_id === c.id ? { backgroundColor: c.color, borderColor: c.color } : undefined}
          >
            {c.name}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search title, reference..."
            className="pl-8"
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input
          placeholder="Filter by tag"
          className="max-w-[140px]"
          value={filters.tag}
          onChange={(e) => setTag(e.target.value)}
        />
        {showStatusFilter && onStatusFilterChange && (
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
            <option value="evaluated">Evaluated</option>
            <option value="awarded">Awarded</option>
          </select>
        )}
      </div>
      {total !== undefined && (
        <p className="text-sm text-gray-600 whitespace-nowrap">
          {total} tender{total !== 1 ? 's' : ''} found
        </p>
      )}
    </>
  );

  return (
    <div className="border-b border-gray-200 bg-white py-4">
      <div className="mx-auto max-w-6xl px-4">
        {/* Desktop: horizontal bar */}
        <div className="hidden md:flex flex-wrap items-center gap-4">
          {filterContent}
        </div>
        {/* Mobile: Filter button + dropdown */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMobileOpen((o) => !o)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">1</span>
              )}
            </Button>
            {total !== undefined && (
              <span className="text-sm text-gray-600">{total} tenders found</span>
            )}
          </div>
          {mobileOpen && (
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              {filterContent}
              <Button type="button" variant="ghost" size="sm" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4 mr-1" /> Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
