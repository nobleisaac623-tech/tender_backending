import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    company_name: z.string().min(1, 'Company name is required'),
    registration_number: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    category: z.string().optional(),
    tax_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      company_name: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await registerUser(data);
      toastSuccess('Registration successful. Your account is pending approval.');
      navigate('/login');
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link to="/" className="mb-4 inline-block text-sm font-medium text-primary hover:underline">← Back to home</Link>
        <Card>
          <CardHeader>
            <CardTitle>Register as Supplier</CardTitle>
            <CardDescription>Create your supplier account. Approval is required before you can bid.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-700">Your details</p>
                <div>
                  <Label htmlFor="name">
                    Contact name <span aria-hidden="true" className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    aria-required="true"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                    {...register('name')}
                    className="mt-1"
                  />
                  {errors.name && <p id="name-error" role="alert" className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                </div>
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
                    aria-describedby={errors.email ? 'reg-email-error' : undefined}
                    {...register('email')}
                    className="mt-1"
                  />
                  {errors.email && <p id="reg-email-error" role="alert" className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="password">
                    Password <span aria-hidden="true" className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'reg-password-error' : 'reg-password-hint'}
                    {...register('password')}
                    className="mt-1"
                  />
                  <p id="reg-password-hint" className="mt-1 text-xs text-gray-400">Minimum 8 characters</p>
                  {errors.password && <p id="reg-password-error" role="alert" className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-700">Company</p>
                <div>
                  <Label htmlFor="company_name">
                    Company name <span aria-hidden="true" className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company_name"
                    autoComplete="organization"
                    aria-required="true"
                    aria-invalid={!!errors.company_name}
                    aria-describedby={errors.company_name ? 'company-name-error' : undefined}
                    {...register('company_name')}
                    className="mt-1"
                  />
                  {errors.company_name && <p id="company-name-error" role="alert" className="mt-1 text-sm text-red-600">{errors.company_name.message}</p>}
                </div>
              </div>

              <fieldset className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <legend className="px-1 text-sm font-medium text-gray-600">Optional company details</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="registration_number">Registration number</Label>
                    <Input id="registration_number" {...register('registration_number')} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...register('phone')} className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" {...register('address')} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" type="url" {...register('website')} className="mt-1" placeholder="https://" />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" {...register('category')} className="mt-1" placeholder="e.g. Office supplies" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="tax_id">Tax ID</Label>
                    <Input id="tax_id" {...register('tax_id')} className="mt-1" />
                  </div>
                </div>
              </fieldset>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
