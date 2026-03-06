import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryBadge } from '@/components/tenders/CategoryBadge';
import { TagChip } from '@/components/tenders/TagChip';
import { ArrowLeft, Clock } from 'lucide-react';

export function PublicTenderView() {
  const { id } = useParams<{ id: string }>();
  const tenderId = id ? parseInt(id, 10) : 0;

  const { data: tender, isLoading, error } = useQuery({
    queryKey: ['tender', 'public', tenderId],
    queryFn: () => tendersService.showPublic(tenderId),
    enabled: tenderId > 0,
  });

  if (isLoading || !tender) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-red-600">Tender not found or no longer available.</p>
        <Link to="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    );
  }

  const deadline = new Date(tender.submission_deadline);
  const isPast = deadline.getTime() < Date.now();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Tender Details</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{tender.title}</CardTitle>
            <p className="text-sm text-gray-500">{tender.reference_number}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {tender.category_name && (
                <CategoryBadge category_name={tender.category_name} category_color={tender.category_color} />
              )}
              {tender.tags && tender.tags.length > 0 && (
                <>
                  {tender.tags.map((tag) => (
                    <TagChip key={tag} tag={tag} />
                  ))}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-gray-700">{tender.description}</p>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span className={isPast ? 'text-amber-600' : 'text-gray-600'}>
                Submission deadline: {tender.submission_deadline}
                {isPast && ' (Closed)'}
              </span>
            </div>
            {tender.budget != null && (
              <p className="text-sm text-gray-600">
                Budget: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tender.budget)}
              </p>
            )}
          </CardContent>
        </Card>
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-gray-700">To submit a bid, please register as a supplier or log in.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button>Register as Supplier</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">Login</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
