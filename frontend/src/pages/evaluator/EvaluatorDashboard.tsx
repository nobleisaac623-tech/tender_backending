import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';

export function EvaluatorDashboard() {
  const { user, logout } = useAuth();
  const { data: tendersData, isLoading } = useQuery({
    queryKey: ['evaluator', 'tenders'],
    queryFn: () => tendersService.list({ per_page: 50 }),
  });

  const assigned = tendersData?.items ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl flex-wrap items-center justify-between gap-2 px-4">
          <Link to="/evaluator/dashboard" className="font-semibold text-primary">Evaluator</Link>
          <nav className="flex gap-4">
            <Link to="/evaluator/tenders" className="text-sm text-gray-600 hover:text-primary">My Tenders</Link>
          </nav>
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-gray-600">Tenders assigned to you for evaluation.</p>
        {isLoading && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {!isLoading && assigned.length === 0 && (
          <p className="mt-8 text-gray-500">No tenders assigned to you yet.</p>
        )}
        {!isLoading && assigned.length > 0 && (
        <div className="mt-8 space-y-4">
          {assigned.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">
                  <Link to={`/evaluator/tenders/${t.id}/bids`} className="hover:underline">{t.title}</Link>
                </CardTitle>
                <Badge>{t.status}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{t.reference_number} · Deadline: {t.submission_deadline}</p>
                <Link to={`/evaluator/tenders/${t.id}/bids`}>
                  <Button variant="outline" size="sm" className="mt-2">View Bids</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </main>
    </div>
  );
}
