import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { bidsService } from '@/services/bids';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { CategoryBadge } from '@/components/tenders/CategoryBadge';
import { TagChip } from '@/components/tenders/TagChip';
import { LogOut, ArrowLeft } from 'lucide-react';

export function SupplierTenderDetail() {
  const { id } = useParams<{ id: string }>();
  const tenderId = id ? parseInt(id, 10) : 0;
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [bidAmount, setBidAmount] = useState('');
  const [proposal, setProposal] = useState('');
  const [submit, setSubmit] = useState(false);

  const { data: tender, isLoading } = useQuery({
    queryKey: ['tender', tenderId],
    queryFn: () => tendersService.show(tenderId),
    enabled: tenderId > 0,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      bidsService.submit({
        tender_id: tenderId,
        bid_amount: bidAmount ? parseFloat(bidAmount) : undefined,
        technical_proposal: proposal || undefined,
        submit,
      }),
    onSuccess: () => {
      toastSuccess(submit ? 'Bid submitted' : 'Bid saved as draft');
      queryClient.invalidateQueries({ queryKey: ['tender', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['supplier', 'bids'] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate();
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/supplier/dashboard" className="font-semibold text-primary">Supplier</Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
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
            {tender.status !== 'published' || isPast ? (
              <p className="text-gray-600">This tender is not open for bids.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Bid amount (optional)</Label>
                  <Input type="number" step="0.01" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="mt-1" />
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
                <div className="flex gap-2">
                  <Button type="submit" onClick={() => setSubmit(false)} disabled={submitMutation.isPending}>
                    Save draft
                  </Button>
                  <Button type="submit" onClick={() => setSubmit(true)} disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? 'Submitting...' : 'Submit bid'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
