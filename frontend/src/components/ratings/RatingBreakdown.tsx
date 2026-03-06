import { StarRating } from '@/components/ui/StarRating';
import type { RatingAggregate, SupplierRating } from '@/types';

const CRITERIA = [
  { key: 'quality' as const, label: 'Quality', description: 'Were the goods/services delivered to the required standard?' },
  { key: 'delivery' as const, label: 'Delivery', description: 'Was everything delivered on time and within the agreed schedule?' },
  { key: 'communication' as const, label: 'Communication', description: 'Was the supplier responsive and easy to work with?' },
  { key: 'compliance' as const, label: 'Compliance', description: 'Did the supplier follow all contractual terms and requirements?' },
];

const BAR_COLOR = '#3b82f6';

interface RatingBreakdownProps {
  aggregate?: RatingAggregate | null;
  singleRating?: SupplierRating | null;
  /** Show overall prominently (large) */
  showOverall?: boolean;
}

export function RatingBreakdown({ aggregate, singleRating, showOverall = true }: RatingBreakdownProps) {
  const scores = aggregate
    ? {
        quality: aggregate.average_quality,
        delivery: aggregate.average_delivery,
        communication: aggregate.average_communication,
        compliance: aggregate.average_compliance,
        overall: aggregate.average_overall,
      }
    : singleRating
      ? {
          quality: singleRating.quality_score,
          delivery: singleRating.delivery_score,
          communication: singleRating.communication_score,
          compliance: singleRating.compliance_score,
          overall: singleRating.overall_score,
        }
      : null;

  if (!scores) {
    return (
      <p className="text-sm text-gray-500">No rating data.</p>
    );
  }

  return (
    <div className="space-y-4">
      {showOverall && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50/50 p-6">
          <span className="text-5xl font-bold text-gray-900" style={{ fontSize: '48px' }}>
            {scores.overall.toFixed(1)}
          </span>
          <StarRating value={scores.overall} onChange={undefined} size="lg" showValue={false} />
          <span className="mt-1 text-sm text-gray-500">Overall</span>
        </div>
      )}

      <div className="space-y-3">
        {CRITERIA.map(({ key, label, description }) => {
          const value = scores[key];
          const pct = (value / 5) * 100;
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700" title={description}>
                  {label}
                </span>
                <span className="text-gray-600">
                  {value.toFixed(1)}/5
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: BAR_COLOR }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
