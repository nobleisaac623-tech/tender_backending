import { useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ratingService } from '@/services/ratingService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { RatingBreakdown } from '@/components/ratings/RatingBreakdown';

export function SupplierPerformance() {
  const { user, logout } = useAuth();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: ratingsData, isLoading } = useQuery({
    queryKey: ['supplier', 'ratings'],
    queryFn: () => ratingService.list(),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/supplier/dashboard" className="font-semibold text-primary">
              Supplier
            </Link>
            <nav className="flex gap-4">
              <Link to="/supplier/tenders" className="text-sm text-gray-600 hover:text-primary">
                Tenders
              </Link>
              <Link to="/supplier/bids" className="text-sm text-gray-600 hover:text-primary">
                My Bids
              </Link>
              <Link to="/supplier/contracts" className="text-sm text-gray-600 hover:text-primary">
                My Contracts
              </Link>
              <Link to="/supplier/performance" className="text-sm font-medium text-primary">
                Performance
              </Link>
              <Link to="/supplier/profile" className="text-sm text-gray-600 hover:text-primary">
                Profile
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">My Performance Ratings</h1>

        {isLoading && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && (!ratingsData?.aggregate || ratingsData.aggregate.total_ratings === 0) && (
          <Card className="mt-6">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No performance ratings yet.</p>
              <p className="mt-1 text-sm text-gray-400">Complete contracts and get rated by the admin to see your performance here.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && ratingsData?.aggregate && ratingsData.aggregate.total_ratings > 0 && (
          <>
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Overall performance</CardTitle>
              </CardHeader>
              <CardContent>
                <RatingBreakdown aggregate={ratingsData.aggregate} showOverall={true} />
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Rating history</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-600">
                        <th className="p-2">Tender Title</th>
                        <th className="p-2">Contract</th>
                        <th className="p-2">Quality</th>
                        <th className="p-2">Delivery</th>
                        <th className="p-2">Communication</th>
                        <th className="p-2">Compliance</th>
                        <th className="p-2">Overall</th>
                        <th className="p-2">Date</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ratingsData.ratings.map((r) => (
                        <Fragment key={r.id}>
                          <tr className="border-b hover:bg-gray-50/50">
                            <td className="p-2">{r.tender_title}</td>
                            <td className="p-2 font-mono">{r.contract_number}</td>
                            <td className="p-2">{r.quality_score}</td>
                            <td className="p-2">{r.delivery_score}</td>
                            <td className="p-2">{r.communication_score}</td>
                            <td className="p-2">{r.compliance_score}</td>
                            <td className="p-2">
                              <StarRating value={r.overall_score} size="sm" showValue={true} />
                            </td>
                            <td className="p-2">{new Date(r.rated_at).toLocaleDateString()}</td>
                            <td className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                              >
                                {expandedId === r.id ? 'Hide' : 'Comments'}
                              </Button>
                            </td>
                          </tr>
                          {expandedId === r.id && r.comments && (
                            <tr className="border-b bg-gray-50/50">
                              <td colSpan={9} className="p-3 text-sm text-gray-600">
                                <strong>Comments:</strong> {r.comments}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
