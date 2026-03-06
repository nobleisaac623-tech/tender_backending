import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminAuditLog() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>System audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Audit log is recorded in the database. A dedicated API endpoint can be added to list and filter audit entries.</p>
        </CardContent>
      </Card>
    </div>
  );
}
