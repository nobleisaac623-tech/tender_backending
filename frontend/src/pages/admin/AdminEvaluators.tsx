import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/users';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { UserPlus, Users, Loader2 } from 'lucide-react';

export function AdminEvaluators() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  const { data: evaluators = [], isLoading } = useQuery({
    queryKey: ['evaluators'],
    queryFn: usersService.listEvaluators,
  });

  const inviteMutation = useMutation({
    mutationFn: usersService.inviteEvaluator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluators'] });
      setFormData({ name: '', email: '' });
      setShowForm(false);
      toastSuccess('Invite sent. Evaluator will set password via link.');
    },
    onError: (error: Error) => {
      toastError(error.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: usersService.approveUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluators'] });
      toastSuccess('Evaluator approved');
    },
    onError: (error: Error) => toastError(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate(formData);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Evaluators</h1>
          <p className="text-gray-600">Manage evaluator accounts</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Evaluator
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Invite Evaluator</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter evaluator name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="evaluator@example.com"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invite Link
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Evaluator List ({evaluators.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : evaluators.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No evaluators found. Click "Add Evaluator" to create one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left font-medium">Name</th>
                    <th className="pb-3 text-left font-medium">Email</th>
                    <th className="pb-3 text-left font-medium">Status</th>
                    <th className="pb-3 text-left font-medium">Created</th>
                    <th className="pb-3 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluators.map((evaluator) => (
                    <tr key={evaluator.id} className="border-b last:border-0">
                      <td className="py-3">{evaluator.name}</td>
                      <td className="py-3">{evaluator.email}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            evaluator.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {evaluator.status === 'active' ? 'approved' : 'pending'}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {evaluator.created_at ? new Date(evaluator.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3">
                        {evaluator.status === 'pending' ? (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(evaluator.id)}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? 'Approving...' : 'Approve'}
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
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
    </div>
  );
}
