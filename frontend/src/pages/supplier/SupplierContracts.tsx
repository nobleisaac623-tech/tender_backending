import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contractService } from '@/services/contractService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogOut, Search, FileText } from 'lucide-react';
import type { ContractListItem, ContractStatus } from '@/types';

const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-200 text-gray-800' },
  active: { label: 'Active', className: 'bg-green-200 text-green-800' },
  completed: { label: 'Completed', className: 'bg-blue-200 text-blue-800' },
  terminated: { label: 'Terminated', className: 'bg-red-200 text-red-800' },
  disputed: { label: 'Disputed', className: 'bg-amber-200 text-amber-800' },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(value);
}

export function SupplierContracts() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['supplier', 'contracts', search],
    queryFn: () => contractService.list({ search: search || undefined }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/supplier/dashboard" className="font-semibold text-primary">
              Supplier
            </Link>
            <nav className="flex gap-4">
              <Link to="/supplier/tenders" className="text-sm text-gray-600 hover:text-primary">
                Tenders
              </Link>
              <Link to="/supplier/contracts" className="text-sm font-medium text-primary">
                My Contracts
              </Link>
              <Link to="/supplier/performance" className="text-sm text-gray-600 hover:text-primary">
                Performance
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">My Contracts</h1>
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
          </div>
        )}

        {!isLoading && contracts.length > 0 && (
          <div className="mt-6 space-y-4">
            {contracts.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm text-gray-600">{c.contract_number}</p>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-sm text-gray-600">{c.tender_title}</p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(c.contract_value)} · {c.start_date} – {c.end_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
      </main>
    </div>
  );
}
