import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { Button } from '@/components/ui/button';
import { TenderFilterBar, type TenderFilterState } from '@/components/tenders/TenderFilterBar';
import { CategoryBadge } from '@/components/tenders/CategoryBadge';
import { TagChip } from '@/components/tenders/TagChip';
import { ExportButton } from '@/components/ui/ExportButton';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { getCategoryAsset, getTenderImage, getFallbackImage } from '@/utils/categoryAssets';
import { exportToExcel } from '@/utils/exportExcel';
import { Plus, Eye, Pencil, Trash2, Send, XCircle, FileText, DollarSign, Inbox, Calendar, AlertTriangle } from 'lucide-react';

interface TenderCardProps {
  tender: {
    id: number;
    title: string;
    reference_number: string;
    category_name?: string;
    category_color?: string;
    status: string;
    budget?: number;
    submission_deadline: string;
    bids_count?: number;
    tags?: string[];
  };
  onPublish: (id: number) => void;
  onClose: (id: number) => void;
  onDelete: (id: number) => void;
  isPublishing: boolean;
  isClosing: boolean;
  isDeleting: number | null;
}

function getTimeLeft(deadline: string): { text: string; urgent: boolean; passed: boolean } {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { text: 'Deadline passed', urgent: true, passed: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return { text: `${days}d ${hours}h left`, urgent: days <= 3, passed: false };
  const mins = Math.floor((diff % 3600000) / 60000);
  return { text: `${hours}h ${mins}m left`, urgent: true, passed: false };
}

function TenderCard({ tender, onPublish, onClose, onDelete, isPublishing, isClosing, isDeleting }: TenderCardProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(tender.submission_deadline));
  const categoryAsset = getCategoryAsset(tender?.category_name);
  const [imageSrc, setImageSrc] = useState(() => {
    try {
      return tender?.title ? getTenderImage(tender) : '';
    } catch {
      return '';
    }
  });
  const navigate = useNavigate();

  const handleImageError = () => {
    setImageSrc(getFallbackImage({ id: tender?.id ?? 0, title: tender?.title ?? '', category_name: tender?.category_name }));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(tender.submission_deadline));
    }, 60000);
    return () => clearInterval(timer);
  }, [tender.submission_deadline]);

  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: '#64748b', text: '#ffffff' },
    published: { bg: '#2563eb', text: '#ffffff' },
    closed: { bg: '#d97706', text: '#ffffff' },
    evaluated: { bg: '#7c3aed', text: '#ffffff' },
    awarded: { bg: '#16a34a', text: '#ffffff' },
  };

  const statusColor = statusColors[tender.status] || statusColors.draft;
  const isClosingSoon = tender.status === 'published' && timeLeft.urgent && !timeLeft.passed;

  const formatBudget = (amount?: number) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderActions = () => {
    const actions: { label: string; icon: React.ReactNode; variant: 'primary' | 'outline' | 'destructive'; onClick: () => void; loading?: boolean }[] = [];

    switch (tender.status) {
      case 'draft':
        actions.push(
          { label: 'Edit', icon: <Pencil className="h-3 w-3" />, variant: 'outline', onClick: () => navigate(`/admin/tenders/${tender.id}`) },
          { label: 'Publish', icon: <Send className="h-3 w-3" />, variant: 'primary', onClick: () => onPublish(tender.id), loading: isPublishing },
          { label: 'Delete', icon: <Trash2 className="h-3 w-3" />, variant: 'destructive', onClick: () => onDelete(tender.id), loading: isDeleting === tender.id }
        );
        break;
      case 'published':
        actions.push(
          { label: 'View', icon: <Eye className="h-3 w-3" />, variant: 'primary', onClick: () => navigate(`/admin/tenders/${tender.id}`) },
          { label: 'Edit', icon: <Pencil className="h-3 w-3" />, variant: 'outline', onClick: () => navigate(`/admin/tenders/${tender.id}`) },
          { label: 'Close', icon: <XCircle className="h-3 w-3" />, variant: 'destructive', onClick: () => onClose(tender.id), loading: isClosing }
        );
        break;
      case 'closed':
      case 'evaluated':
        actions.push(
          { label: 'View', icon: <Eye className="h-3 w-3" />, variant: 'primary', onClick: () => navigate(`/admin/tenders/${tender.id}`) },
          { label: 'Evaluate', icon: <FileText className="h-3 w-3" />, variant: 'outline', onClick: () => navigate(`/admin/tenders/${tender.id}`) }
        );
        break;
      case 'awarded':
        actions.push(
          { label: 'View', icon: <Eye className="h-3 w-3" />, variant: 'primary', onClick: () => navigate(`/admin/tenders/${tender.id}`) },
          { label: 'Contract', icon: <FileText className="h-3 w-3" />, variant: 'outline', onClick: () => navigate(`/admin/tenders/${tender.id}`) }
        );
        break;
    }

    return actions.map((action, idx) => (
      <Button
        key={idx}
        size="sm"
        variant={action.variant === 'destructive' ? 'outline' : action.variant === 'primary' ? 'default' : 'outline'}
        className={`h-8 gap-1 text-xs ${action.variant === 'destructive' ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}`}
        onClick={action.onClick}
        disabled={action.loading}
      >
        {action.loading ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          action.icon
        )}
        {action.label}
      </Button>
    ));
  };

  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:scale-[1.005] hover:shadow-lg">
      {/* Image Banner */}
      <div className="relative h-[120px] w-full overflow-hidden">
        <img
          src={imageSrc}
          alt={tender.category_name || 'Tender'}
          className="h-full w-full object-cover"
          onError={handleImageError}
        />
        <div className="absolute inset-0" style={{ backgroundColor: `${categoryAsset.color}35` }} />
        
        {/* Status Badge */}
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {isClosingSoon && (
            <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white">
              <AlertTriangle className="h-3 w-3" /> Closing Soon
            </span>
          )}
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: statusColor.bg }}
          >
            <span className="h-2 w-2 rounded-full bg-white/30" /> {tender.status.charAt(0).toUpperCase() + tender.status.slice(1)}
          </span>
        </div>

        {/* Awarded Trophy */}
        {tender.status === 'awarded' && (
          <div className="absolute left-3 top-3 text-2xl">🏆</div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="line-clamp-2 text-base font-bold text-[#0f172a]">{tender?.title}</h3>
          <span className="ml-2 whitespace-nowrap text-xs text-gray-500">{tender?.reference_number}</span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {tender.category_name && (
            <CategoryBadge category_name={tender.category_name} category_color={tender.category_color || categoryAsset.color} />
          )}
          {tender.tags && tender.tags.slice(0, 2).map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>

        <div className="mb-3 space-y-2 border-t border-gray-100 pt-3">
          {/* Deadline Row */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className={`h-4 w-4 ${timeLeft.urgent ? 'text-red-500' : 'text-gray-400'}`} />
            <span className="text-gray-600">{formatDate(tender.submission_deadline)}</span>
            <span className={`flex items-center gap-1 text-xs font-medium ${timeLeft.urgent ? 'text-red-500' : 'text-gray-500'}`}>
              {timeLeft.urgent && !timeLeft.passed && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
              {timeLeft.text}
            </span>
          </div>

          {/* Budget and Bids Row */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-700">{formatBudget(tender?.budget)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Inbox className={`h-4 w-4 ${(tender.bids_count ?? 0) > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
              <span className={(tender.bids_count ?? 0) > 0 ? 'font-medium text-blue-600' : 'text-gray-500'}>
                {tender.bids_count ?? 0} bids received
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          {renderActions()}
        </div>
      </div>
    </div>
  );
}

function TenderCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-[120px] w-full animate-pulse bg-gray-200" />
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="mb-3 flex gap-2">
          <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
          <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="mb-3 space-y-2 border-t border-gray-100 pt-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="flex gap-2 border-t border-gray-100 pt-3">
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export function AdminTenders() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TenderFilterState>({ category_id: null, search: '', tag: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'tenders', page, filters, statusFilter],
    queryFn: () => tendersService.list({
      page, per_page: 10,
      search: filters.search || undefined,
      status: statusFilter || undefined,
      category_id: filters.category_id ?? undefined,
      tag: filters.tag || undefined,
    }),
    staleTime: 30000,
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => tendersService.publish(id),
    onSuccess: () => {
      toastSuccess('Tender published successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenders'] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed to publish'),
  });

  const closeMutation = useMutation({
    mutationFn: (id: number) => tendersService.close(id),
    onSuccess: () => {
      toastSuccess('Tender closed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenders'] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed to close'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tendersService.delete(id),
    onSuccess: () => {
      toastSuccess('Tender deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenders'] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed to delete'),
  });

  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handlePublish = (id: number) => {
    if (!window.confirm('Are you sure you want to publish this tender? It will be visible to suppliers.')) return;
    setPublishingId(id);
    publishMutation.mutate(id, { onSettled: () => setPublishingId(null) });
  };

  const handleClose = (id: number) => {
    if (!window.confirm('Are you sure you want to close this tender? No more bids will be accepted.')) return;
    setClosingId(id);
    closeMutation.mutate(id, { onSettled: () => setClosingId(null) });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('Are you sure you want to delete this tender? This action cannot be undone.')) return;
    setDeletingId(id);
    deleteMutation.mutate(id, { onSettled: () => setDeletingId(null) });
  };

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
        
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <TenderCardSkeleton key={i} />
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {data?.items && data.items.length === 0 && !isLoading && (
          <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white/50 py-12 text-center">
            <p className="text-gray-500">No tenders match your filters.</p>
            <Link to="/admin/tenders/create" className="mt-2 inline-block">
              <Button variant="outline" size="sm">Create your first tender</Button>
            </Link>
          </div>
        )}
        
        {/* Tender Cards Grid */}
        {data?.items && data.items.length > 0 && !isLoading && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {data.items.map((tender) => (
              <TenderCard
                key={tender.id}
                tender={tender}
                onPublish={handlePublish}
                onClose={handleClose}
                onDelete={handleDelete}
                isPublishing={publishingId === tender.id}
                isClosing={closingId === tender.id}
                isDeleting={deletingId}
              />
            ))}
          </div>
        )}
        
        {/* Pagination */}
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
