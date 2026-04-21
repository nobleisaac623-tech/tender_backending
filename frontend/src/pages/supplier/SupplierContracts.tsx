import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contractService } from '@/services/contractService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, FileText } from 'lucide-react';
import type { ContractStatus } from '@/types';

const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-200 text-gray-800' },
  active: { label: 'Active', className: 'bg-green-200 text-green-800' },
  completed: { label: 'Completed', className: 'bg-blue-200 text-blue-800' },
  terminated: { label: 'Terminated', className: 'bg-red-200 text-red-800' },
  disputed: { label: 'Disputed', className: 'bg-amber-200 text-amber-800' },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

export function SupplierContracts() {
  const [search, setSearch] = useState('');

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['supplier', 'contracts', search],
    queryFn: () => contractService.list({ search: search || undefined }),
  });

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Contracts</h1>
        <div className="mt-4 flex gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search..."
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
            <p className="mt-2 text-gray-500">You have no contracts yet.</p>
            <p className="mt-1 text-xs text-gray-400">
              Once a tender is awarded to you, it will appear here for review and signing.
            </p>
          </div>
        )}

        {!isLoading && contracts.length > 0 && (
          <div className="mt-6 space-y-4">
            {contracts.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-gray-600">{c.contract_number}</p>
                    <p className="font-medium truncate">{c.title}</p>
                    <p className="text-sm text-gray-600 truncate">{c.tender_title}</p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(c.contract_value)} · {c.start_date} – {c.end_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[c.status]?.className ?? 'bg-gray-200'}`}>
                      {statusConfig[c.status]?.label ?? c.status}
                    </span>
                    <Link to={`/supplier/contracts/${c.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
