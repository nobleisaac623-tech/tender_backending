import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminEvaluators() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Evaluators</h1>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Manage evaluator accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Evaluators are managed as users with role &quot;evaluator&quot;. Assign them to tenders from the tender detail page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
