import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { getCategories } from '@/services/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TagChip } from '@/components/tenders/TagChip';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { ArrowLeft } from 'lucide-react';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  reference_number: z.string().min(1, 'Reference number is required'),
  description: z.string().min(1, 'Description is required'),
  category_id: z.number({ required_error: 'Category is required' }).min(1, 'Category is required'),
  budget: z.union([z.string(), z.number()]).optional(),
  submission_deadline: z.string().min(1, 'Deadline is required'),
  opening_date: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function AdminTenderCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [criteria, setCriteria] = useState<Array<{ name: string; description?: string; max_score: number; weight: number }>>([
    { name: '', description: '', max_score: 100, weight: 1 },
  ]);

  const [tags, setTags] = useState<string[]>([]);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category_id: undefined },
  });
  const categoryId = watch('category_id');

  const addTag = (value: string) => {
    const v = value.trim().toLowerCase();
    if (v && !tags.includes(v) && tags.length < 20) setTags((prev) => [...prev, v]);
  };

  const removeTag = (idx: number) => setTags((prev) => prev.filter((_, i) => i !== idx));

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      tendersService.create({
        ...data,
        budget: data.budget ? Number(data.budget) : undefined,
        tags: tags,
        criteria: criteria.filter((c) => c.name.trim()).map((c) => ({ name: c.name, description: c.description, max_score: c.max_score, weight: c.weight })),
      }),
    onSuccess: (data) => {
      toastSuccess('Tender created');
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenders'] });
      navigate(`/admin/tenders/${data.id}`);
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed to create'),
  });

  const addCriterion = () => {
    setCriteria((prev) => [...prev, { name: '', description: '', max_score: 100, weight: 1 }]);
  };

  return (
    <div>
        <Link to="/admin/tenders" className="mb-4 inline-flex items-center text-sm text-primary hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Tenders
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Create Tender</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input {...register('title')} className="mt-1" />
                {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
              </div>
              <div>
                <Label>Reference number</Label>
                <Input {...register('reference_number')} placeholder="e.g. TND-2024-003" className="mt-1" />
                {errors.reference_number && <p className="text-sm text-red-600">{errors.reference_number.message}</p>}
              </div>
              <div>
                <Label>Description</Label>
                <textarea {...register('description')} rows={4} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={categoryId ?? ''}
                    onChange={(e) => setValue('category_id', parseInt(e.target.value, 10) || 0)}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.category_id && <p className="text-sm text-red-600">{errors.category_id.message}</p>}
                </div>
                <div>
                  <Label>Budget</Label>
                  <Input type="number" step="0.01" {...register('budget')} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Tags (optional)</Label>
                <p className="text-xs text-gray-500 mb-1">Press Enter or comma to add a tag</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tags.map((t, i) => (
                    <TagChip key={t} tag={t} onRemove={() => removeTag(i)} />
                  ))}
                  <Input
                    ref={tagInputRef}
                    className="w-40 inline-flex"
                    placeholder="Add tag..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const target = e.target as HTMLInputElement;
                        addTag(target.value);
                        target.value = '';
                      }
                    }}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v) { addTag(v); e.target.value = ''; }
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Submission deadline</Label>
                  <Input type="datetime-local" {...register('submission_deadline')} className="mt-1" />
                  {errors.submission_deadline && <p className="text-sm text-red-600">{errors.submission_deadline.message}</p>}
                </div>
                <div>
                  <Label>Opening date (optional)</Label>
                  <Input type="datetime-local" {...register('opening_date')} className="mt-1" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Evaluation criteria</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addCriterion}>Add</Button>
                </div>
                {criteria.map((c, i) => (
                  <div key={i} className="mt-2 flex gap-2">
                    <Input placeholder="Criterion name" value={c.name} onChange={(e) => setCriteria((prev) => { const n = [...prev]; n[i] = { ...n[i], name: e.target.value }; return n; })} />
                    <Input type="number" placeholder="Max score" value={c.max_score} onChange={(e) => setCriteria((prev) => { const n = [...prev]; n[i] = { ...n[i], max_score: Number(e.target.value) || 100 }; return n; })} className="w-24" />
                  </div>
                ))}
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Tender'}
              </Button>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
