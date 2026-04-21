import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractService } from '@/services/contractService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const schema = z
  .object({
    tender_id: z.number().min(1, 'Select a tender'),
    supplier_id: z.number().min(1),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    contract_value: z.number().min(0.01, 'Value must be positive'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
  })
  .refine((d) => !d.start_date || !d.end_date || new Date(d.end_date) > new Date(d.start_date), {
    message: 'End date must be after start date',
    path: ['end_date'],
  });

type FormData = z.infer<typeof schema>;

export function AdminContractCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [milestones, setMilestones] = useState<Array<{ title: string; due_date: string }>>([]);

  const { data: awardedTenders = [] } = useQuery({
    queryKey: ['awarded-tenders-for-contract'],
    queryFn: () => contractService.getAwardedTendersForContract(),
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tender_id: 0, supplier_id: 0, contract_value: 0, title: '', description: '', start_date: '', end_date: '' },
  });

  const selectedTenderId = watch('tender_id');
  const selectedTender = awardedTenders.find((t) => t.tender_id === selectedTenderId);

  useEffect(() => {
    if (selectedTender) {
      setValue('supplier_id', selectedTender.supplier_id);
    } else if (selectedTenderId === 0) {
      setValue('supplier_id', 0);
    }
  }, [selectedTender, selectedTenderId, setValue]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      contractService.create({
        tender_id: data.tender_id,
        supplier_id: data.supplier_id,
        title: data.title,
        description: data.description,
        contract_value: data.contract_value,
        start_date: data.start_date,
        end_date: data.end_date,
        milestones: milestones.filter((m) => m.title.trim() && m.due_date),
      }),
    onSuccess: (data) => {
      toastSuccess('Contract created');
      queryClient.invalidateQueries({ queryKey: ['admin', 'contracts'] });
      navigate(`/admin/contracts/${data.id}`);
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const addMilestone = () => setMilestones((p) => [...p, { title: '', due_date: '' }]);
  const removeMilestone = (i: number) => setMilestones((p) => p.filter((_, j) => j !== i));
  const updateMilestone = (i: number, field: 'title' | 'due_date', value: string) =>
    setMilestones((p) => {
      const n = [...p];
      n[i] = { ...n[i], [field]: value };
      return n;
    });

  return (
    <div>
        <Link to="/admin/contracts" className="mb-4 inline-flex items-center text-sm text-primary hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Contracts
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Create Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div>
                <Label>Tender *</Label>
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={watch('tender_id') || ''}
                  onChange={(e) => {
                    const tid = parseInt(e.target.value, 10) || 0;
                    setValue('tender_id', tid);
                    const t = awardedTenders.find((x) => x.tender_id === tid);
                    setValue('supplier_id', t ? t.supplier_id : 0);
                  }}
                >
                  <option value="">Select awarded tender (no contract yet)</option>
                  {awardedTenders.map((t) => (
                    <option key={t.tender_id} value={t.tender_id}>
                      {t.reference_number} – {t.tender_title} → {t.company_name}
                    </option>
                  ))}
                </select>
                {errors.tender_id && <p className="text-sm text-red-600">{errors.tender_id.message}</p>}
              </div>

              {selectedTender && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm">
                  <p><strong>Supplier:</strong> {selectedTender.company_name} ({selectedTender.supplier_name})</p>
                </div>
              )}

              <div>
                <Label>Title *</Label>
                <Input {...register('title')} className="mt-1" />
                {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
              </div>
              <div>
                <Label>Description (optional)</Label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contract value (GHS) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('contract_value', { valueAsNumber: true })}
                    className="mt-1"
                  />
                  {errors.contract_value && <p className="text-sm text-red-600">{errors.contract_value.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start date *</Label>
                  <Input type="date" {...register('start_date')} className="mt-1" />
                  {errors.start_date && <p className="text-sm text-red-600">{errors.start_date.message}</p>}
                </div>
                <div>
                  <Label>End date *</Label>
                  <Input type="date" {...register('end_date')} className="mt-1" />
                  {errors.end_date && <p className="text-sm text-red-600">{errors.end_date.message}</p>}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Milestones (optional)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                    <Plus className="mr-1 h-4 w-4" /> Add
                  </Button>
                </div>
                {milestones.map((m, i) => (
                  <div key={i} className="mt-2 flex gap-2">
                    <Input
                      placeholder="Title"
                      value={m.title}
                      onChange={(e) => updateMilestone(i, 'title', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="date"
                      placeholder="Due date"
                      value={m.due_date}
                      onChange={(e) => updateMilestone(i, 'due_date', e.target.value)}
                      className="w-40"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMilestone(i)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button type="submit" disabled={createMutation.isPending || awardedTenders.length === 0}>
                {createMutation.isPending ? 'Creating...' : 'Create Contract'}
              </Button>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
