import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastError } from '@/hooks/useToast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!email.trim()) { toastError('Email is required'); return; }
    if (!password) { toastError('Password is required'); return; }

    try {
      setIsLoading(true);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }
      console.log('Login response:', data);

      if (res.ok && data.success && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect based on role
        const role = data.user?.role;
        if (role === 'admin') navigate('/admin/dashboard');
        else if (role === 'supplier') navigate('/supplier/dashboard');
        else navigate('/dashboard');
      } else {
        // Handle supplier account status flows
        const code = data.error_code as string | undefined;
        const details = data.details ?? {};

        if (code === 'ACCOUNT_PENDING') {
          sessionStorage.setItem('account_status', JSON.stringify({ ...details, email }));
          navigate('/account-pending');
          return;
        }
        if (code === 'ACCOUNT_REJECTED') {
          sessionStorage.setItem('account_status', JSON.stringify({ ...details, email }));
          navigate('/account-rejected');
          return;
        }
        if (code === 'ACCOUNT_SUSPENDED') {
          sessionStorage.setItem('account_status', JSON.stringify({ ...details, email }));
          navigate('/account-suspended');
          return;
        }
        if (code === 'ACCOUNT_BLACKLISTED') {
          sessionStorage.setItem('account_status', JSON.stringify({ ...details, email }));
          navigate('/account-blacklisted');
          return;
        }

        toastError(data.message ?? 'Invalid email or password');
      }

    } catch (err) {
      console.error('Login error:', err);
      toastError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="absolute left-4 top-4">
        <Link to="/" className="text-sm font-medium text-primary hover:underline">← Back to home</Link>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">
                Email <span aria-hidden="true" className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-required="true"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">
                Password <span aria-hidden="true" className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-required="true"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Register as supplier
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
