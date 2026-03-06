import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';

export function AdminAuditLog() {
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
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>System audit trail</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Audit log is recorded in the database. A dedicated API endpoint can be added to list and filter audit entries.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
