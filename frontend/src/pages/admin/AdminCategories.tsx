import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesService } from '@/services/categories';
import { useAuth } from '@/context/AuthContext';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';

export function AdminCategories() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#1e3a5f');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => categoriesService.listAdmin(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      categoriesService.create({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        color: newColor,
      }),
    onSuccess: () => {
      toastSuccess('Category created');
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewName('');
      setNewDesc('');
      setNewColor('#1e3a5f');
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (c: { id: number; name: string; description?: string; color?: string }) =>
      categoriesService.update(c),
    onSuccess: () => {
      toastSuccess('Category updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingId(null);
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesService.delete(id),
    onSuccess: () => {
      toastSuccess('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const startEdit = (c: { id: number; name: string; description?: string; color: string }) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDesc(c.description ?? '');
    setEditColor(c.color);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/admin/dashboard" className="font-semibold text-primary">
            Admin
          </Link>
          <nav className="flex gap-4">
            <Link to="/admin/tenders" className="text-sm text-gray-600 hover:text-primary">
              Tenders
            </Link>
            <Link to="/admin/categories" className="text-sm font-medium text-primary">
              Categories
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link
          to="/admin/dashboard"
          className="mb-4 inline-flex items-center text-sm text-primary hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Category Management</h1>
        <p className="mt-1 text-gray-600">Manage tender categories. Categories with tenders cannot be deleted.</p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Add Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[180px]">
                <Label>Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. IT & Technology"
                  className="mt-1"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <Label>Description (optional)</Label>
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded border border-gray-300"
                  />
                  <Input
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="w-24"
                  />
                </div>
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {!isLoading && categories.length === 0 && (
              <p className="py-6 text-center text-gray-500">No categories yet.</p>
            )}
            {!isLoading && categories.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-sm text-gray-600">
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">Color</th>
                      <th className="pb-3 font-medium">Description</th>
                      <th className="pb-3 font-medium">Tenders</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id} className="border-b border-gray-100">
                        <td className="py-3">
                          {editingId === c.id ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="max-w-xs"
                            />
                          ) : (
                            <span className="font-medium">{c.name}</span>
                          )}
                        </td>
                        <td className="py-3">
                          {editingId === c.id ? (
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={editColor}
                                onChange={(e) => setEditColor(e.target.value)}
                                className="h-8 w-8 cursor-pointer rounded border border-gray-300"
                              />
                              <Input
                                value={editColor}
                                onChange={(e) => setEditColor(e.target.value)}
                                className="w-24"
                              />
                            </div>
                          ) : (
                            <span
                              className="inline-block h-6 w-6 rounded border border-gray-300"
                              style={{ backgroundColor: c.color }}
                              title={c.color}
                            />
                          )}
                        </td>
                        <td className="py-3">
                          {editingId === c.id ? (
                            <Input
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              placeholder="Description"
                              className="max-w-xs"
                            />
                          ) : (
                            <span className="text-gray-600">{c.description ?? '—'}</span>
                          )}
                        </td>
                        <td className="py-3 text-gray-600">{c.tender_count}</td>
                        <td className="py-3">
                          {editingId === c.id ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateMutation.mutate({
                                    id: c.id,
                                    name: editName.trim(),
                                    description: editDesc.trim() || undefined,
                                    color: editColor,
                                  })
                                }
                                disabled={!editName.trim() || updateMutation.isPending}
                              >
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(c.id)}
                                disabled={c.tender_count > 0 || deleteMutation.isPending}
                                title={c.tender_count > 0 ? 'Cannot delete: has tenders' : 'Delete'}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
