import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractService } from '@/services/contractService';
import { ratingService } from '@/services/ratingService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { LogOut, ArrowLeft, Check, Clock, Plus, Download, Pencil, FileText, Star } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { RatingBreakdown } from '@/components/ratings/RatingBreakdown';
import type { Contract, ContractMilestone, ContractStatus, MilestoneStatus, SupplierRating } from '@/types';

const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-200 text-gray-800' },
  active: { label: 'Active', className: 'bg-green-200 text-green-800' },
  completed: { label: 'Completed', className: 'bg-blue-200 text-blue-800' },
  terminated: { label: 'Terminated', className: 'bg-red-200 text-red-800' },
  disputed: { label: 'Disputed', className: 'bg-amber-200 text-amber-800' },
};

const milestoneStatusConfig: Record<MilestoneStatus, string> = {
  pending: 'bg-gray-200',
  in_progress: 'bg-blue-200',
  completed: 'bg-green-200',
  overdue: 'bg-red-200',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(value);
}

export function AdminContractDetail() {
  const { id } = useParams<{ id: string }>();
  const contractId = id ? parseInt(id, 10) : 0;
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(null);
  const [uploadType, setUploadType] = useState('contract');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [newMilestone, setNewMilestone] = useState<{ title: string; due_date: string } | null>(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingForm, setRatingForm] = useState({ quality_score: 1, delivery_score: 1, communication_score: 1, compliance_score: 1, comments: '' });

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => contractService.show(contractId),
    enabled: contractId > 0,
  });

  const signMutation = useMutation({
    mutationFn: () => contractService.sign(contractId, 'admin'),
    onSuccess: () => {
      toastSuccess('Contract signed');
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!uploadFile) throw new Error('Select a file');
      return contractService.documentUpload(contractId, uploadFile, uploadType);
    },
    onSuccess: () => {
      toastSuccess('Document uploaded');
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      setUploadFile(null);
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const addMilestoneMutation = useMutation({
    mutationFn: (data: { title: string; due_date: string }) =>
      contractService.milestoneCreate({
        contract_id: contractId,
        title: data.title,
        due_date: data.due_date,
      }),
    onSuccess: () => {
      toastSuccess('Milestone added');
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      setNewMilestone(null);
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const { data: contractRating } = useQuery({
    queryKey: ['rating-by-contract', contractId],
    queryFn: () => ratingService.getByContractId(contractId),
    enabled: contractId > 0 && !!contract && contract.status === 'completed',
  });

  const submitRatingMutation = useMutation({
    mutationFn: () =>
      ratingService.create({
        contract_id: contractId,
        quality_score: ratingForm.quality_score || 1,
        delivery_score: ratingForm.delivery_score || 1,
        communication_score: ratingForm.communication_score || 1,
        compliance_score: ratingForm.compliance_score || 1,
        comments: ratingForm.comments.trim() || undefined,
      }),
    onSuccess: () => {
      toastSuccess('Rating submitted');
      queryClient.invalidateQueries({ queryKey: ['rating-by-contract', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      setRatingModalOpen(false);
      setRatingForm({ quality_score: 1, delivery_score: 1, communication_score: 1, compliance_score: 1, comments: '' });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  if (isLoading || !contract) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const statusBadge = statusConfig[contract.status] ?? statusConfig.draft;
  const completedMilestones = contract.milestones.filter((m) => m.status === 'completed').length;
  const totalMilestones = contract.milestones.length;
  const progressPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const bothSigned = contract.signed_by_admin && contract.signed_by_supplier;
  const canRate = contract.status === 'completed' && !contractRating;
  const overallLive = [ratingForm.quality_score, ratingForm.delivery_score, ratingForm.communication_score, ratingForm.compliance_score].every((s) => s >= 1)
    ? ((ratingForm.quality_score + ratingForm.delivery_score + ratingForm.communication_score + ratingForm.compliance_score) / 4).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/admin/dashboard" className="font-semibold text-primary">
            Admin
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/admin/contracts" className="mb-4 inline-flex items-center text-sm text-primary hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Contracts
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{contract.title}</h1>
            <p className="font-mono text-sm text-gray-600">{contract.contract_number}</p>
            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>

        {bothSigned && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            <strong>Contract is fully executed and active.</strong> Both parties have signed.
          </div>
        )}

        {contract.status === 'completed' && canRate && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <p className="font-medium">This contract is complete. Rate the supplier&apos;s performance.</p>
            <Button className="mt-2" onClick={() => setRatingModalOpen(true)}>
              <Star className="mr-2 h-4 w-4" /> Rate Supplier
            </Button>
          </div>
        )}

        {contract.status === 'completed' && contractRating && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Performance rating</CardTitle>
            </CardHeader>
            <CardContent>
              <RatingBreakdown singleRating={contractRating} showOverall={true} />
              {contractRating.comments && (
                <p className="mt-4 text-sm text-gray-600"><strong>Comments:</strong> {contractRating.comments}</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contract details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Value:</strong> {formatCurrency(contract.contract_value)}</p>
              <p><strong>Start:</strong> {contract.start_date} <strong>End:</strong> {contract.end_date}</p>
              <p><strong>Tender:</strong> {contract.tender_title}</p>
              <p><strong>Supplier:</strong> {contract.company_name} ({contract.supplier_name})</p>
              <div className="mt-4 border-t pt-4">
                <p className="font-medium">Signatures</p>
                <div className="mt-2 flex gap-4">
                  <div className="flex-1 rounded border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Admin</p>
                    {contract.signed_by_admin ? (
                      <p className="text-green-700"><Check className="inline h-4 w-4" /> Signed {contract.admin_signed_at ? new Date(contract.admin_signed_at).toLocaleDateString() : ''}</p>
                    ) : (
                      <p className="text-gray-500"><Clock className="inline h-4 w-4" /> Awaiting signature</p>
                    )}
                  </div>
                  <div className="flex-1 rounded border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Supplier</p>
                    {contract.signed_by_supplier ? (
                      <p className="text-green-700"><Check className="inline h-4 w-4" /> Signed {contract.supplier_signed_at ? new Date(contract.supplier_signed_at).toLocaleDateString() : ''}</p>
                    ) : (
                      <p className="text-gray-500"><Clock className="inline h-4 w-4" /> Awaiting signature</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sign contract</CardTitle>
            </CardHeader>
            <CardContent>
              {!contract.signed_by_admin && !['completed', 'terminated'].includes(contract.status) && (
                <Button onClick={() => signMutation.mutate()} disabled={signMutation.isPending}>
                  Sign as Admin
                </Button>
              )}
              {contract.signed_by_admin && (
                <p className="text-sm text-gray-600">You have signed this contract.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {contract.description && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{contract.description}</p>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Milestones</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewMilestone({ title: '', due_date: '' })}
              disabled={!!newMilestone}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Milestone
            </Button>
          </CardHeader>
          <CardContent>
            {newMilestone && (
              <div className="mb-4 flex gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <Input
                  placeholder="Title"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone((p) => (p ? { ...p, title: e.target.value } : null))}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={newMilestone.due_date}
                  onChange={(e) => setNewMilestone((p) => (p ? { ...p, due_date: e.target.value } : null))}
                  className="w-40"
                />
                <Button
                  size="sm"
                  onClick={() => addMilestoneMutation.mutate(newMilestone)}
                  disabled={!newMilestone.title.trim() || !newMilestone.due_date || addMilestoneMutation.isPending}
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setNewMilestone(null)}>
                  Cancel
                </Button>
              </div>
            )}
            {totalMilestones > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress</span>
                  <span>{completedMilestones} / {totalMilestones} completed</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
            {contract.milestones.length === 0 && (
              <p className="text-sm text-gray-500">No milestones yet.</p>
            )}
            {contract.milestones.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-600">
                      <th className="p-2">Title</th>
                      <th className="p-2">Due date</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Completion</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract.milestones.map((m) => (
                      <tr key={m.id} className={`border-b ${m.status === 'overdue' ? 'bg-red-50' : ''}`}>
                        <td className="p-2 font-medium">{m.title}</td>
                        <td className="p-2">{m.due_date}</td>
                        <td className="p-2">
                          <span className={`rounded px-2 py-0.5 text-xs ${milestoneStatusConfig[m.status] ?? ''}`}>
                            {m.status === 'overdue' && '⚠ '}{m.status}
                          </span>
                        </td>
                        <td className="p-2">{m.completion_date ?? '—'}</td>
                        <td className="p-2">
                          <MilestoneEditRow
                            milestone={m}
                            editing={editingMilestoneId === m.id}
                            onEdit={() => setEditingMilestoneId(m.id)}
                            onClose={() => setEditingMilestoneId(null)}
                            onSaved={() => {
                              queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
                              setEditingMilestoneId(null);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {contract.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded border border-gray-200 p-2">
                  <span className="text-sm">{d.original_name}</span>
                  <a
                    href={contractService.documentDownloadUrl(d.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
              >
                <option value="contract">Contract</option>
                <option value="amendment">Amendment</option>
                <option value="correspondence">Correspondence</option>
                <option value="other">Other</option>
              </select>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="max-w-xs"
              />
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={!uploadFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {ratingModalOpen && contract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRatingModalOpen(false)}>
          <Card className="w-full max-w-[500px] animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Rate {contract.company_name}</CardTitle>
                <p className="mt-1 text-sm font-mono text-gray-500">{contract.contract_number} · {contract.tender_title}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setRatingModalOpen(false)}>×</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'quality_score' as const, label: 'Quality of Work/Goods', tooltip: 'Were the goods/services delivered to the required standard?' },
                { key: 'delivery_score' as const, label: 'Delivery & Timeliness', tooltip: 'Was everything delivered on time and within the agreed schedule?' },
                { key: 'communication_score' as const, label: 'Communication & Responsiveness', tooltip: 'Was the supplier responsive and easy to work with?' },
                { key: 'compliance_score' as const, label: 'Contract Compliance', tooltip: 'Did the supplier follow all contractual terms and requirements?' },
              ].map(({ key, label, tooltip }) => (
                <div key={key}>
                  <Label className="flex items-center gap-2 text-sm" title={tooltip}>
                    {label}
                  </Label>
                  <StarRating
                    value={ratingForm[key] || 0}
                    onChange={(v) => setRatingForm((p) => ({ ...p, [key]: v }))}
                    size="md"
                    showValue={false}
                  />
                </div>
              ))}
              {overallLive && (
                <p className="text-sm font-medium text-gray-700">Overall: {overallLive} / 5</p>
              )}
              <div>
                <Label>Additional comments (optional)</Label>
                <textarea
                  value={ratingForm.comments}
                  onChange={(e) => setRatingForm((p) => ({ ...p, comments: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRatingModalOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => submitRatingMutation.mutate()}
                  disabled={
                    ratingForm.quality_score < 1 || ratingForm.delivery_score < 1 || ratingForm.communication_score < 1 || ratingForm.compliance_score < 1 || submitRatingMutation.isPending
                  }
                >
                  {submitRatingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MilestoneEditRow({
  milestone,
  editing,
  onEdit,
  onClose,
  onSaved,
}: {
  milestone: ContractMilestone;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(milestone.status);
  const [notes, setNotes] = useState(milestone.notes ?? '');
  const updateMutation = useMutation({
    mutationFn: () => contractService.milestoneUpdate({ id: milestone.id, status, notes }),
    onSuccess: () => {
      toastSuccess('Milestone updated');
      onSaved();
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  if (!editing) {
    return (
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <div className="flex gap-2">
      <select
        className="rounded border px-2 py-1 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
      >
        <option value="pending">Pending</option>
        <option value="in_progress">In progress</option>
        <option value="completed">Completed</option>
        <option value="overdue">Overdue</option>
      </select>
      <Input
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="max-w-[120px]"
      />
      <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
        Save
      </Button>
      <Button size="sm" variant="outline" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );
}
