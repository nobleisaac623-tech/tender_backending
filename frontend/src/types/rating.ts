export interface SupplierRating {
  id: number;
  contract_id: number;
  contract_number: string;
  tender_title: string;
  quality_score: number;
  delivery_score: number;
  communication_score: number;
  compliance_score: number;
  overall_score: number;
  comments?: string;
  rated_at: string;
}

export interface RatingAggregate {
  average_overall: number;
  average_quality: number;
  average_delivery: number;
  average_communication: number;
  average_compliance: number;
  total_ratings: number;
  rating_distribution: Record<string, number>;
}

export interface RatingsResponse {
  ratings: SupplierRating[];
  aggregate: RatingAggregate | null;
}

export interface RatingSummary {
  average_overall: number | null;
  total_contracts_rated: number;
}

export interface CreateRatingPayload {
  contract_id: number;
  quality_score: number;
  delivery_score: number;
  communication_score: number;
  compliance_score: number;
  comments?: string;
}
