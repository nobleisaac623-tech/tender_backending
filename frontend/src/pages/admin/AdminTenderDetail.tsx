import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { bidsService } from '@/services/bids';
import { evaluationsService } from '@/services/evaluations';
// import { contractService } from '@/services/contractService'; // reserved for future use
// import { reportsService } from '@/services/reports'; // reserved for future use
import { getCategories } from '@/services/categories';
import { api } from '@/services/api';
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
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [selectedBidId, setSelectedBidId] = useState<number | null>(null);
  const [scoreDetailBidId, setScoreDetailBidId] = useState<number | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);
  const [tenderDocUploading, setTenderDocUploading] = useState(false);
  const [downloadingTenderDocId, setDownloadingTenderDocId] = useState<number | null>(null);
  const [removingTenderDocId, setRemovingTenderDocId] = useState<number | null>(null);
  const [evaluationMode, setEvaluationMode] = useState<'manual' | 'ai_auto' | null>(null);
  const tenderDocInputRef = useRef<HTMLInputElement>(null);

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
    // Load bids as soon as the tender is open so stats (e.g. Bids Received) show the real count
    // without requiring a click on the Bids tab first.
    enabled: tenderId > 0,
    staleTime: 30000,
  });

  const { data: selectedBid, isLoading: selectedBidLoading } = useQuery({
    queryKey: ['bid', selectedBidId],
    queryFn: () => bidsService.show(selectedBidId as number),
    enabled: bidModalOpen && typeof selectedBidId === 'number' && selectedBidId > 0,
    staleTime: 0,
  });
  const { data: evaluationsData = [] } = useQuery({
    queryKey: ['evaluations', tenderId],
    queryFn: () => evaluationsService.list({ tender_id: tenderId }),
    enabled: tenderId > 0 && (tender?.status === 'closed' || tender?.status === 'evaluated' || tender?.status === 'awarded'),
    staleTime: 10000,
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

  const finalizeEvaluationMutation = useMutation({
    mutationFn: () => evaluationsService.finalize(tenderId),
    onSuccess: (data) => {
      const mode = data?.evaluation_mode === 'ai_auto' ? 'ai_auto' : 'manual';
      setEvaluationMode(mode);
      toastSuccess(
        mode === 'ai_auto'
          ? 'Evaluation finalized (AI auto-evaluation used: no evaluator assigned)'
          : 'Evaluation finalized (manual evaluator scores)'
      );
      queryClient.invalidateQueries({ queryKey: ['tender', tenderId] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed to finalize evaluation'),
  });
  const awardMutation = useMutation({
    mutationFn: (bidId: number) => tendersService.award(tenderId, bidId),
    onSuccess: (data) => {
      toastSuccess('Tender awarded successfully');
      queryClient.invalidateQueries({ queryKey: ['tender', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['bids', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['evaluations', tenderId] });
      if (data?.contract_id) {
        // Move admin straight into the drafted contract for review/edit/sign
        window.location.href = `/admin/contracts/${data.contract_id}`;
      }
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed to award tender'),
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
  const categoryAsset = getCategoryAsset(tender?.category_name ?? null);
  const [imageSrc, setImageSrc] = useState<string>('');

  // Set imageSrc when tender loads
  useEffect(() => {
    if (tender) {
      setImageSrc(getTenderImage(tender));
    }
  }, [tender]);

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

  const openBidModal = (bidId: number) => {
    setSelectedBidId(bidId);
    setBidModalOpen(true);
  };

  const closeBidModal = () => {
    setBidModalOpen(false);
    setSelectedBidId(null);
    setDownloadingDocId(null);
  };

  const downloadTenderDocument = async (docId: number, filename: string) => {
    try {
      setDownloadingTenderDocId(docId);
      const res = await api.get('/uploads/download', {
        params: { type: 'tender_doc', id: docId },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `tender_document_${docId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadingTenderDocId(null);
    }
  };

  const uploadTenderDocuments = async (files: FileList | null) => {
    if (!files?.length || !tenderId) return;
    try {
      setTenderDocUploading(true);
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await api.post<{ success: boolean; data: { filename: string; original_name: string; file_size: number } }>(
          '/uploads/upload',
          fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        const ref = uploadRes.data?.data;
        if (!ref?.filename) {
          throw new Error('Upload failed: malformed server response');
        }
        await tendersService.addDocument(tenderId, {
          filename: ref.filename,
          original_name: ref.original_name || file.name,
          file_size: ref.file_size,
        });
      }
      toastSuccess('Document(s) attached to tender');
      queryClient.invalidateQueries({ queryKey: ['tender', tenderId] });
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setTenderDocUploading(false);
      if (tenderDocInputRef.current) tenderDocInputRef.current.value = '';
    }
  };

  const removeTenderDocument = async (docId: number) => {
    try {
      setRemovingTenderDocId(docId);
      await tendersService.removeDocument(docId);
      toastSuccess('Document removed');
      queryClient.invalidateQueries({ queryKey: ['tender', tenderId] });
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Remove failed');
    } finally {
      setRemovingTenderDocId(null);
    }
  };

  const downloadBidDocument = async (docId: number, filename: string) => {
    try {
      setDownloadingDocId(docId);
      const res = await api.get('/uploads/download', {
        params: { type: 'bid_doc', id: docId },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `bid_document_${docId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadingDocId(null);
    }
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
  };

  const rankingRows = (() => {
    const perBid = new Map<number, { weighted: number; totalWeight: number }>();
    for (const e of evaluationsData as any[]) {
      const bidId = Number(e.bid_id);
      const criteriaId = Number(e.criteria_id);
      const key = `${bidId}:${criteriaId}`;
      // compute average by bid+criteria in one pass
      // accumulate in temp map attached to function scope
      (perBid as any).__crit ||= new Map<string, { total: number; count: number; weight: number }>();
      const critMap: Map<string, { total: number; count: number; weight: number }> = (perBid as any).__crit;
      const cur = critMap.get(key) || { total: 0, count: 0, weight: Number(e.weight ?? 1) };
      cur.total += Number(e.score ?? 0);
      cur.count += 1;
      cur.weight = Number(e.weight ?? cur.weight ?? 1);
      critMap.set(key, cur);
    }
    const critMap: Map<string, { total: number; count: number; weight: number }> = ((perBid as any).__crit || new Map());
    for (const [k, v] of critMap.entries()) {
      const [bidIdRaw] = k.split(':');
      const bidId = Number(bidIdRaw);
      const b = perBid.get(bidId) || { weighted: 0, totalWeight: 0 };
      const avg = v.count > 0 ? v.total / v.count : 0;
      b.weighted += avg * v.weight;
      b.totalWeight += v.weight;
      perBid.set(bidId, b);
    }
    const rows = (bidsData?.items ?? []).map((b) => {
      const agg = perBid.get(b.id);
      const weightedScore = agg && agg.totalWeight > 0 ? Number((agg.weighted / agg.totalWeight).toFixed(2)) : 0;
      return { bid: b, weightedScore };
    });
    rows.sort((a, b) => b.weightedScore - a.weightedScore);
    return rows.map((r, idx) => ({ ...r, rank: idx + 1 }));
  })();

  const scoreModalBid = scoreDetailBidId ? rankingRows.find((r) => r.bid.id === scoreDetailBidId)?.bid ?? null : null;
  const scoreModalRows = scoreDetailBidId
    ? (evaluationsData as any[]).filter((e) => Number(e.bid_id) === scoreDetailBidId)
    : [];

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
    { icon: <FileText className="h-4 w-4" />, label: 'Documents', value: tender?.documents?.length ?? 0 },
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
                        <Button size="sm" variant="outline" onClick={() => openBidModal(b.id)}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-gray-500">No bids received yet</div>
            )}

            {/* Bid details modal */}
            {bidModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) closeBidModal();
                }}
                role="dialog"
                aria-modal="true"
              >
                <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b px-5 py-4">
                    <div>
                      <h4 className="text-lg font-semibold">Bid Details</h4>
                      <p className="text-sm text-gray-500">
                        {selectedBidId ? `Bid #${selectedBidId}` : '—'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={closeBidModal}>Close</Button>
                  </div>

                  <div className="max-h-[75vh] overflow-auto p-5">
                    {selectedBidLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                        Loading bid...
                      </div>
                    )}

                    {!selectedBidLoading && selectedBid && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-gray-500">Supplier</p>
                            <p className="font-medium">{(selectedBid as any).supplier_name ?? '—'}</p>
                            <p className="text-sm text-gray-600">{(selectedBid as any).company_name ?? '—'}</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-gray-500">Status</p>
                            <div className="mt-1">
                              <Badge variant={(selectedBid as any).status === 'accepted' ? 'success' : (selectedBid as any).status === 'rejected' ? 'destructive' : 'secondary'}>
                                {(selectedBid as any).status ?? '—'}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">Submitted</p>
                            <p className="text-sm font-medium">{formatDate((selectedBid as any).submitted_at)}</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-gray-500">Bid Amount</p>
                            <p className="text-lg font-semibold">{formatBudget((selectedBid as any).bid_amount)}</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-gray-500">Tender</p>
                            <p className="font-medium">{(selectedBid as any).tender_title ?? safeTender.title ?? '—'}</p>
                            <p className="text-sm text-gray-600">{(selectedBid as any).reference_number ?? safeTender.reference_number ?? '—'}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border p-4">
                          <p className="mb-2 text-sm font-semibold">Technical Proposal</p>
                          <p className="whitespace-pre-wrap text-sm text-gray-700">
                            {(selectedBid as any).technical_proposal ?? '—'}
                          </p>
                        </div>

                        <div className="rounded-lg border p-4">
                          <p className="mb-3 text-sm font-semibold">Documents</p>
                          {(selectedBid as any).documents?.length ? (
                            <div className="space-y-2">
                              {(selectedBid as any).documents.map((d: any) => (
                                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{d.original_name ?? d.filename ?? `Document #${d.id}`}</p>
                                    <p className="text-xs text-gray-500">
                                      {d.document_type ? `${d.document_type}` : 'Document'}
                                      {d.file_size ? ` • ${Math.round(Number(d.file_size) / 1024)} KB` : ''}
                                      {d.uploaded_at ? ` • ${formatDate(d.uploaded_at)}` : ''}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={downloadingDocId === d.id}
                                    onClick={() => downloadBidDocument(d.id, d.original_name ?? '')}
                                  >
                                    {downloadingDocId === d.id ? 'Downloading...' : 'Download'}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">No documents attached to this bid.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                {(evaluationMode || tender.status === 'evaluated' || tender.status === 'awarded') && (
                  <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                    evaluationMode === 'ai_auto'
                      ? 'border-purple-200 bg-purple-50 text-purple-800'
                      : 'border-blue-200 bg-blue-50 text-blue-800'
                  }`}>
                    <strong>Evaluation mode:</strong>{' '}
                    {evaluationMode === 'ai_auto' ? 'AI auto-evaluation (no evaluator assigned)' : 'Manual evaluator scoring'}
                  </div>
                )}
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
                      <th className="pb-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingRows.length === 0 ? (
                      <tr>
                        <td className="py-4 text-center text-gray-500" colSpan={5}>No evaluation scores available yet.</td>
                      </tr>
                    ) : rankingRows.map((r) => (
                      <tr key={r.bid.id} className={`border-b ${r.rank === 1 ? 'border-l-4 border-l-yellow-400 bg-yellow-50' : ''}`}>
                        <td className="py-2">{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : ''} {r.rank}</td>
                        <td className="py-2">{r.bid.supplier_name ?? '—'}</td>
                        <td className="py-2">{r.bid.company_name ?? '—'}</td>
                        <td className="py-2 text-right font-bold">{r.weightedScore.toFixed(2)}</td>
                        <td className="py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setScoreDetailBidId(r.bid.id)}>View Scores</Button>
                            {tender.status === 'evaluated' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(`Award tender to ${r.bid.company_name ?? r.bid.supplier_name ?? `Bid #${r.bid.id}`}?`)) {
                                    awardMutation.mutate(r.bid.id);
                                  }
                                }}
                                disabled={awardMutation.isPending}
                              >
                                {awardMutation.isPending ? 'Awarding...' : 'Award'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {scoreDetailBidId && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onMouseDown={(e) => {
                      if (e.target === e.currentTarget) setScoreDetailBidId(null);
                    }}
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b px-5 py-4">
                        <div>
                          <h4 className="text-lg font-semibold">Score Breakdown</h4>
                          <p className="text-sm text-gray-500">
                            Bid #{scoreDetailBidId} • {(scoreModalBid as any)?.company_name ?? (scoreModalBid as any)?.supplier_name ?? '—'}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setScoreDetailBidId(null)}>Close</Button>
                      </div>
                      <div className="max-h-[75vh] overflow-auto p-5">
                        <div className="mb-3 text-sm text-gray-600">
                          Weighted total:{' '}
                          <span className="font-semibold text-gray-900">
                            {(rankingRows.find((r) => r.bid.id === scoreDetailBidId)?.weightedScore ?? 0).toFixed(2)}
                          </span>
                        </div>
                        {scoreModalRows.length === 0 ? (
                          <p className="text-sm text-gray-600">No criterion scores found for this bid.</p>
                        ) : (
                          <div className="space-y-3">
                            {Array.from(
                              scoreModalRows.reduce((m: Map<number, any[]>, row: any) => {
                                const k = Number(row.criteria_id);
                                const arr = m.get(k) || [];
                                arr.push(row);
                                m.set(k, arr);
                                return m;
                              }, new Map<number, any[]>())
                            ).map(([criteriaId, rows]) => {
                              const first = rows[0];
                              const avg = rows.reduce((s, x) => s + Number(x.score ?? 0), 0) / rows.length;
                              return (
                                <div key={criteriaId} className="rounded-lg border p-3">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium">{first.criteria_name ?? `Criteria ${criteriaId}`}</p>
                                    <p className="text-sm text-gray-600">
                                      Avg: <span className="font-semibold">{avg.toFixed(2)}</span> / {Number(first.max_score ?? 100)}
                                      {' '}• Weight: {Number(first.weight ?? 1)}
                                    </p>
                                  </div>
                                  <div className="mt-2 space-y-2">
                                    {rows.map((r: any) => (
                                      <div key={r.id} className="rounded bg-gray-50 px-2 py-2 text-sm">
                                        <p>
                                          Evaluator #{r.evaluator_id}: <span className="font-medium">{r.score}</span>
                                        </p>
                                        {r.comment && <p className="mt-1 text-gray-600">{r.comment}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {tender.status === 'closed' && (
                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => finalizeEvaluationMutation.mutate()} disabled={finalizeEvaluationMutation.isPending}>
                      {finalizeEvaluationMutation.isPending ? 'Finalizing...' : 'Finalize Evaluation'}
                    </Button>
                  </div>
                )}
                {tender.status === 'evaluated' && rankingRows.length === 0 && (
                  <p className="mt-4 text-sm text-gray-500">No ranked bids available to award yet.</p>
                )}
              </div>
            )}
          </div>
        );

      case 'documents':
        return (
          <div>
            <input
              ref={tenderDocInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => uploadTenderDocuments(e.target.files)}
            />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Tender documents</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                disabled={tenderDocUploading}
                onClick={() => tenderDocInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> {tenderDocUploading ? 'Uploading…' : 'Upload documents'}
              </Button>
            </div>
            <p className="mb-4 text-xs text-gray-500">
              These files are part of the official tender pack (RFP, BOQ, specs). Suppliers with access to this tender can download them when the tender is published.
            </p>
            {tender.documents && tender.documents.length > 0 ? (
              <div className="space-y-2">
                {tender.documents.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.original_name ?? d.filename}</p>
                      <p className="text-xs text-gray-500">
                        {d.file_size ? `${Math.round(Number(d.file_size) / 1024)} KB` : '—'}
                        {d.uploaded_at ? ` • ${formatDate(d.uploaded_at)}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={downloadingTenderDocId === d.id || tenderDocUploading}
                        onClick={() => downloadTenderDocument(d.id, d.original_name ?? '')}
                      >
                        {downloadingTenderDocId === d.id ? 'Downloading…' : 'Download'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        disabled={removingTenderDocId === d.id || tenderDocUploading}
                        onClick={() => {
                          if (window.confirm('Remove this document from the tender?')) removeTenderDocument(d.id);
                        }}
                      >
                        {removingTenderDocId === d.id ? 'Removing…' : 'Remove'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-gray-500">
                <FileText className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                No tender documents yet. Upload PDF, Word, Excel, or images (max 10MB each).
              </div>
            )}
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
