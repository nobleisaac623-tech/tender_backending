import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastError } from '@/hooks/useToast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'evaluator':
      return '/evaluator/dashboard';
    case 'supplier':
      return '/supplier/dashboard';
    default:
      return '/';
  }
}

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      navigate(from ?? getDashboardPath(user.role), { replace: true });
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="email">
                Email <span aria-hidden="true" className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
                className="mt-1"
              />
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
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
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
                className="mt-1"
              />
              {errors.password && (
                <p id="password-error" role="alert" className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Register as supplier
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
