import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersService } from '@/services/suppliers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ui/ExportButton';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { exportToExcel } from '@/utils/exportExcel';
import { Search, Mail, Phone, MapPin, Calendar, Star, CheckCircle2, X } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';

// ── Avatar helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500',
  'bg-red-500', 'bg-teal-500', 'bg-pink-500',
];

function getAvatarColor(name: string): string {
  const code = (name.charCodeAt(0) || 65) - 65;
  return AVATAR_COLORS[Math.abs(code) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ── Status helpers ────────────────────────────────────────────────────────────
type SupplierStatus = 'pending' | 'active' | 'suspended' | 'blacklisted';

const STATUS_STYLES: Record<SupplierStatus, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: 'bg-amber-50',   text: 'text-amber-800',  dot: 'bg-amber-400',  label: 'Pending' },
  active:      { bg: 'bg-green-50',   text: 'text-green-800',  dot: 'bg-green-500',  label: 'Active' },
  suspended:   { bg: 'bg-red-50',     text: 'text-red-800',    dot: 'bg-red-500',    label: 'Suspended' },
  blacklisted: { bg: 'bg-rose-950',   text: 'text-white',      dot: 'bg-rose-500',   label: 'Blacklisted' },
};

function resolveStatus(s: { status: string; is_approved?: boolean; is_blacklisted?: boolean }): SupplierStatus {
  if (s.is_blacklisted) return 'blacklisted';
  if (s.is_approved && s.status === 'pending') return 'active';
  if (s.status === 'suspended') return 'suspended';
  if (s.status === 'active') return 'active';
  return 'pending';
}

function StatusBadge({ status }: { status: SupplierStatus }) {
  const st = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.bg} ${st.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
      {st.label}
    </span>
  );
}

// ── Supplier type ─────────────────────────────────────────────────────────────
interface SupplierItem {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at?: string;
  company_name?: string;
  registration_number?: string;
  category?: string;
  category_color?: string;
  phone?: string;
  address?: string;
  is_approved?: boolean;
  is_blacklisted?: boolean;
  rating_summary?: { average_overall: number | null; total_contracts_rated: number };
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'pending' | 'active' | 'suspended' | 'blacklisted';
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'active',      label: 'Active' },
  { key: 'suspended',   label: 'Suspended' },
  { key: 'blacklisted', label: 'Blacklisted' },
];

// ── Inline double-confirm button ───────────────────────────────────────────────
function ConfirmButton({
  label,
  confirmLabel,
  className,
  onConfirm,
  disabled,
}: {
  label: string;
  confirmLabel: string;
  className?: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  // Auto-reset after 4s if user doesn't confirm
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <Button
          size="sm"
          className={className}
          onClick={(e) => { e.stopPropagation(); setConfirming(false); onConfirm(); }}
          disabled={disabled}
        >
          {confirmLabel}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
          onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
          aria-label="Cancel"
        >
          <X className="h-3 w-3" />
        </Button>
      </span>
    );
  }

  return (
    <Button
      size="sm"
      className={className}
      onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}

// ── Card component ────────────────────────────────────────────────────────────
function SupplierCard({
  s,
  onApprove,
  onSuspend,
  approving,
  suspending,
}: {
  s: SupplierItem;
  onApprove: () => void;
  onSuspend: () => void;
  approving: boolean;
  suspending: boolean;
}) {
  const navigate = useNavigate();
  const status = resolveStatus(s);
  const companyName = s.company_name || s.name;
  const initials = getInitials(companyName);
  const avatarColor = getAvatarColor(companyName);
  const ratingSummary = s.rating_summary;

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const truncate = (str?: string, n = 30) =>
    str && str.length > n ? str.slice(0, n) + '…' : str;

  return (
    <div
      className="group relative flex flex-col gap-0 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
      style={{ minHeight: 200 }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-full text-white ${avatarColor} text-lg font-bold`}>
            {initials}
          </div>
          {status === 'active' && (
            <CheckCircle2 className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white text-green-500" />
          )}
        </div>
        {/* Name + category + status */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              className="max-w-[180px] truncate text-left text-base font-bold text-gray-900 hover:underline"
              onClick={() => navigate(`/admin/suppliers/${s.id}`)}
            >
              {companyName}
            </button>
            <StatusBadge status={status} />
          </div>
          {s.category && (
            <span
              className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: s.category_color ? `${s.category_color}22` : '#e0e7ff',
                color: s.category_color || '#4338ca',
              }}
            >
              {s.category}
            </span>
          )}
          <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <a href={`mailto:${s.email}`} className="truncate hover:underline">{s.email}</a>
          </div>
          {s.phone && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <hr className="my-3 border-gray-100" />

      {/* Details row */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-gray-600">
        {s.address ? (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate" title={s.address}>{truncate(s.address)}</span>
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span>Reg: {formatDate(s.created_at)}</span>
        </div>
        <div className="flex items-center gap-1.5 col-span-2">
          <Star className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          {ratingSummary && ratingSummary.total_contracts_rated > 0 ? (
            <StarRating value={ratingSummary.average_overall ?? 0} size="sm" showValue />
          ) : (
            <span className="text-gray-400">No ratings yet</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <hr className="my-3 border-gray-100" />

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {status === 'pending' && (
          <ConfirmButton
            label="✓ Approve"
            confirmLabel={approving ? 'Approving…' : 'Confirm?'}
            className="bg-green-600 text-white hover:bg-green-700"
            onConfirm={onApprove}
            disabled={approving}
          />
        )}
        {status === 'active' && (
          <ConfirmButton
            label="Suspend"
            confirmLabel={suspending ? 'Suspending…' : 'Confirm?'}
            className="border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            onConfirm={onSuspend}
            disabled={suspending}
          />
        )}
        {status === 'suspended' && (
          <ConfirmButton
            label="↺ Reactivate"
            confirmLabel={approving ? 'Reactivating…' : 'Confirm?'}
            className="bg-green-600 text-white hover:bg-green-700"
            onConfirm={onApprove}
            disabled={approving}
          />
        )}
        <Button
          size="sm"
          variant="outline"
          className="border-blue-200 text-blue-600 hover:bg-blue-50"
          onClick={() => navigate(`/admin/suppliers/${s.id}`)}
        >
          View Profile →
        </Button>
      </div>
    </div>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SupplierCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-5" aria-hidden="true">
      <div className="flex items-start gap-3">
        <div className="skeleton h-[52px] w-[52px] rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/3 rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
        </div>
      </div>
      <hr className="border-gray-100" />
      <div className="grid grid-cols-2 gap-2">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </div>
      <hr className="border-gray-100" />
      <div className="flex gap-2">
        <div className="skeleton h-8 w-20 rounded-md" />
        <div className="skeleton h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function AdminSuppliers() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive state from URL so browser back/refresh works
  const tabParam = (searchParams.get('tab') as FilterTab) || 'all';
  const searchParam = searchParams.get('q') || '';
  const pageParam = parseInt(searchParams.get('page') ?? '1', 10) || 1;

  // Raw (immediate) search input — debounced before hitting the API
  const [rawSearch, setRawSearch] = useState(searchParam);

  // Debounce: update URL search param 300ms after typing stops
  const updateParams = useCallback((overrides: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(overrides)) {
        if (v == null || v === '') next.delete(k);
        else next.set(k, v);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      updateParams({ q: rawSearch || null, page: null });
    }, 300);
    return () => clearTimeout(t);
  }, [rawSearch, updateParams]);

  const isFiltered = tabParam !== 'all' || searchParam.length > 0;

  const statusParam = tabParam === 'all' ? undefined : tabParam === 'blacklisted' ? undefined : tabParam;
  const blacklistedOnly = tabParam === 'blacklisted' ? true : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'suppliers', pageParam, searchParam, tabParam],
    queryFn: () =>
      suppliersService.list({
        page: pageParam,
        per_page: 12,
        search: searchParam || undefined,
        status: statusParam,
        blacklisted_only: blacklistedOnly,
      }),
    staleTime: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => suppliersService.approve(id, 'approve'),
    onSuccess: () => {
      toastSuccess('Supplier approved');
      queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'], exact: false });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: number) => suppliersService.approve(id, 'suspend'),
    onSuccess: () => {
      toastSuccess('Supplier suspended');
      queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'], exact: false });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const suppliers: SupplierItem[] = (data?.items as SupplierItem[]) ?? [];
  const total = data?.total ?? 0;

  const clearFilters = () => {
    setRawSearch('');
    setSearchParams({}, { replace: true });
  };

  return (
    <div>
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <ExportButton
          label="Export Suppliers"
          onClick={() => {
            if (!suppliers.length) return;
            toastSuccess('Exporting… your download will start shortly');
            const rows = suppliers.map((s) => ({
              Name: s.name,
              Email: s.email,
              Company: s.company_name ?? '—',
              'Registration No.': s.registration_number ?? '—',
              Category: s.category ?? '—',
              Phone: s.phone ?? '—',
              Status: resolveStatus(s),
              'Registered At': s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            }));
            exportToExcel(rows, 'suppliers_list');
          }}
          empty={!suppliers.length}
        />
      </div>

      {/* Search + clear */}
      <div className="mt-4 flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by company, email…"
            className="pl-9"
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            aria-label="Search suppliers"
          />
          {rawSearch && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setRawSearch('')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {isFiltered && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-xs text-gray-500"
            onClick={clearFilters}
          >
            <X className="mr-1 h-3 w-3" /> Clear filters
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mt-4 flex gap-1 border-b border-gray-200" role="tablist" aria-label="Filter by status">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tabParam === t.key}
            onClick={() => updateParams({ tab: t.key === 'all' ? null : t.key, page: null })}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tabParam === t.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Count */}
      {!isLoading && (
        <p className="mt-3 text-sm text-gray-500" aria-live="polite">
          {total} supplier{total !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading suppliers">
          {Array.from({ length: 6 }).map((_, i) => <SupplierCardSkeleton key={i} />)}
        </div>
      )}

      {/* Grid */}
      {!isLoading && suppliers.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s) => (
            <SupplierCard
              key={s.id}
              s={s}
              onApprove={() => approveMutation.mutate(s.id)}
              onSuspend={() => suspendMutation.mutate(s.id)}
              approving={approveMutation.isPending && approveMutation.variables === s.id}
              suspending={suspendMutation.isPending && suspendMutation.variables === s.id}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && suppliers.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white/50 py-12 text-center">
          <p className="text-gray-500">No suppliers found.</p>
          {isFiltered && (
            <button type="button" className="mt-2 text-sm text-blue-600 hover:underline" onClick={clearFilters}>
              Clear filters to see all suppliers
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {data && total > 12 && (
        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={pageParam <= 1}
            onClick={() => updateParams({ page: String(pageParam - 1) })}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">Page {pageParam}</span>
          <Button
            variant="outline"
            disabled={pageParam * 12 >= total}
            onClick={() => updateParams({ page: String(pageParam + 1) })}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
