import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractService } from '@/services/contractService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { ArrowLeft, Check, Clock, Download } from 'lucide-react';
import type { ContractStatus, MilestoneStatus } from '@/types';

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

export function SupplierContractDetail() {
  const { id } = useParams<{ id: string }>();
  const contractId = id ? parseInt(id, 10) : 0;
  const queryClient = useQueryClient();
  const [uploadType, setUploadType] = useState('correspondence');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => contractService.show(contractId),
    enabled: contractId > 0,
  });

  const signMutation = useMutation({
    mutationFn: () => contractService.sign(contractId, 'supplier'),
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

  if (isLoading || !contract) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const statusBadge = statusConfig[contract.status] ?? statusConfig.draft;
  const bothSigned = contract.signed_by_admin && contract.signed_by_supplier;
  const clauseItems = [
    { label: 'Contract Date', value: contract.contract_date || '—' },
    { label: 'Effective Date', value: contract.effective_date || '—' },
    { label: 'Buyer Name & Address', value: contract.buyer_name_address || '' },
    { label: 'Supplier Name & Address', value: contract.supplier_name_address || '' },
    { label: 'Specification of Goods/Services', value: contract.specification_of_goods || '' },
    { label: 'Payment Terms & Methods', value: contract.payment_terms_methods || '' },
    { label: 'Warranty Terms', value: contract.warranty_terms || '' },
    { label: 'Breach & Remedies', value: contract.breach_and_remedies || '' },
    { label: 'Delivery Terms', value: contract.delivery_terms || '' },
    { label: 'Price Terms', value: contract.price_terms || '' },
    { label: 'Price Adjustment Terms', value: contract.price_adjustment_terms || '' },
    { label: 'Termination Terms', value: contract.termination_terms || '' },
  ];
  const missingForSigning = [
    { label: 'Contract date', ok: !!contract.contract_date },
    { label: 'Effective date', ok: !!contract.effective_date },
    { label: 'Buyer name & address', ok: !!contract.buyer_name_address?.trim() },
    { label: 'Supplier name & address', ok: !!contract.supplier_name_address?.trim() },
    { label: 'Specification of goods/services', ok: !!contract.specification_of_goods?.trim() },
    { label: 'Payment terms & methods', ok: !!contract.payment_terms_methods?.trim() },
    { label: 'Delivery terms', ok: !!contract.delivery_terms?.trim() },
    { label: 'Price terms', ok: !!contract.price_terms?.trim() },
    { label: 'Termination terms', ok: !!contract.termination_terms?.trim() },
  ].filter((x) => !x.ok);

  return (
    <div className="p-6">
      <Link to="/supplier/contracts" className="mb-4 inline-flex items-center text-sm text-primary hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to My Contracts
      </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">{contract.title}</h1>
          <p className="font-mono text-sm text-gray-600">{contract.contract_number}</p>
          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </div>

        {bothSigned && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            <strong>Contract is fully executed and active.</strong> Both parties have signed.
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Value:</strong> {formatCurrency(contract.contract_value)}</p>
            <p><strong>Start:</strong> {contract.start_date} <strong>End:</strong> {contract.end_date}</p>
            <p><strong>Tender:</strong> {contract.tender_title}</p>
            <div className="mt-4 border-t pt-4">
              <p className="font-medium">Signatures</p>
              <div className="mt-2 flex gap-4">
                <div className="flex-1 rounded border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Admin</p>
                  {contract.signed_by_admin ? (
                    <p className="text-green-700"><Check className="inline h-4 w-4" /> Signed</p>
                  ) : (
                    <p className="text-gray-500"><Clock className="inline h-4 w-4" /> Awaiting</p>
                  )}
                </div>
                <div className="flex-1 rounded border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Supplier (You)</p>
                  {contract.signed_by_supplier ? (
                    <p className="text-green-700"><Check className="inline h-4 w-4" /> Signed</p>
                  ) : (
                    <p className="text-gray-500"><Clock className="inline h-4 w-4" /> Awaiting your signature</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!contract.signed_by_supplier && !['completed', 'terminated'].includes(contract.status) && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              {missingForSigning.length > 0 && (
                <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <strong>Cannot sign yet.</strong> Missing required contract sections:
                  <ul className="mt-2 list-disc pl-5">
                    {missingForSigning.map((m) => <li key={m.label}>{m.label}</li>)}
                  </ul>
                </div>
              )}
              <Button onClick={() => signMutation.mutate()} disabled={signMutation.isPending || missingForSigning.length > 0}>
                Sign Contract
              </Button>
            </CardContent>
          </Card>
        )}

        {contract.description && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{contract.description}</p>
            </CardContent>
          </Card>
        )}

        {clauseItems.some((c) => c.value && c.value !== '—') && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Contract Clauses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {clauseItems.filter((c) => c.value && c.value !== '—').map((c) => (
                <div key={c.label}>
                  <p className="text-xs font-semibold uppercase text-gray-500">{c.label}</p>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{c.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            {contract.milestones.length === 0 && <p className="text-sm text-gray-500">No milestones.</p>}
            <ul className="space-y-2">
              {contract.milestones.map((m) => (
                <li
                  key={m.id}
                  className={`flex justify-between rounded border p-2 text-sm ${m.status === 'overdue' ? 'border-red-200 bg-red-50' : ''}`}
                >
                  <span className="font-medium">{m.title}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${milestoneStatusConfig[m.status] ?? ''}`}>
                    {m.due_date} · {m.status}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
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
              <Label className="w-full text-xs text-gray-500">Upload correspondence (PDF, DOC, DOCX)</Label>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
              >
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
    </div>
  );
}
