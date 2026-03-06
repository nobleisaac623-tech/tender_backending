import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';

export function AdminEvaluators() {
  const { user, logout } = useAuth();

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
        <h1 className="text-2xl font-bold">Evaluators</h1>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Manage evaluator accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Evaluators are managed as users with role &quot;evaluator&quot;. Assign them to tenders from the tender detail page.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
