import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notificationsService } from '@/services/notifications';
import { cn } from '@/utils/cn';
import { playNotificationSound } from '@/utils/notificationSound';

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.list({ per_page: 1, unread_only: true }),
    refetchInterval: 60_000, // auto-refresh every 60 seconds
    staleTime: 55_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'dropdown'],
    queryFn: () => notificationsService.list({ per_page: 10 }),
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: (ids: number[]) => notificationsService.markReadMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const unreadTotal = countData?.total ?? 0;
  const prevUnreadRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevUnreadRef.current === null) {
      prevUnreadRef.current = unreadTotal;
      return;
    }
    if (unreadTotal > prevUnreadRef.current) {
      playNotificationSound();
    }
    prevUnreadRef.current = unreadTotal;
  }, [unreadTotal]);

  const items = data?.items ?? [];
  const unreadCount = open ? items.filter((n) => !n.is_read).length : unreadTotal;

  const handleMarkAllRead = () => {
    const ids = items.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length) markReadMutation.mutate(ids);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg',
            'max-h-[min(24rem,70vh)] flex flex-col'
          )}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-sm font-medium text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleMarkAllRead}
                disabled={markReadMutation.isPending}
              >
                Mark all read
              </Button>
            )}
          </div>
          <div className="overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {!isLoading && items.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">No notifications</p>
            )}
            {!isLoading &&
              items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'border-b border-gray-50 px-3 py-2.5 text-left last:border-b-0',
                    !n.is_read && 'bg-primary/5'
                  )}
                >
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(n.created_at)}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(s);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 60_000) return 'Just now';
  if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86400_000) return `${Math.floor(diffMs / 3600_000)}h ago`;
  return d.toLocaleDateString();
}
