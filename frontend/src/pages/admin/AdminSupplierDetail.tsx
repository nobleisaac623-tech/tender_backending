import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/types';
import { suppliersService } from '@/services/suppliers';
import { ratingService } from '@/services/ratingService';
import { blacklistService } from '@/services/blacklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { LogOut, ArrowLeft } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { RatingBreakdown } from '@/components/ratings/RatingBreakdown';

export function AdminSupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const supplierId = id ? parseInt(id, 10) : 0;
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [liftModalOpen, setLiftModalOpen] = useState(false);
  const [liftReason, setLiftReason] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'performance'>('profile');

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => suppliersService.show(supplierId),
    enabled: supplierId > 0,
  });

  const { data: blacklistCheck } = useQuery({
    queryKey: ['blacklist-check', supplierId],
    queryFn: () => blacklistService.check(supplierId),
    enabled: supplierId > 0 && !!supplier,
  });

  const { data: ratingsData } = useQuery({
    queryKey: ['ratings', supplierId],
    queryFn: () => ratingService.list(supplierId),
    enabled: supplierId > 0,
  });

  const isBlacklisted = blacklistCheck?.blacklisted ?? false;
  const blacklistId = blacklistCheck?.blacklist_id;
  const blacklistReasonDisplay = blacklistCheck?.reason;

  const approveMutation = useMutation({
    mutationFn: () => suppliersService.approve(supplierId, 'approve'),
    onSuccess: () => {
      toastSuccess('Supplier approved');
      queryClient.invalidateQueries({ queryKey: ['supplier', supplierId] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const suspendMutation = useMutation({
    mutationFn: () => suppliersService.approve(supplierId, 'suspend'),
    onSuccess: () => {
      toastSuccess('Supplier suspended');
      queryClient.invalidateQueries({ queryKey: ['supplier', supplierId] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const blacklistMutation = useMutation({
    mutationFn: () => blacklistService.add(supplierId, blacklistReason),
    onSuccess: () => {
      toastSuccess('Supplier blacklisted');
      queryClient.invalidateQueries({ queryKey: ['supplier', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['blacklist-check', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      setBlacklistModalOpen(false);
      setBlacklistReason('');
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const liftMutation = useMutation({
    mutationFn: () => blacklistService.lift(blacklistId!, liftReason),
    onSuccess: () => {
      toastSuccess('Blacklist lifted successfully');
      queryClient.invalidateQueries({ queryKey: ['supplier', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['blacklist-check', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      setLiftModalOpen(false);
      setLiftReason('');
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  if (isLoading || !supplier) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const profile = (supplier as User).profile ?? (supplier as User).supplier_profile;
  const ratingSummary = (supplier as User & { rating_summary?: { average_overall: number | null; total_contracts_rated: number } }).rating_summary;

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
        <Link to="/admin/suppliers" className="mb-4 inline-flex items-center text-sm text-primary hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Suppliers
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">{supplier.name}</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {ratingSummary && ratingSummary.total_contracts_rated > 0 ? (
                  <span className="inline-flex items-center gap-1 text-sm text-amber-700">
                    <StarRating value={ratingSummary.average_overall ?? 0} size="sm" showValue={true} />
                    <span className="text-gray-500">({ratingSummary.total_contracts_rated} ratings)</span>
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">No ratings yet</span>
                )}
                <Badge>{supplier.status}</Badge>
                {isBlacklisted && (
                  <Badge variant="destructive">Blacklisted</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600">{supplier.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isBlacklisted && (
                <Button variant="destructive" onClick={() => setBlacklistModalOpen(true)}>
                  Blacklist Supplier
                </Button>
              )}
              {isBlacklisted && (
                <Button variant="outline" className="border-amber-600 text-amber-700 hover:bg-amber-50" onClick={() => setLiftModalOpen(true)}>
                  Lift Blacklist
                </Button>
              )}
              {supplier.status === 'pending' && (
                <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>Approve</Button>
              )}
              {supplier.status === 'active' && (
                <Button variant="destructive" onClick={() => suspendMutation.mutate()} disabled={suspendMutation.isPending}>Suspend</Button>
              )}
            </div>
          </CardHeader>
          <div className="flex border-b border-gray-200 px-4">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'profile' ? 'border-b-2 border-primary text-primary' : 'text-gray-600 hover:text-gray-900'}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'performance' ? 'border-b-2 border-primary text-primary' : 'text-gray-600 hover:text-gray-900'}`}
              onClick={() => setActiveTab('performance')}
            >
              Performance
            </button>
          </div>
          <CardContent>
            {activeTab === 'profile' && (
            <>
              {profile && (
                <div className="mt-4 space-y-2 text-sm">
                  <p><strong>Company:</strong> {(profile as { company_name?: string }).company_name}</p>
                  <p><strong>Registration:</strong> {(profile as { registration_number?: string }).registration_number ?? '—'}</p>
                  <p><strong>Address:</strong> {(profile as { address?: string }).address ?? '—'}</p>
                  <p><strong>Phone:</strong> {(profile as { phone?: string }).phone ?? '—'}</p>
                </div>
              )}
            </>
            )}

            {activeTab === 'performance' && (
              <div className="mt-4 space-y-6">
                {ratingsData?.aggregate ? (
                  <>
                    <RatingBreakdown aggregate={ratingsData.aggregate} showOverall={true} />
                    <p className="text-sm text-gray-600">Total Contracts Rated: {ratingsData.aggregate.total_ratings}</p>
                    {ratingsData.ratings.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-gray-600">
                              <th className="p-2">Contract No.</th>
                              <th className="p-2">Tender</th>
                              <th className="p-2">Overall</th>
                              <th className="p-2">Date</th>
                              <th className="p-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {ratingsData.ratings.map((r) => (
                              <tr key={r.id} className="border-b">
                                <td className="p-2 font-mono">{r.contract_number}</td>
                                <td className="p-2">{r.tender_title}</td>
                                <td className="p-2">
                                  <StarRating value={r.overall_score} size="sm" showValue={true} />
                                </td>
                                <td className="p-2">{new Date(r.rated_at).toLocaleDateString()}</td>
                                <td className="p-2">
                                  <Link to={`/admin/contracts/${r.contract_id}`}>
                                    <Button variant="ghost" size="sm">View</Button>
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No performance ratings yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {blacklistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setBlacklistModalOpen(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Blacklist Supplier — {supplier.name}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setBlacklistModalOpen(false)}>×</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-700">
                This will immediately suspend their account and prevent them from logging in or submitting bids.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason for blacklisting (required, min 10 characters)</label>
                <textarea
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Fraudulent documents submitted"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBlacklistModalOpen(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => blacklistMutation.mutate()}
                  disabled={blacklistReason.trim().length < 10 || blacklistMutation.isPending}
                >
                  {blacklistMutation.isPending ? 'Blacklisting...' : 'Confirm Blacklist'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {liftModalOpen && blacklistId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setLiftModalOpen(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lift Blacklist — {supplier.name}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLiftModalOpen(false)}>×</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">Original reason: {blacklistReasonDisplay}</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason for lifting (required)</label>
                <textarea
                  value={liftReason}
                  onChange={(e) => setLiftReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Issue resolved after review"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setLiftModalOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => liftMutation.mutate()}
                  disabled={liftReason.trim().length < 5 || liftMutation.isPending}
                >
                  {liftMutation.isPending ? 'Lifting...' : 'Confirm Lift'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
