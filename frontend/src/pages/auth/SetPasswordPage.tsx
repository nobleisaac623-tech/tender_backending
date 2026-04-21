import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '@/services/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastSuccess, toastError } from '@/hooks/useToast';

export function SetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = useMemo(() => (params.get('token') ?? '').trim(), [params]);
  const email = useMemo(() => (params.get('email') ?? '').trim(), [params]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toastError('Missing token. Please use the link from your email.');
      return;
    }
    if (password.length < 8) {
      toastError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toastError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await authService.setPassword({ token, password });
      toastSuccess('Password set. Please wait for admin approval, then login.');
      navigate('/login');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-[520px]">
        <div className="mb-4">
          <Link to="/" className="text-sm font-medium text-primary hover:underline">
            ← Back to home
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Set your password</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {email ? (
                <>
                  Setting password for <span className="font-medium">{email}</span>.
                </>
              ) : (
                <>Use the invite link sent to your email.</>
              )}
            </p>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-type your password"
                  required
                  minLength={8}
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Saving...' : 'Set Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

