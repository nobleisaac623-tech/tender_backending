import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contractService } from '@/services/contractService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText } from 'lucide-react';
import type { ContractStatus } from '@/types';

const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-200 text-gray-800' },
  active: { label: 'Active', className: 'bg-green-200 text-green-800' },
  completed: { label: 'Completed', className: 'bg-blue-200 text-blue-800' },
  terminated: { label: 'Terminated', className: 'bg-red-200 text-red-800' },
  disputed: { label: 'Disputed', className: 'bg-amber-200 text-amber-800' },
};

function StatusBadge({ status }: { status: ContractStatus }) {
  const c = statusConfig[status] ?? statusConfig.draft;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}>{c.label}</span>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(value);
}

export function AdminContracts() {
  const [statusTab, setStatusTab] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['admin', 'contracts', statusTab, search],
    queryFn: () =>
      contractService.list({
        status: statusTab || undefined,
        search: search || undefined,
      }),
  });

  return (
    <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Contracts</h1>
          <Link to="/admin/contracts/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Contract
            </Button>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {(['', 'draft', 'active', 'completed', 'terminated', 'disputed'] as const).map((s) => (
              <Button
                key={s}
                variant={statusTab === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusTab(s)}
              >
                {s === '' ? 'All' : statusConfig[s]?.label ?? s}
              </Button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by contract no. or supplier..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && contracts.length === 0 && (
          <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white/50 py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">No contracts match your filters.</p>
            <Link to="/admin/contracts/create" className="mt-2 inline-block">
              <Button variant="outline" size="sm">
                Create a contract
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && contracts.length > 0 && (
          <Card className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-sm text-gray-600">
                    <th className="p-3 font-medium">Contract No.</th>
                    <th className="p-3 font-medium">Tender</th>
                    <th className="p-3 font-medium">Supplier</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 font-medium">Start</th>
                    <th className="p-3 font-medium">End</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-3 font-mono text-sm">{c.contract_number}</td>
                      <td className="p-3 text-sm">{c.tender_title}</td>
                      <td className="p-3 text-sm">{c.company_name || c.supplier_name}</td>
                      <td className="p-3 text-sm">{formatCurrency(c.contract_value)}</td>
                      <td className="p-3 text-sm">{c.start_date}</td>
                      <td className="p-3 text-sm">{c.end_date}</td>
                      <td className="p-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="p-3">
                        <Link to={`/admin/contracts/${c.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
    </div>
  );
}
