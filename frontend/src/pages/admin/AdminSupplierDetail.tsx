import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/types';
import { suppliersService } from '@/services/suppliers';
import { ratingService } from '@/services/ratingService';
import { blacklistService } from '@/services/blacklist';
import { bidsService } from '@/services/bids';
import { Button } from '@/components/ui/button';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { Mail, Phone, MapPin, Globe, Download, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { RatingBreakdown } from '@/components/ratings/RatingBreakdown';

// ── Helpers ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500',
  'bg-red-500', 'bg-teal-500', 'bg-pink-500',
];
function getAvatarColor(name: string) {
  const code = (name.charCodeAt(0) || 65) - 65;
  return AVATAR_COLORS[Math.abs(code) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

type EffectiveStatus = 'pending' | 'active' | 'suspended' | 'blacklisted';

function resolveEffectiveStatus(
  status: string,
  isApproved: boolean | number | undefined,
  isBlacklisted: boolean,
): EffectiveStatus {
  if (isBlacklisted) return 'blacklisted';
  if ((isApproved === true || isApproved === 1) && status === 'pending') return 'active';
  if (status === 'suspended') return 'suspended';
  if (status === 'active') return 'active';
  return 'pending';
}

const STATUS_STYLES: Record<EffectiveStatus, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: 'bg-amber-50',   text: 'text-amber-800',  dot: 'bg-amber-400',  label: 'Pending' },
  active:      { bg: 'bg-green-50',   text: 'text-green-800',  dot: 'bg-green-500',  label: 'Active' },
  suspended:   { bg: 'bg-red-50',     text: 'text-red-800',    dot: 'bg-red-500',    label: 'Suspended' },
  blacklisted: { bg: 'bg-rose-950',   text: 'text-white',      dot: 'bg-rose-400',   label: 'Blacklisted' },
};

function StatusBadge({ status }: { status: EffectiveStatus }) {
  const st = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.bg} ${st.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
      {st.label}
    </span>
  );
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function timeAgo(d?: string | null): string {
  if (!d) return 'N/A';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

// ── Confirmation Modal ─────────────────────────────────────────────────────────
function ConfirmModal({
  title,
  supplierName,
  warning,
  requireReason,
  confirmLabel,
  confirmClass,
  isPending,
  onClose,
  onConfirm,
}: {
  title: string;
  supplierName: string;
  warning: string;
  requireReason?: boolean;
  confirmLabel: string;
  confirmClass: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const titleId = `modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus cancel button when modal opens
  useEffect(() => { cancelRef.current?.focus(); }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold">{title} — {supplierName}</h2>
          <button
            type="button"
            aria-label="Close dialog"
            className="rounded p-1 text-gray-400 hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-amber-700" role="alert">{warning}</p>
          {requireReason && (
            <div>
              <label htmlFor="modal-reason" className="mb-1 block text-sm font-medium text-gray-700">
                Reason <span aria-hidden="true">*</span>
                <span className="sr-only">(required, minimum 10 characters)</span>
              </label>
              <textarea
                id="modal-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
                aria-required="true"
                aria-describedby="modal-reason-hint"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter reason…"
              />
              <p id="modal-reason-hint" className="mt-1 text-xs text-gray-400">Minimum 10 characters</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button ref={cancelRef} variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className={confirmClass}
              disabled={isPending || (requireReason ? reason.trim().length < 10 : false)}
              onClick={() => onConfirm(reason)}
            >
              {isPending ? 'Processing…' : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile detail row ─────────────────────────────────────────────────────────
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start border-b border-gray-50 py-2.5">
      <span className="w-36 shrink-0 text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-800">{children}</span>
    </div>
  );
}

// ── Lift Blacklist Modal ───────────────────────────────────────────────────────
function LiftModal({
  companyName, blacklistReasonDisplay, liftReason, setLiftReason, isPending, onClose, onConfirm,
}: {
  companyName: string;
  blacklistReasonDisplay?: string;
  liftReason: string;
  setLiftReason: (v: string) => void;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    cancelRef.current?.focus();
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="lift-modal-title" className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id="lift-modal-title" className="text-base font-semibold">Lift Blacklist — {companyName}</h2>
          <button type="button" aria-label="Close dialog" className="rounded p-1 text-gray-400 hover:text-gray-600" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-gray-600">Original reason: <em>{blacklistReasonDisplay}</em></p>
          <div>
            <label htmlFor="lift-reason" className="mb-1 block text-sm font-medium text-gray-700">
              Reason for lifting <span aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <textarea
              id="lift-reason"
              value={liftReason}
              onChange={(e) => setLiftReason(e.target.value)}
              rows={3}
              required
              aria-required="true"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Issue resolved after review"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button ref={cancelRef} variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-orange-500 text-white hover:bg-orange-600"
              disabled={liftReason.trim().length < 5 || isPending}
              onClick={onConfirm}
            >
              {isPending ? 'Lifting…' : 'Confirm Lift'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab type ───────────────────────────────────────────────────────────────────
type Tab = 'profile' | 'bids' | 'documents' | 'ratings' | 'activity';

// ── Main component ─────────────────────────────────────────────────────────────
export function AdminSupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const supplierId = id ? parseInt(id, 10) : 0;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  // Track which tabs have ever been visited — lazy-mount: only render content once visited
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(['profile']));
  const handleTabChange = (t: Tab) => {
    setActiveTab(t);
    setVisitedTabs((prev) => new Set([...prev, t]));
  };

  // Bid sort state
  const [bidSortKey, setBidSortKey] = useState<'bid_amount' | 'submitted_at' | 'status' | null>(null);
  const [bidSortDir, setBidSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleBidSort = (key: typeof bidSortKey) => {
    if (bidSortKey === key) setBidSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setBidSortKey(key); setBidSortDir('desc'); }
  };
  const sortArrow = (key: typeof bidSortKey) =>
    bidSortKey === key ? (bidSortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';

  const [blacklistModal, setBlacklistModal] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [liftModal, setLiftModal] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => suppliersService.show(supplierId),
    enabled: supplierId > 0,
    staleTime: 30_000,
  });

  const { data: blacklistCheck } = useQuery({
    queryKey: ['blacklist-check', supplierId],
    queryFn: () => blacklistService.check(supplierId),
    enabled: supplierId > 0 && !!supplier,
    staleTime: 30_000,
  });

  const { data: ratingsData } = useQuery({
    queryKey: ['ratings', supplierId],
    queryFn: () => ratingService.list(supplierId),
    enabled: supplierId > 0 && visitedTabs.has('ratings'),
    staleTime: 30_000,
  });

  const { data: bidsData } = useQuery({
    queryKey: ['bids', 'supplier', supplierId],
    queryFn: () => bidsService.list({ supplier_id: supplierId, per_page: 50 }),
    enabled: supplierId > 0 && visitedTabs.has('bids'),
    staleTime: 30_000,
  });

  const { data: activityData } = useQuery({
    queryKey: ['supplier-activity', supplierId],
    queryFn: () => suppliersService.activity(supplierId),
    enabled: supplierId > 0 && visitedTabs.has('activity'),
    staleTime: 30_000,
  });

  // ── Derived state ────────────────────────────────────────────────────────────
  const isBlacklisted = blacklistCheck?.blacklisted ?? false;
  const blacklistId = blacklistCheck?.blacklist_id;
  const blacklistReasonDisplay = blacklistCheck?.reason;

  const ext = supplier as (User & {
    rating_summary?: { average_overall: number | null; total_contracts_rated: number };
    bid_count?: number;
    accepted_bid_count?: number;
    contract_count?: number;
    last_login?: string | null;
    approved_by_name?: string | null;
  });

  const profile = ext?.profile ?? (ext as User)?.supplier_profile;
  const effectiveStatus = supplier
    ? resolveEffectiveStatus(
        supplier.status,
        (profile as { is_approved?: boolean | number })?.is_approved,
        isBlacklisted,
      )
    : 'pending';

  // ── Mutations ────────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['supplier', supplierId] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'], exact: false });
  };

  const approveMutation = useMutation({
    mutationFn: () => suppliersService.approve(supplierId, 'approve'),
    onSuccess: () => { toastSuccess('Supplier approved'); invalidate(); },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const suspendMutation = useMutation({
    mutationFn: () => suppliersService.approve(supplierId, 'suspend'),
    onSuccess: () => { toastSuccess('Supplier suspended'); setSuspendModal(false); invalidate(); },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const blacklistMutation = useMutation({
    mutationFn: (reason: string) => blacklistService.add(supplierId, reason),
    onSuccess: () => {
      toastSuccess('Supplier blacklisted');
      queryClient.invalidateQueries({ queryKey: ['blacklist-check', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      invalidate();
      setBlacklistModal(false);
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const [liftReason, setLiftReason] = useState('');
  const liftMutation = useMutation({
    mutationFn: () => blacklistService.lift(blacklistId!, liftReason),
    onSuccess: () => {
      toastSuccess('Blacklist lifted');
      queryClient.invalidateQueries({ queryKey: ['blacklist-check', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      invalidate();
      setLiftModal(false);
      setLiftReason('');
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading || !supplier) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Loading supplier profile">
        <div className="skeleton h-5 w-40 rounded" />
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-8">
          <div className="flex gap-5">
            <div className="skeleton h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-6 w-48 rounded" />
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-4 w-56 rounded" />
              <div className="skeleton h-4 w-40 rounded" />
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <div className="skeleton h-9 w-24 rounded-md" />
            <div className="skeleton h-9 w-24 rounded-md" />
            <div className="skeleton h-9 w-28 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[0,1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-lg" />)}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="skeleton h-64 w-full rounded" />
        </div>
      </div>
    );
  }

  const companyName = (profile as { company_name?: string })?.company_name || supplier.name;
  const ratingSummary = ext.rating_summary;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Back link */}
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link to="/admin/dashboard" className="hover:text-blue-600 hover:underline">Dashboard</Link>
        <span aria-hidden="true">/</span>
        <Link to="/admin/suppliers" className="hover:text-blue-600 hover:underline">Suppliers</Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-800 font-medium" aria-current="page">{supplier?.name ?? '…'}</span>
      </nav>

      {/* ── Profile Header Card ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        {/* Status banners */}
        {isBlacklisted && (
          <div className="flex items-center gap-2 bg-red-600 px-5 py-2.5 text-sm text-white">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>This supplier is currently blacklisted — {blacklistReasonDisplay || 'No reason provided'}</span>
          </div>
        )}
        {effectiveStatus === 'pending' && !isBlacklisted && (
          <div className="flex items-center gap-2 bg-amber-50 px-5 py-2.5 text-sm text-amber-800">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Awaiting approval — registered {formatDate(supplier.created_at)}</span>
          </div>
        )}

        <div className="p-8">
          {/* Top row: avatar + details */}
          <div className="flex flex-wrap items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className={`flex h-20 w-20 items-center justify-center rounded-full text-white text-2xl font-bold ${getAvatarColor(companyName)}`}>
                {getInitials(companyName)}
              </div>
              {effectiveStatus === 'active' && (
                <CheckCircle2 className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white text-green-500" />
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{companyName}</h1>
                <StatusBadge status={effectiveStatus} />
              </div>
              {(profile as { category?: string })?.category && (
                <p className="mt-0.5 text-sm text-gray-500">{(profile as { category?: string }).category}</p>
              )}
              <a href={`mailto:${supplier.email}`} className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <Mail className="h-3.5 w-3.5" /> {supplier.email}
              </a>
              {ratingSummary && ratingSummary.total_contracts_rated > 0 ? (
                <div className="mt-1 flex items-center gap-1">
                  <StarRating value={ratingSummary.average_overall ?? 0} size="sm" showValue />
                  <span className="text-sm text-gray-500">({ratingSummary.total_contracts_rated} ratings)</span>
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-400">No ratings yet</p>
              )}
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                <span>Registered: {formatDate(supplier.created_at)}</span>
                {(profile as { approved_at?: string })?.approved_at && (
                  <span>Approved: {formatDate((profile as { approved_at?: string }).approved_at)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap gap-2">
            {effectiveStatus === 'pending' && (
              <Button
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
              >
                ✓ Approve
              </Button>
            )}
            {effectiveStatus === 'active' && (
              <Button
                className="bg-orange-500 text-white hover:bg-orange-600"
                onClick={() => setSuspendModal(true)}
              >
                ⏸ Suspend
              </Button>
            )}
            {effectiveStatus === 'suspended' && (
              <Button
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
              >
                ✓ Reactivate
              </Button>
            )}
            {!isBlacklisted && (
              <Button
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => setBlacklistModal(true)}
              >
                🚫 Blacklist
              </Button>
            )}
            {isBlacklisted && (
              <Button
                className="bg-orange-500 text-white hover:bg-orange-600"
                onClick={() => setLiftModal(true)}
              >
                ↩ Lift Blacklist
              </Button>
            )}
            <Button
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={() => window.location.href = `mailto:${supplier.email}`}
            >
              ✉ Send Email
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: '📋', label: 'Tenders Bid', value: ext.bid_count ?? 0 },
          { icon: '✅', label: 'Bids Accepted', value: ext.accepted_bid_count ?? 0 },
          { icon: '📄', label: 'Contracts', value: ext.contract_count ?? 0 },
          {
            icon: '⭐',
            label: 'Avg Rating',
            value: ratingSummary?.average_overall != null
              ? `${ratingSummary.average_overall} / 5`
              : '—',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center shadow-sm">
            <div className="text-lg">{stat.icon}</div>
            <div className="text-xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabbed Content ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 px-4">
          {(['profile', 'bids', 'documents', 'ratings', 'activity'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === t
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t === 'bids' ? 'Bid History' : t}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── TAB: Profile ─────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="grid gap-8 md:grid-cols-2">
              {/* Company Info */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Company Information</h3>
                <DetailRow label="Company Name">{companyName}</DetailRow>
                <DetailRow label="Registration No.">{(profile as { registration_number?: string })?.registration_number || '—'}</DetailRow>
                <DetailRow label="Tax ID">{(profile as { tax_id?: string })?.tax_id || '—'}</DetailRow>
                <DetailRow label="Category">{(profile as { category?: string })?.category || '—'}</DetailRow>
                <DetailRow label="Website">
                  {(profile as { website?: string })?.website ? (
                    <a
                      href={(profile as { website?: string }).website!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {(profile as { website?: string }).website}
                    </a>
                  ) : '—'}
                </DetailRow>
                <DetailRow label="Address">
                  {(profile as { address?: string })?.address ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {(profile as { address?: string }).address}
                    </span>
                  ) : '—'}
                </DetailRow>
                <DetailRow label="Phone">
                  {(profile as { phone?: string })?.phone ? (
                    <a href={`tel:${(profile as { phone?: string }).phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                      <Phone className="h-3.5 w-3.5" />
                      {(profile as { phone?: string }).phone}
                    </a>
                  ) : '—'}
                </DetailRow>
                <DetailRow label="Email">
                  <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Mail className="h-3.5 w-3.5" />
                    {supplier.email}
                  </a>
                </DetailRow>
              </div>
              {/* Account Info */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Account Information</h3>
                <DetailRow label="Account Status"><StatusBadge status={effectiveStatus} /></DetailRow>
                <DetailRow label="Registered">{formatDate(supplier.created_at)}</DetailRow>
                <DetailRow label="Approved By">{ext.approved_by_name || '—'}</DetailRow>
                <DetailRow label="Approved On">{formatDate((profile as { approved_at?: string })?.approved_at)}</DetailRow>
                <DetailRow label="Last Login">{timeAgo(ext.last_login)}</DetailRow>
              </div>
            </div>
          )}

          {/* ── TAB: Bid History ─────────────────────────────────────────── */}
          {visitedTabs.has('bids') && (
            <div className={activeTab !== 'bids' ? 'hidden' : ''}>
              {!bidsData ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : bidsData.items.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">This supplier has not submitted any bids yet.</p>
              ) : (() => {
                const BID_STATUS_STYLES: Record<string, string> = {
                  submitted: 'bg-blue-50 text-blue-700',
                  under_review: 'bg-amber-50 text-amber-700',
                  accepted: 'bg-green-50 text-green-700',
                  rejected: 'bg-red-50 text-red-700',
                  draft: 'bg-gray-100 text-gray-600',
                };
                const sorted = [...bidsData.items].sort((a, b) => {
                  if (!bidSortKey) return 0;
                  const mul = bidSortDir === 'asc' ? 1 : -1;
                  if (bidSortKey === 'bid_amount') return mul * ((a.bid_amount ?? -1) - (b.bid_amount ?? -1));
                  if (bidSortKey === 'submitted_at') {
                    return mul * (new Date(a.submitted_at ?? 0).getTime() - new Date(b.submitted_at ?? 0).getTime());
                  }
                  if (bidSortKey === 'status') return mul * a.status.localeCompare(b.status);
                  return 0;
                });
                return (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                            <th className="pb-2 pr-4">Tender Title</th>
                            <th className="pb-2 pr-4">Reference</th>
                            <th
                              className="cursor-pointer select-none pb-2 pr-4 hover:text-gray-700"
                              onClick={() => toggleBidSort('bid_amount')}
                              aria-sort={bidSortKey === 'bid_amount' ? (bidSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              Bid Amount{sortArrow('bid_amount')}
                            </th>
                            <th
                              className="cursor-pointer select-none pb-2 pr-4 hover:text-gray-700"
                              onClick={() => toggleBidSort('status')}
                              aria-sort={bidSortKey === 'status' ? (bidSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              Status{sortArrow('status')}
                            </th>
                            <th
                              className="cursor-pointer select-none pb-2 pr-4 hover:text-gray-700"
                              onClick={() => toggleBidSort('submitted_at')}
                              aria-sort={bidSortKey === 'submitted_at' ? (bidSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              Submitted{sortArrow('submitted_at')}
                            </th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((bid) => (
                            <tr key={bid.id} className="border-b hover:bg-gray-50">
                              <td className="py-2.5 pr-4 font-medium">{bid.tender_title || '—'}</td>
                              <td className="py-2.5 pr-4 font-mono text-gray-500">{bid.reference_number || '—'}</td>
                              <td className="py-2.5 pr-4">
                                {bid.bid_amount != null ? `$${bid.bid_amount.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${BID_STATUS_STYLES[bid.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {bid.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-2.5 pr-4 text-gray-500">
                                {bid.submitted_at ? new Date(bid.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                              </td>
                              <td className="py-2.5">
                                <Link to={`/admin/tenders/${bid.tender_id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {bidsData.items.some((b) => b.bid_amount != null) && (
                      <p className="mt-3 text-right text-sm font-medium text-gray-600">
                        Total bid value: ${bidsData.items.reduce((s, b) => s + (b.bid_amount ?? 0), 0).toLocaleString()}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── TAB: Documents ───────────────────────────────────────────── */}
          {activeTab === 'documents' && (
            <div>
              {/* Collect bid documents for this supplier */}
              {!bidsData ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (() => {
                const allDocs = bidsData.items.flatMap((bid) =>
                  (bid.documents ?? []).map((doc) => ({ ...doc, tender_title: bid.tender_title }))
                );
                if (allDocs.length === 0) {
                  return <p className="py-8 text-center text-sm text-gray-400">No documents uploaded yet.</p>;
                }
                const extIcon = (name: string) => {
                  const ext = name.split('.').pop()?.toLowerCase();
                  if (ext === 'pdf') return { icon: '📄', color: 'text-red-500' };
                  if (ext === 'doc' || ext === 'docx') return { icon: '📝', color: 'text-blue-500' };
                  if (ext === 'xls' || ext === 'xlsx') return { icon: '📊', color: 'text-green-500' };
                  return { icon: '🖼️', color: 'text-purple-500' };
                };
                return (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {allDocs.map((doc) => {
                      const { icon } = extIcon(doc.original_name);
                      return (
                        <div key={doc.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
                          <div className="text-2xl">{icon}</div>
                          <p className="font-medium text-sm text-gray-800 truncate" title={doc.original_name}>{doc.original_name}</p>
                          {doc.tender_title && <p className="text-xs text-gray-400 truncate">{doc.tender_title}</p>}
                          {doc.file_size && (
                            <p className="text-xs text-gray-400">
                              {doc.original_name.split('.').pop()?.toUpperCase()} • {Math.round(doc.file_size / 1024)}KB
                            </p>
                          )}
                          {doc.uploaded_at && <p className="text-xs text-gray-400">{new Date(doc.uploaded_at).toLocaleDateString()}</p>}
                          <a
                            href={`/api/uploads/download?type=bid_doc&id=${doc.id}`}
                            download
                            className="mt-auto inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            <Download className="h-3 w-3" /> Download
                          </a>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── TAB: Ratings ─────────────────────────────────────────────── */}
          {activeTab === 'ratings' && (
            <div>
              {!ratingsData ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : !ratingsData.aggregate ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No performance ratings yet. Ratings are added after contract completion.
                </p>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="rounded-xl bg-gray-50 p-5">
                    <div className="mb-4 text-center">
                      <p className="text-4xl font-bold text-gray-900">{ratingsData.aggregate.average_overall ?? '—'}</p>
                      <p className="text-sm text-gray-500">Based on {ratingsData.aggregate.total_ratings} contract{ratingsData.aggregate.total_ratings !== 1 ? 's' : ''}</p>
                    </div>
                    <RatingBreakdown aggregate={ratingsData.aggregate} showOverall={false} />
                  </div>

                  {/* History */}
                  {ratingsData.ratings.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                            <th className="pb-2 pr-4">Contract</th>
                            <th className="pb-2 pr-4">Tender</th>
                            <th className="pb-2 pr-4">Quality</th>
                            <th className="pb-2 pr-4">Delivery</th>
                            <th className="pb-2 pr-4">Comm.</th>
                            <th className="pb-2 pr-4">Compliance</th>
                            <th className="pb-2 pr-4">Overall</th>
                            <th className="pb-2">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ratingsData.ratings.map((r) => (
                            <tr key={r.id} className="border-b">
                              <td className="py-2 pr-4 font-mono text-xs">{r.contract_number}</td>
                              <td className="py-2 pr-4">{r.tender_title}</td>
                              <td className="py-2 pr-4">{r.quality_score}</td>
                              <td className="py-2 pr-4">{r.delivery_score}</td>
                              <td className="py-2 pr-4">{r.communication_score}</td>
                              <td className="py-2 pr-4">{r.compliance_score}</td>
                              <td className="py-2 pr-4">
                                <StarRating value={r.overall_score} size="sm" showValue />
                              </td>
                              <td className="py-2 text-gray-500">{new Date(r.rated_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Activity ────────────────────────────────────────────── */}
          {activeTab === 'activity' && (
            <div>
              {!activityData ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : activityData.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No activity recorded yet.</p>
              ) : (
                <ol className="relative border-l border-gray-200 pl-6 space-y-4">
                  {activityData.map((item, idx) => (
                    <li key={idx} className="relative">
                      <span className="absolute -left-[26px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-blue-500 bg-white" />
                      <p className="text-sm font-medium text-gray-800">{item.action.replace(/_/g, ' ')}</p>
                      {item.details && <p className="text-xs text-gray-500">{item.details}</p>}
                      <p className="text-xs text-gray-400">{formatDate(item.created_at)}{item.actor_name ? ` — ${item.actor_name}` : ''}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {suspendModal && (
        <ConfirmModal
          title="Suspend Supplier"
          supplierName={companyName}
          warning="This will suspend the supplier's account. They will not be able to log in or submit bids."
          requireReason
          confirmLabel="Confirm Suspend"
          confirmClass="bg-orange-500 text-white hover:bg-orange-600"
          isPending={suspendMutation.isPending}
          onClose={() => setSuspendModal(false)}
          onConfirm={(_r) => suspendMutation.mutate()}
        />
      )}

      {blacklistModal && (
        <ConfirmModal
          title="Blacklist Supplier"
          supplierName={companyName}
          warning="This will immediately suspend their account and prevent them from logging in or submitting bids."
          requireReason
          confirmLabel="Confirm Blacklist"
          confirmClass="bg-red-600 text-white hover:bg-red-700"
          isPending={blacklistMutation.isPending}
          onClose={() => setBlacklistModal(false)}
          onConfirm={(reason) => blacklistMutation.mutate(reason)}
        />
      )}

      {liftModal && blacklistId != null && (
        <LiftModal
          companyName={companyName}
          blacklistReasonDisplay={blacklistReasonDisplay}
          liftReason={liftReason}
          setLiftReason={setLiftReason}
          isPending={liftMutation.isPending}
          onClose={() => setLiftModal(false)}
          onConfirm={() => liftMutation.mutate()}
        />
      )}
    </div>
  );
}
