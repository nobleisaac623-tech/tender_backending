import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blacklistService } from '@/services/blacklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { ShieldAlert } from 'lucide-react';
import type { BlacklistRecord } from '@/types';

function LiftModal({
  record,
  onClose,
  onSuccess,
}: {
  record: BlacklistRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [liftReason, setLiftReason] = useState('');
  const queryClient = useQueryClient();
  const liftMutation = useMutation({
    mutationFn: () => blacklistService.lift(record.id, liftReason),
    onSuccess: () => {
      toastSuccess('Blacklist lifted successfully');
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      onSuccess();
      onClose();
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed to lift'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lift Blacklist</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{record.supplier_name}</strong> — Original reason: {record.reason}
          </p>
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
            <Button variant="outline" onClick={onClose}>Cancel</Button>
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
  );
}

export function AdminBlacklist() {
  const [activeOnly, setActiveOnly] = useState(true);
  const [liftRecord, setLiftRecord] = useState<BlacklistRecord | null>(null);
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['blacklist', activeOnly],
    queryFn: () => blacklistService.getList(activeOnly),
  });

  return (
    <div>
        <h1 className="text-2xl font-bold">Supplier Blacklist</h1>
        <div className="mt-4 flex gap-2">
          <Button
            variant={activeOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveOnly(true)}
          >
            Active Blacklists
          </Button>
          <Button
            variant={!activeOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveOnly(false)}
          >
            All Records
          </Button>
        </div>
        {isLoading && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {!isLoading && (!items || items.length === 0) && (
          <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white/50 py-16">
            <ShieldAlert className="h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">No blacklisted suppliers</p>
          </div>
        )}
        {!isLoading && items && items.length > 0 && (
          <Card className="mt-6 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 font-medium text-gray-700">Supplier</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Email</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Reason</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Blacklisted by</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Date</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r: BlacklistRecord) => (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td className="px-4 py-3">{r.supplier_name}</td>
                        <td className="px-4 py-3 text-gray-600">{r.supplier_email}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-gray-600" title={r.reason}>{r.reason}</td>
                        <td className="px-4 py-3 text-gray-600">{r.blacklisted_by_name}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(r.blacklisted_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {r.is_active ? (
                            <Badge variant="destructive">Blacklisted</Badge>
                          ) : (
                            <Badge variant="success">Lifted</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.is_active && (
                            <Button variant="outline" size="sm" onClick={() => setLiftRecord(r)}>
                              Lift Blacklist
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      {liftRecord && (
        <LiftModal
          record={liftRecord}
          onClose={() => setLiftRecord(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['blacklist'] })}
        />
      )}
    </div>
  );
}
