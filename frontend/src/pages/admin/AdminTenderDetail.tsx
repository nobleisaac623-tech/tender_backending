import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { bidsService } from '@/services/bids';
// import { contractService } from '@/services/contractService'; // reserved for future use
// import { reportsService } from '@/services/reports'; // reserved for future use
import { getCategories } from '@/services/categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExportButton } from '@/components/ui/ExportButton';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { CategoryBadge } from '@/components/tenders/CategoryBadge';
import { TagChip } from '@/components/tenders/TagChip';
import { getCategoryAsset, getTenderImage, getFallbackImage } from '@/utils/categoryAssets';
import { exportToExcel } from '@/utils/exportExcel';
import { ArrowLeft, Pencil, Send, XCircle, Trash2, Eye, FileText, Users, Clock, DollarSign, Calendar, User, Plus, Inbox, Upload, AlertTriangle } from 'lucide-react';

function getTimeLeft(deadline: string): { text: string; urgent: boolean; passed: boolean } {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { text: 'Deadline passed', urgent: true, passed: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return { text: `${days}d ${hours}h left`, urgent: days <= 3, passed: false };
  const mins = Math.floor((diff % 3600000) / 60000);
  return { text: `${hours}h ${mins}m left`, urgent: true, passed: false };
}

type TabType = 'description' | 'bids' | 'evaluation' | 'documents' | 'evaluators';

const TABS: { id: TabType; label: string }[] = [
  { id: 'description', label: 'Description' },
  { id: 'bids', label: 'Bids' },
  { id: 'evaluation', label: 'Evaluation' },
  { id: 'documents', label: 'Documents' },
  { id: 'evaluators', label: 'Evaluators' },
];

export function AdminTenderDetail() {
  const { id } = useParams<{ id: string }>();
  const tenderId = id ? parseInt(id, 10) : 0;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('description');
  const [visitedTabs, setVisitedTabs] = useState<Set<TabType>>(new Set(['description']));

  const { data: tender, isLoading } = useQuery({
    queryKey: ['tender', tenderId],
    queryFn: () => tendersService.show(tenderId),
    enabled: tenderId > 0,
    staleTime: 30000,
  });

  // Guard against undefined tender
  const safeTender = tender ?? {
    id: 0,
    title: '',
    description: '',
    budget: 0,
    reference_number: '',
    status: 'draft',
    submission_deadline: '',
    category_name: '',
    tags: [],
  };

  const { data: bidsData } = useQuery({
    queryKey: ['bids', tenderId],
    queryFn: () => bidsService.list({ tender_id: tenderId }),
    enabled: tenderId > 0 && visitedTabs.has('bids'),
    staleTime: 30000,
  });

  // contractId query - commented out as not currently used
  // const { data: contractId } = useQuery({
  //   queryKey: ['contract-by-tender', tenderId],
  //   queryFn: () => contractService.getContractIdByTenderId(tenderId),
  //   enabled: tenderId > 0 && tender?.status === 'awarded',
  // });

  const publishMutation = useMutation({
    mutationFn: () => tendersService.publish(tenderId),
    onSuccess: () => {
      toastSuccess('Tender published');
      queryClient.invalidateQueries({ queryKey: ['tender', tenderId] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const closeMutation = useMutation({
    mutationFn: () => tendersService.close(tenderId),
    onSuccess: () => {
      toastSuccess('Tender closed');
      queryClient.invalidateQueries({ queryKey: ['tender', tenderId] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => tendersService.delete(tenderId),
    onSuccess: () => {
      toastSuccess('Tender deleted');
      window.location.href = '/admin/tenders';
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editRef, setEditRef] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editBudget, setEditBudget] = useState('');
  const [editSubmissionDeadline, setEditSubmissionDeadline] = useState('');
  const [editOpeningDate, setEditOpeningDate] = useState('');
  const [exportBidsLoading, setExportBidsLoading] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories, staleTime: 60000 });

  const [timeLeft, setTimeLeft] = useState<{ text: string; urgent: boolean; passed: boolean } | null>(null);
  const categoryAsset = tender ? getCategoryAsset(tender.category_name) : getCategoryAsset(null);
  const [imageSrc, setImageSrc] = useState<string>(tender ? getTenderImage(tender) : '');

  const handleImageError = () => {
    if (safeTender) {
      setImageSrc(getFallbackImage({ id: safeTender.id, title: safeTender.title, category_name: safeTender.category_name }));
    }
  };

  useEffect(() => {
    if (tender?.submission_deadline) {
      setTimeLeft(getTimeLeft(tender.submission_deadline));
      const timer = setInterval(() => {
        setTimeLeft(getTimeLeft(tender.submission_deadline));
      }, 60000);
      return () => clearInterval(timer);
    }
  }, [tender?.submission_deadline]);

  const formatDate = (d: string | undefined) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const formatBudget = (amount?: number) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const exportBids = () => {
    if (!bidsData?.items?.length || !tender) return;
    setExportBidsLoading(true);
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
    setExportBidsLoading(false);
  };

  const startEdit = () => {
    setEditTitle(tender?.title ?? '');
    setEditRef(tender?.reference_number ?? '');
    setEditDescription(tender?.description ?? '');
    setEditCategoryId(tender?.category_id ?? null);
    setEditTags(safeTender?.tags ?? []);
    setEditBudget(safeTender?.budget != null ? String(safeTender.budget) : '');
    setEditSubmissionDeadline(safeTender?.submission_deadline ? safeTender.submission_deadline.replace(' ', 'T').slice(0, 16) : '');
    setEditOpeningDate(tender?.opening_date ? tender.opening_date.replace(' ', 'T').slice(0, 16) : '');
    setEditing(true);
  };

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: number;
      title?: string;
      reference_number?: string;
      description?: string;
      category_id?: number;
      tags?: string[];
      budget?: number;
      submission_deadline?: string;
      opening_date?: string;
    }) => tendersService.update(data),
    onSuccess: () => {
      toastSuccess('Tender updated');
      queryClient.invalidateQueries({ queryKey: ['tender', tenderId] });
      setEditing(false);
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const addTag = (value: string) => {
    const v = value.trim().toLowerCase();
    if (v && !editTags.includes(v) && editTags.length < 20) setEditTags((prev) => [...prev, v]);
  };
  const removeTag = (idx: number) => setEditTags((prev) => prev.filter((_, i) => i !== idx));

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: '#64748b', text: '#ffffff' },
    published: { bg: '#2563eb', text: '#ffffff' },
    closed: { bg: '#d97706', text: '#ffffff' },
    evaluated: { bg: '#7c3aed', text: '#ffffff' },
    awarded: { bg: '#16a34a', text: '#ffffff' },
  };

  if (isLoading || !tender) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const statusColor = statusColors[tender.status] || statusColors.draft;
  const isClosingSoon = tender.status === 'published' && timeLeft?.urgent && !timeLeft?.passed;

  // Header Actions
  const renderHeaderActions = () => {
    const actions: { label: string; icon: React.ReactNode; variant: 'primary' | 'outline' | 'destructive'; onClick: () => void; loading?: boolean }[] = [];

    if (tender.status === 'draft') {
      actions.push(
        { label: 'Edit Tender', icon: <Pencil className="h-4 w-4" />, variant: 'outline', onClick: startEdit },
        { label: 'Publish', icon: <Send className="h-4 w-4" />, variant: 'primary', onClick: () => publishMutation.mutate(), loading: publishMutation.isPending },
        { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, variant: 'destructive', onClick: () => { if (window.confirm('Delete this tender?')) deleteMutation.mutate(); } }
      );
    } else if (tender.status === 'published') {
      actions.push(
        { label: 'Edit Tender', icon: <Pencil className="h-4 w-4" />, variant: 'outline', onClick: startEdit },
        { label: 'Publish', icon: <Send className="h-4 w-4" />, variant: 'primary', onClick: () => publishMutation.mutate(), loading: publishMutation.isPending },
        { label: 'Close', icon: <XCircle className="h-4 w-4" />, variant: 'destructive', onClick: () => { if (window.confirm('Close this tender?')) closeMutation.mutate(); }, loading: closeMutation.isPending }
      );
    } else if (tender.status === 'closed' || tender.status === 'evaluated') {
      actions.push({ label: 'View', icon: <Eye className="h-4 w-4" />, variant: 'primary', onClick: () => {} });
    } else if (tender.status === 'awarded') {
      actions.push({ label: 'View', icon: <Eye className="h-4 w-4" />, variant: 'primary', onClick: () => {} });
    }

    return actions.map((action, idx) => (
      <Button
        key={idx}
        variant={action.variant === 'destructive' ? 'outline' : action.variant === 'primary' ? 'default' : 'outline'}
        className={action.variant === 'destructive' ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}
        onClick={action.onClick}
        disabled={action.loading}
      >
        {action.loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : action.icon}
        {action.label}
      </Button>
    ));
  };

  // Stats Row
  const stats = [
    { icon: <Inbox className="h-4 w-4" />, label: 'Bids Received', value: bidsData?.total ?? 0 },
    { icon: <Users className="h-4 w-4" />, label: 'Evaluators', value: 0 }, // TODO: fetch evaluator count
    { icon: <Clock className="h-4 w-4" />, label: 'Days Left', value: timeLeft?.passed ? 'Closed' : timeLeft?.text.split(' ')[0] || '—' },
    { icon: <FileText className="h-4 w-4" />, label: 'Documents', value: 0 }, // TODO: fetch document count
  ];

  // Tab Content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'description':
        return (
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="mb-2 text-lg font-semibold">Description</h3>
              {editing ? null : (
                <p className="whitespace-pre-wrap text-gray-700">{safeTender.description || 'No description provided.'}</p>
              )}
            </div>

            {/* Evaluation Criteria */}
            <div>
              <h3 className="mb-2 text-lg font-semibold">Evaluation Criteria</h3>
              {tender.criteria && tender.criteria.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left">#</th>
                      <th className="pb-2 text-left">Criteria</th>
                      <th className="pb-2 text-left">Description</th>
                      <th className="pb-2 text-right">Max Score</th>
                      <th className="pb-2 text-right">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tender.criteria.map((c, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{idx + 1}</td>
                        <td className="py-2 font-medium">{c.name}</td>
                        <td className="py-2 text-gray-600">{c.description || '—'}</td>
                        <td className="py-2 text-right">{c.max_score}</td>
                        <td className="py-2 text-right">{c.weight * 100}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
                  <AlertTriangle className="mr-2 inline h-4 w-4" />
                  No evaluation criteria defined. Add criteria before publishing.
                </div>
              )}
            </div>

            {/* Tags */}
            {tender.tags && tender.tags.length > 0 && (
              <div>
                <h3 className="mb-2 text-lg font-semibold">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tender.tags.map((tag) => (
                    <TagChip key={tag} tag={tag} />
                  ))}
                </div>
              </div>
            )}

            {/* Edit Form */}
            {editing && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label>Title</Label>
                    <Input className="mt-1" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>Reference number</Label>
                    <Input className="mt-1" value={editRef} onChange={(e) => setEditRef(e.target.value)} />
                  </div>
                </div>
                <div className="mt-3">
                  <Label>Description</Label>
                  <textarea className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <Label>Category</Label>
                    <select className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={editCategoryId ?? ''} onChange={(e) => setEditCategoryId(parseInt(e.target.value, 10) || null)}>
                      <option value="">Select category</option>
                      {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <Label>Budget</Label>
                    <Input type="number" step="0.01" className="mt-1" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} />
                  </div>
                  <div>
                    <Label>Submission deadline</Label>
                    <Input type="datetime-local" className="mt-1" value={editSubmissionDeadline} onChange={(e) => setEditSubmissionDeadline(e.target.value)} />
                  </div>
                </div>
                <div className="mt-3">
                  <Label>Tags</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {editTags.map((t, i) => (<TagChip key={t} tag={t} onRemove={() => removeTag(i)} />))}
                    <Input ref={tagInputRef} className="w-36" placeholder="Add tag..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => updateMutation.mutate({ id: tenderId, title: editTitle.trim(), reference_number: editRef.trim(), description: editDescription.trim(), category_id: editCategoryId ?? undefined, tags: editTags, budget: editBudget !== '' ? Number(editBudget) : undefined, submission_deadline: editSubmissionDeadline || undefined, opening_date: editOpeningDate || undefined })} disabled={updateMutation.isPending}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        );

      case 'bids':
        return (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Bids ({bidsData?.total ?? 0})</h3>
              {(tender.status === 'closed' || tender.status === 'evaluated' || tender.status === 'awarded') && (
                <ExportButton label="Export Bids" onClick={exportBids} loading={exportBidsLoading} empty={!bidsData?.items?.length} />
              )}
            </div>
            {bidsData?.items?.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left">Supplier</th>
                    <th className="pb-2 text-left">Company</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-center">Status</th>
                    <th className="pb-2 text-left">Submitted</th>
                    <th className="pb-2 text-right">Score</th>
                    <th className="pb-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bidsData.items.map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className="py-2">{b.supplier_name ?? '—'}</td>
                      <td className="py-2">{b.company_name ?? '—'}</td>
                      <td className="py-2 text-right font-medium">{formatBudget(b.bid_amount)}</td>
                      <td className="py-2 text-center">
                        <Badge variant={b.status === 'accepted' ? 'success' : b.status === 'rejected' ? 'destructive' : 'secondary'}>{b.status}</Badge>
                      </td>
                      <td className="py-2">{formatDate(b.submitted_at)}</td>
                      <td className="py-2 text-right">—</td>
                      <td className="py-2 text-center">
                        <Button size="sm" variant="outline">View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-gray-500">No bids received yet</div>
            )}
          </div>
        );

      case 'evaluation':
        return (
          <div>
            <h3 className="mb-4 text-lg font-semibold">Evaluation</h3>
            {tender.status !== 'closed' && tender.status !== 'evaluated' && tender.status !== 'awarded' ? (
              <div className="rounded-lg bg-gray-100 p-4 text-gray-600">
                <Clock className="mr-2 inline h-4 w-4" />
                Evaluation will be available once the tender is closed.
              </div>
            ) : (
              <div>
                {/* Progress */}
                <div className="mb-4 rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">2 of 3 evaluators have submitted scores</p>
                  <div className="mt-2 h-2 w-full rounded-full bg-blue-200">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: '67%' }} />
                  </div>
                </div>
                {/* Leaderboard */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left">Rank</th>
                      <th className="pb-2 text-left">Supplier</th>
                      <th className="pb-2 text-left">Company</th>
                      <th className="pb-2 text-right">Weighted Score</th>
                      <th className="pb-2 text-right">Quality</th>
                      <th className="pb-2 text-right">Price</th>
                      <th className="pb-2 text-right">Experience</th>
                      <th className="pb-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-l-4 border-l-yellow-400 bg-yellow-50">
                      <td className="py-2">🥇 1</td>
                      <td className="py-2">Kwame A.</td>
                      <td className="py-2">Acme Ltd</td>
                      <td className="py-2 text-right font-bold">87.5</td>
                      <td className="py-2 text-right">90</td>
                      <td className="py-2 text-right">85</td>
                      <td className="py-2 text-right">80</td>
                      <td className="py-2 text-center"><Button size="sm" variant="outline">View Scores</Button></td>
                    </tr>
                    <tr className="border-b border-l-4 border-l-gray-300 bg-gray-50">
                      <td className="py-2">🥈 2</td>
                      <td className="py-2">Abena M.</td>
                      <td className="py-2">BuildCo</td>
                      <td className="py-2 text-right font-bold">76.2</td>
                      <td className="py-2 text-right">75</td>
                      <td className="py-2 text-right">78</td>
                      <td className="py-2 text-right">75</td>
                      <td className="py-2 text-center"><Button size="sm" variant="outline">View Scores</Button></td>
                    </tr>
                  </tbody>
                </table>
                {tender.status === 'evaluated' && (
                  <div className="mt-4 flex gap-2">
                    <Button>Award Tender</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'documents':
        return (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Documents</h3>
              <Button size="sm" variant="outline" className="gap-1">
                <Upload className="h-4 w-4" /> Upload Document
              </Button>
            </div>
            <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-gray-500">
              <FileText className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              No documents uploaded yet
            </div>
          </div>
        );

      case 'evaluators':
        return (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Evaluators</h3>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-4 w-4" /> Assign Evaluator
              </Button>
            </div>
            <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-gray-500">
              <Users className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              No evaluators assigned yet
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {/* Back Link */}
      <Link to="/admin/tenders" className="mb-4 inline-flex items-center text-sm text-primary hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Tenders
      </Link>

      {/* Header Card */}
      <Card className="mb-6 overflow-hidden">
        {/* Image Banner */}
        <div className="relative h-[200px] w-full">
          <img src={imageSrc} alt={tender.category_name || 'Tender'} className="h-full w-full object-cover" onError={handleImageError} />
          <div className="absolute inset-0 bg-black/40" />
          
          {/* Status & Category Badges */}
          <div className="absolute left-4 top-4 flex items-center gap-2">
            {tender.category_name && (
              <CategoryBadge category_name={tender.category_name} category_color={tender.category_color || categoryAsset.color} />
            )}
            <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: statusColor.bg }}>
              <span className="h-2 w-2 rounded-full bg-white/30" /> {tender.status.charAt(0).toUpperCase() + tender.status.slice(1)}
            </span>
            {tender.status === 'awarded' && <span className="text-2xl">🏆</span>}
          </div>

          {/* Closing Soon Warning */}
          {isClosingSoon && (
            <div className="absolute right-4 top-4">
              <span className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-sm font-medium text-white">
                <AlertTriangle className="h-4 w-4" /> Closing Soon
              </span>
            </div>
          )}
        </div>

        {/* Card Body */}
        <CardContent className="p-6">
          {/* Title & Reference */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-[#0f172a]">{safeTender.title}</h1>
            <p className="text-gray-500">{safeTender.reference_number}</p>
          </div>

          {/* Info Grid */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Calendar className={`h-5 w-5 ${timeLeft?.urgent ? 'text-red-500' : 'text-gray-400'}`} />
              <div>
                <p className="text-xs text-gray-500">Deadline</p>
                <p className="font-medium">{formatDate(tender.submission_deadline)}</p>
                <p className={`text-xs ${timeLeft?.urgent ? 'text-red-500' : 'text-gray-500'}`}>{timeLeft?.text}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Budget</p>
                <p className="font-medium">{formatBudget(safeTender.budget)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Created by</p>
                <p className="font-medium">System Admin</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="font-medium">{formatDate(tender.created_at)}</p>
                {tender.opening_date && (
                  <>
                    <p className="text-xs text-gray-500">Opening</p>
                    <p className="font-medium">{formatDate(tender.opening_date)}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {renderHeaderActions()}
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="py-4">
            <CardContent className="flex items-center gap-3 p-0 px-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">{stat.icon}</div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabbed Content */}
      <Card>
        {/* Tab Headers */}
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <CardContent className="p-6">
          {renderTabContent()}
        </CardContent>
      </Card>
    </div>
  );
}
