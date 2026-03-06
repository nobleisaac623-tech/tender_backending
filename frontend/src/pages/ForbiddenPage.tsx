import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Shown when the user is logged in but doesn't have permission for the route (wrong role).
 */
export function ForbiddenPage() {
  const { user } = useAuth();

  const dashboardPath = (() => {
    if (!user) return { path: '/', label: 'Home' };
    if (user.role === 'admin') return { path: '/admin/dashboard', label: 'Admin dashboard' };
    if (user.role === 'evaluator') return { path: '/evaluator/dashboard', label: 'Evaluator dashboard' };
    if (user.role === 'supplier') return { path: '/supplier/dashboard', label: 'Supplier dashboard' };
    return { path: '/', label: 'Home' };
  })();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-amber-600" />
            <CardTitle>Access denied</CardTitle>
          </div>
          <CardDescription>
            You don&apos;t have permission to view this page. If you believe this is an error, contact your administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link to={dashboardPath.path}>
            <Button className="w-full">Go to {dashboardPath.label}</Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="w-full">Back to home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
