import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bidsService } from '@/services/bids';
import { tendersService } from '@/services/tenders';
import { evaluationsService } from '@/services/evaluations';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { LogOut, ArrowLeft } from 'lucide-react';

export function EvaluatorBidEvaluate() {
  const { id } = useParams<{ id: string }>();
  const bidId = id ? parseInt(id, 10) : 0;
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<number, { score: number; comment: string }>>({});

  const { data: bid, isLoading: bidLoading } = useQuery({
    queryKey: ['bid', bidId],
    queryFn: () => bidsService.show(bidId),
    enabled: bidId > 0,
  });

  const tenderId = (bid as { tender_id?: number })?.tender_id;
  const { data: tender } = useQuery({
    queryKey: ['tender', tenderId],
    queryFn: () => tendersService.show(tenderId!),
    enabled: (tenderId ?? 0) > 0,
  });

  const scoreMutation = useMutation({
    mutationFn: (payload: Array<{ criteria_id: number; score: number; comment?: string }>) =>
      evaluationsService.score(bidId, payload),
    onSuccess: () => {
      toastSuccess('Scores saved');
      queryClient.invalidateQueries({ queryKey: ['bid', bidId] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const criteriaList = (tender?.criteria ?? []) as Array<{ id: number; name: string; max_score: number }>;
  const isLoading = bidLoading || !bid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = criteriaList.map((c) => ({
      criteria_id: c.id,
      score: scores[c.id]?.score ?? 0,
      comment: scores[c.id]?.comment,
    }));
    scoreMutation.mutate(payload);
  };

  if (isLoading || !bid) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const list = criteriaList.length ? criteriaList : [{ id: 0, name: 'Overall score', max_score: 100 }];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/evaluator/dashboard" className="font-semibold text-primary">Evaluator</Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to={`/evaluator/tenders/${(bid as { tender_id: number }).tender_id}/bids`} className="mb-4 inline-flex items-center text-sm text-primary hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Bids
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Evaluate Bid #{bid.id}</CardTitle>
            <p className="text-sm text-gray-600">Amount: {bid.bid_amount != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(bid.bid_amount) : '—'}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {list.map((c) => (
                <div key={c.id} className="rounded border border-gray-200 p-4">
                  <Label>{c.name} (0–{c.max_score})</Label>
                  <Input
                    type="number"
                    min={0}
                    max={c.max_score}
                    value={scores[c.id]?.score ?? ''}
                    onChange={(e) => setScores((prev) => ({ ...prev, [c.id]: { ...prev[c.id], score: Number(e.target.value) || 0 } }))}
                    className="mt-1 w-24"
                  />
                  <Label className="mt-2 block">Comment (optional)</Label>
                  <textarea
                    rows={2}
                    value={scores[c.id]?.comment ?? ''}
                    onChange={(e) => setScores((prev) => ({ ...prev, [c.id]: { ...prev[c.id], comment: e.target.value } }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ))}
              <Button type="submit" disabled={scoreMutation.isPending}>
                {scoreMutation.isPending ? 'Saving...' : 'Save Scores'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
