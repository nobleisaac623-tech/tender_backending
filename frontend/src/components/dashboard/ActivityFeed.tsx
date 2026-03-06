import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { timeAgo } from '@/utils/timeAgo';
import type { RecentActivityItem } from '@/services/analytics';

const actionColors: Record<string, string> = {
  supplier_registered: '#10b981',
  tender_published: '#3b82f6',
  bid_submitted: '#f59e0b',
  supplier_blacklisted: '#ef4444',
  supplier_approved: '#10b981',
  evaluation_finalized: '#8b5cf6',
  tender_awarded: '#f59e0b',
  contract_created: '#06b6d4',
  login: '#64748b',
  tender_created: '#3b82f6',
  tender_updated: '#3b82f6',
  contract_signed: '#06b6d4',
  supplier_rated: '#8b5cf6',
  register: '#10b981',
};

function getActivityDescription(item: RecentActivityItem): string {
  const name = item.user_name ?? 'Someone';
  const action = item.action;
  if (action === 'login') return `${name} signed in`;
  if (action === 'supplier_registered' || action === 'register') return `${name} registered as a supplier`;
  if (action === 'tender_published') return `${item.details ?? 'A tender'} was published`;
  if (action === 'tender_created') return `${item.details ?? 'A tender'} was created`;
  if (action === 'bid_submitted') return `New bid submitted on ${item.details ?? 'a tender'}`;
  if (action === 'supplier_blacklisted') return `${item.details ?? 'A supplier'} was suspended`;
  if (action === 'supplier_approved') return `${item.details ?? 'A supplier'} was approved`;
  if (action === 'evaluation_finalized') return `Evaluation finalized for ${item.details ?? 'a tender'}`;
  if (action === 'tender_awarded') return `Tender awarded: ${item.details ?? '—'}`;
  if (action === 'contract_created') return `Contract created: ${item.details ?? '—'}`;
  if (action === 'contract_signed') return `Contract signed: ${item.details ?? '—'}`;
  return item.details ?? action.replace(/_/g, ' ');
}

interface ActivityFeedProps {
  items: RecentActivityItem[] | undefined;
  isLoading?: boolean;
}

export function ActivityFeed({ items, isLoading }: ActivityFeedProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">Recent Activity</h3>
        <Link
          to="/admin/audit-log"
          className="text-sm font-medium text-primary hover:underline"
        >
          View All →
        </Link>
      </div>
      <div
        className="max-h-[400px] overflow-y-auto pr-1"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9',
        }}
      >
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-500">
            Loading…
          </div>
        ) : !items?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-12 w-12 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No recent activity yet</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item, i) => {
              const color = actionColors[item.action] ?? '#64748b';
              return (
                <li key={`${item.created_at}-${i}`} className="flex gap-3 text-sm">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-800">{getActivityDescription(item)}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{timeAgo(item.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
