import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';

export function EvaluatorTenders() {
  const { user, logout } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['evaluator', 'tenders'],
    queryFn: () => tendersService.list({ per_page: 20 }),
  });

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
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">Assigned Tenders</h1>
        {isLoading && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {data?.items && (
          <div className="mt-6 space-y-4">
            {data.items.map((t) => (
              <Card key={t.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">
                    <Link to={`/evaluator/tenders/${t.id}/bids`} className="hover:underline">{t.title}</Link>
                  </CardTitle>
                  <Badge>{t.status}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{t.reference_number}</p>
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
