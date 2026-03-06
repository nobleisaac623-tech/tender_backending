import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersService } from '@/services/suppliers';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { LogOut } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  company_name: z.string().min(1, 'Company name is required'),
  registration_number: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  category: z.string().optional(),
  tax_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function SupplierProfile() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', 'profile'],
    queryFn: () => suppliersService.show(),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: supplier
      ? {
          name: supplier.name,
          company_name: (supplier.profile ?? supplier.supplier_profile)?.company_name ?? '',
          registration_number: (supplier.profile ?? supplier.supplier_profile)?.registration_number ?? '',
          address: (supplier.profile ?? supplier.supplier_profile)?.address ?? '',
          phone: (supplier.profile ?? supplier.supplier_profile)?.phone ?? '',
          website: (supplier.profile ?? supplier.supplier_profile)?.website ?? '',
          category: (supplier.profile ?? supplier.supplier_profile)?.category ?? '',
          tax_id: (supplier.profile ?? supplier.supplier_profile)?.tax_id ?? '',
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => suppliersService.update(data),
    onSuccess: () => {
      toastSuccess('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['supplier', 'profile'] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/supplier/dashboard" className="font-semibold text-primary">Supplier</Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Company Profile</h1>
        {isLoading && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {supplier && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Edit profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
                <div>
                  <Label>Contact name</Label>
                  <Input {...register('name')} className="mt-1" />
                  {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                </div>
                <div>
                  <Label>Company name</Label>
                  <Input {...register('company_name')} className="mt-1" />
                  {errors.company_name && <p className="text-sm text-red-600">{errors.company_name.message}</p>}
                </div>
                <div>
                  <Label>Registration number</Label>
                  <Input {...register('registration_number')} className="mt-1" />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input {...register('address')} className="mt-1" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input {...register('phone')} className="mt-1" />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input {...register('website')} className="mt-1" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input {...register('category')} className="mt-1" />
                </div>
                <div>
                  <Label>Tax ID</Label>
                  <Input {...register('tax_id')} className="mt-1" />
                </div>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
