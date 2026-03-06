import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminReports() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Reports</h1>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tender & supplier reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Generate tender evaluation reports and supplier performance reports from the tender and supplier detail pages.</p>
        </CardContent>
      </Card>
    </div>
  );
}
