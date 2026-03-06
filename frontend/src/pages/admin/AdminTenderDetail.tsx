import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { bidsService } from '@/services/bids';
import { contractService } from '@/services/contractService';
import { reportsService } from '@/services/reports';
import { getCategories } from '@/services/categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExportButton } from '@/components/ui/ExportButton';
import { useAuth } from '@/context/AuthContext';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { CategoryBadge } from '@/components/tenders/CategoryBadge';
import { TagChip } from '@/components/tenders/TagChip';
import { exportToExcel, exportMultiSheet } from '@/utils/exportExcel';
import { LogOut, ArrowLeft, Pencil } from 'lucide-react';

export function AdminTenderDetail() {
  const { id } = useParams<{ id: string }>();
  const tenderId = id ? parseInt(id, 10) : 0;
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const { data: tender, isLoading } = useQuery({
    queryKey: ['tender', tenderId],
    queryFn: () => tendersService.show(tenderId),
    enabled: tenderId > 0,
  });

  const { data: bidsData } = useQuery({
    queryKey: ['bids', tenderId],
    queryFn: () => bidsService.list({ tender_id: tenderId }),
    enabled: tenderId > 0,
  });

  const { data: contractId } = useQuery({
    queryKey: ['contract-by-tender', tenderId],
    queryFn: () => contractService.getContractIdByTenderId(tenderId),
    enabled: tenderId > 0 && tender?.status === 'awarded',
  });

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

  const [editing, setEditing] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [exportBidsLoading, setExportBidsLoading] = useState(false);
  const [exportEvalLoading, setExportEvalLoading] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const formatDate = (d: string | undefined) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

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

  const exportEvaluation = async () => {
    if (!tender) return;
    setExportEvalLoading(true);
    toastSuccess('Exporting... your download will start shortly');
    try {
      const report = await reportsService.getTenderReport(tenderId);
      const criteriaNames =
        report.summary.length > 0
          ? Object.keys(report.summary[0].criteria_scores)
          : [];
      const summaryRows = report.summary.map((s) => {
        const row: Record<string, string | number> = {
          Supplier: s.supplier_name,
          Company: s.company_name,
          ...Object.fromEntries(
            criteriaNames.map((c) => [`${c} Score`, s.criteria_scores[c] ?? '—'])
          ),
          'Total Score': s.total_score,
          'Weighted Score': s.weighted_score,
          Rank: s.rank,
        };
        return row;
      });
      const detailedRows = report.detailed.map((d) => ({
        Supplier: d.supplier_name,
        Evaluator: d.evaluator_name,
        Criteria: d.criteria_name,
        Score: d.score,
        'Max Score': d.max_score,
        Comment: d.comment,
      }));
      exportMultiSheet(
        [
          { name: 'Score Summary', data: summaryRows },
          { name: 'Detailed Scores', data: detailedRows },
        ],
        `evaluation_${tender.reference_number}`
      );
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to export evaluation');
    } finally {
      setExportEvalLoading(false);
    }
  };

  const startEdit = () => {
    setEditCategoryId(tender?.category_id ?? null);
    setEditTags(tender?.tags ?? []);
    setEditing(true);
  };

  const updateMutation = useMutation({
    mutationFn: (data: { category_id?: number; tags?: string[] }) =>
      tendersService.update({ id: tenderId, ...data }),
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

  if (isLoading || !tender) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/admin/dashboard" className="font-semibold text-primary">Admin</Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/admin/tenders" className="mb-4 inline-flex items-center text-sm text-primary hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Tenders
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">{tender.title}</CardTitle>
              <Badge className="mt-2">{tender.status}</Badge>
              <p className="mt-1 text-sm text-gray-600">{tender.reference_number}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ExportButton
                label="Export Bids"
                onClick={exportBids}
                loading={exportBidsLoading}
                empty={!bidsData?.items?.length}
              />
              {(tender.status === 'closed' || tender.status === 'evaluated' || tender.status === 'awarded') && (
                <ExportButton
                  label="Export Evaluation"
                  onClick={exportEvaluation}
                  loading={exportEvalLoading}
                />
              )}
              {tender.status === 'awarded' && contractId !== undefined && (
                contractId != null ? (
                  <Link to={`/admin/contracts/${contractId}`}>
                    <Button variant="outline">View Contract</Button>
                  </Link>
                ) : (
                  <Link to="/admin/contracts/create">
                    <Button variant="outline">Create Contract</Button>
                  </Link>
                )
              )}
              {tender.status === 'draft' && (
                <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
                  Publish
                </Button>
              )}
              {(tender.status === 'published' || tender.status === 'draft') && (
                <Button variant="outline" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
                  Close
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {tender.category_name && (
                <CategoryBadge category_name={tender.category_name} category_color={tender.category_color} />
              )}
              {tender.tags && tender.tags.length > 0 && (
                <span className="flex flex-wrap gap-1">
                  {tender.tags.slice(0, 5).map((tag) => (
                    <TagChip key={tag} tag={tag} />
                  ))}
                  {tender.tags.length > 5 && (
                    <span className="text-xs text-gray-500">+{tender.tags.length - 5} more</span>
                  )}
                </span>
              )}
              {tender.status === 'draft' && (
                <Button variant="ghost" size="sm" onClick={startEdit} className="gap-1">
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              )}
            </div>
            {editing ? (
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div>
                  <Label>Category</Label>
                  <select
                    className="mt-1 w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={editCategoryId ?? ''}
                    onChange={(e) => setEditCategoryId(parseInt(e.target.value, 10) || null)}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Tags</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {editTags.map((t, i) => (
                      <TagChip key={t} tag={t} onRemove={() => removeTag(i)} />
                    ))}
                    <Input
                      ref={tagInputRef}
                      className="w-36"
                      placeholder="Add tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const target = e.target as HTMLInputElement;
                          addTag(target.value);
                          target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateMutation.mutate({ category_id: editCategoryId ?? undefined, tags: editTags })} disabled={updateMutation.isPending}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : null}
            <p className="whitespace-pre-wrap text-gray-700">{tender.description}</p>
            <p className="text-sm text-gray-600">Deadline: {tender.submission_deadline}</p>
            {tender.budget != null && (
              <p className="text-sm">Budget: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tender.budget)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Bids ({bidsData?.total ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {bidsData?.items?.length ? (
              <>
                <p className="mb-2 text-sm text-gray-500">Evaluators score bids from their dashboard.</p>
                <ul className="space-y-2">
                  {bidsData.items.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 p-3">
                      <span>{b.supplier_name ?? `Bid #${b.id}`}</span>
                      <Badge variant="secondary">{b.status}</Badge>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-gray-500">No bids yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
