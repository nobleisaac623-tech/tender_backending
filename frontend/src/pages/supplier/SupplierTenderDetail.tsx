import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { bidsService } from '@/services/bids';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { CategoryBadge } from '@/components/tenders/CategoryBadge';
import { TagChip } from '@/components/tenders/TagChip';
import { ArrowLeft, FileText } from 'lucide-react';

export function SupplierTenderDetail() {
  const { id } = useParams<{ id: string }>();
  const tenderId = id ? parseInt(id, 10) : 0;
  const queryClient = useQueryClient();
  const [bidAmount, setBidAmount] = useState('');
  const [proposal, setProposal] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [currentBidId, setCurrentBidId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [removingDocId, setRemovingDocId] = useState<number | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);
  const [downloadingTenderDocId, setDownloadingTenderDocId] = useState<number | null>(null);

  const { data: tender, isLoading } = useQuery({
    queryKey: ['tender', tenderId],
    queryFn: () => tendersService.show(tenderId),
    enabled: tenderId > 0,
  });

  const { data: myBidsData } = useQuery({
    queryKey: ['my-bids-for-tender', tenderId],
    queryFn: () => bidsService.list({ tender_id: tenderId, per_page: 10 }),
    enabled: tenderId > 0,
    staleTime: 15000,
  });

  // Load existing bid (draft/submitted) into form when present
  useEffect(() => {
    const first = myBidsData?.items?.[0];
    if (!first) return;
    setCurrentBidId(first.id);
    setBidAmount(first.bid_amount != null ? String(first.bid_amount) : '');
    setProposal(first.technical_proposal ?? '');
    setDeliveryTime(first.delivery_time ?? '');
  }, [myBidsData]);

  const { data: currentBidDetails, isLoading: bidDetailsLoading } = useQuery({
    queryKey: ['bid', currentBidId],
    queryFn: () => bidsService.show(currentBidId as number),
    enabled: typeof currentBidId === 'number' && currentBidId > 0,
    staleTime: 0,
  });

  const submitMutation = useMutation({
    mutationFn: (shouldSubmit: boolean) =>
      bidsService.submit({
        tender_id: tenderId,
        bid_amount: bidAmount ? parseFloat(bidAmount) : undefined,
        technical_proposal: proposal || undefined,
        delivery_time: deliveryTime || undefined,
        submit: shouldSubmit,
      }),
    onSuccess: (res) => {
      if (res?.id) setCurrentBidId(res.id);
      toastSuccess(res?.status === 'submitted' ? 'Bid submitted' : 'Bid saved as draft');
      queryClient.invalidateQueries({ queryKey: ['tender', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['supplier', 'bids'] });
      queryClient.invalidateQueries({ queryKey: ['my-bids-for-tender', tenderId] });
      if (res?.id) queryClient.invalidateQueries({ queryKey: ['bid', res.id] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const ensureDraftBidId = async (): Promise<number> => {
    if (currentBidId) return currentBidId;
    const res = await bidsService.submit({
      tender_id: tenderId,
      bid_amount: bidAmount ? parseFloat(bidAmount) : undefined,
      technical_proposal: proposal || undefined,
      delivery_time: deliveryTime || undefined,
      submit: false,
    });
    if (!res?.id) throw new Error('Failed to create draft bid');
    setCurrentBidId(res.id);
    toastSuccess('Draft bid created');
    return res.id;
  };

  const uploadDocuments = async () => {
    if (!selectedFiles.length) return;
    try {
      setUploading(true);
      const bidId = await ensureDraftBidId();

      for (const file of selectedFiles) {
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

        await bidsService.addDocument({
          bid_id: bidId,
          filename: ref.filename,
          original_name: ref.original_name || file.name,
          file_size: ref.file_size,
          document_type: 'bid_attachment',
        });
      }

      setSelectedFiles([]);
      toastSuccess('Document(s) uploaded');
      queryClient.invalidateQueries({ queryKey: ['bid', bidId] });
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
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

  const removeDocument = async (docId: number) => {
    if (!currentBidId) return;
    try {
      setRemovingDocId(docId);
      await bidsService.removeDocument(docId);
      toastSuccess('Document removed');
      queryClient.invalidateQueries({ queryKey: ['bid', currentBidId] });
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Remove failed');
    } finally {
      setRemovingDocId(null);
    }
  };

  const handleSubmit = (shouldSubmit: boolean) => {
    submitMutation.mutate(shouldSubmit);
  };

  if (isLoading || !tender) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const deadline = new Date(tender.submission_deadline);
  const isPast = deadline.getTime() < Date.now();

  return (
    <div className="p-6">
      <Link to="/supplier/tenders" className="mb-4 inline-flex items-center text-sm text-primary hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Tenders
      </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{tender.title}</CardTitle>
            <p className="text-sm text-gray-600">{tender.reference_number}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {tender.category_name && (
                <CategoryBadge category_name={tender.category_name} category_color={tender.category_color} />
              )}
              {tender.tags && tender.tags.length > 0 && (
                <>
                  {tender.tags.map((tag) => (
                    <TagChip key={tag} tag={tag} />
                  ))}
                </>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{tender.description}</p>
            <p className="text-sm text-gray-500">Deadline: {tender.submission_deadline} {isPast && '(Closed)'}</p>
          </CardHeader>
          <CardContent>
            {tender.documents && tender.documents.length > 0 && (
              <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Official tender documents</h3>
                </div>
                <p className="mb-3 text-xs text-slate-600">
                  Download these files before preparing your bid. They are provided by procurement as part of this tender.
                </p>
                <ul className="space-y-2">
                  {tender.documents.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-slate-800">{d.original_name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={downloadingTenderDocId === d.id || uploading}
                        onClick={() => downloadTenderDocument(d.id, d.original_name)}
                      >
                        {downloadingTenderDocId === d.id ? 'Downloading…' : 'Download'}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tender.status !== 'published' || isPast ? (
              <p className="text-gray-600">This tender is not open for bids.</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(false);
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Bid amount (optional)</Label>
                  <Input type="number" step="0.01" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Delivery time (optional)</Label>
                  <Input
                    placeholder="e.g. 14 days, 3 weeks, 2 months"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Technical proposal (optional)</Label>
                  <textarea
                    value={proposal}
                    onChange={(e) => setProposal(e.target.value)}
                    rows={6}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="rounded-lg border border-dashed border-gray-300 p-4">
                  <Label>Upload documents (optional)</Label>
                  <p className="mt-1 text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (max 10MB each)</p>
                  <Input
                    className="mt-2"
                    type="file"
                    multiple
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 text-sm text-gray-700">
                      {selectedFiles.length} file(s) selected
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={uploadDocuments} disabled={uploading || selectedFiles.length === 0}>
                      {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                    {currentBidId && <span className="text-xs text-gray-500">Bid draft ID: {currentBidId}</span>}
                  </div>

                  {/* Attached documents list */}
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-900">Attached documents</p>
                    {bidDetailsLoading && currentBidId ? (
                      <p className="mt-1 text-xs text-gray-500">Loading documents...</p>
                    ) : (currentBidDetails as any)?.documents?.length ? (
                      <div className="mt-2 space-y-2">
                        {(currentBidDetails as any).documents.map((d: any) => (
                          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{d.original_name ?? d.filename ?? `Document #${d.id}`}</p>
                              <p className="text-xs text-gray-500">
                                {d.file_size ? `${Math.round(Number(d.file_size) / 1024)} KB` : '—'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={downloadingDocId === d.id || uploading}
                                onClick={() => downloadBidDocument(d.id, d.original_name ?? '')}
                              >
                                {downloadingDocId === d.id ? 'Downloading...' : 'Download'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={removingDocId === d.id || uploading || downloadingDocId === d.id}
                                onClick={() => removeDocument(d.id)}
                              >
                                {removingDocId === d.id ? 'Removing...' : 'Remove'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">No documents attached yet.</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => handleSubmit(false)} disabled={submitMutation.isPending || uploading}>
                    Save draft
                  </Button>
                  <Button type="button" onClick={() => handleSubmit(true)} disabled={submitMutation.isPending || uploading}>
                    {submitMutation.isPending ? 'Submitting...' : 'Submit bid'}
                  </Button>
                </div>
                {uploading && (
                  <p className="text-xs text-gray-500">Uploading documents… please wait before submitting.</p>
                )}
              </form>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
