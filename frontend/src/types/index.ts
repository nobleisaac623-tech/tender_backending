export type UserRole = 'admin' | 'evaluator' | 'supplier';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type TenderStatus = 'draft' | 'published' | 'closed' | 'evaluated' | 'awarded';
export type BidStatus = 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
  supplier_profile?: SupplierProfile;
  profile?: SupplierProfile;
}

export interface SupplierProfile {
  id: number;
  user_id?: number;
  company_name: string;
  registration_number?: string;
  address?: string;
  phone?: string;
  website?: string;
  category?: string;
  tax_id?: string;
  is_approved: number | boolean;
  approved_by?: number;
  approved_at?: string;
}

export interface Tender {
  id: number;
  title: string;
  reference_number: string;
  description: string;
  category?: string;
  category_id?: number;
  category_name?: string;
  category_color?: string;
  tags?: string[];
  budget?: number;
  submission_deadline: string;
  opening_date?: string;
  status: TenderStatus;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  documents?: TenderDocument[];
  criteria?: EvaluationCriterion[];
}

export interface TenderCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
}

export interface TenderDocument {
  id: number;
  filename: string;
  original_name: string;
  file_size?: number;
  uploaded_at?: string;
}

export interface EvaluationCriterion {
  id: number;
  name: string;
  description?: string;
  max_score: number;
  weight: number;
}

export interface Bid {
  id: number;
  tender_id: number;
  supplier_id?: number;
  bid_amount?: number;
  technical_proposal?: string;
  status: BidStatus;
  submitted_at?: string;
  created_at?: string;
  tender_title?: string;
  reference_number?: string;
  supplier_name?: string;
  supplier_email?: string;
  documents?: BidDocument[];
}

export interface BidDocument {
  id: number;
  filename: string;
  original_name: string;
  document_type?: string;
  file_size?: number;
  uploaded_at?: string;
}

export interface Evaluation {
  id: number;
  bid_id: number;
  evaluator_id: number;
  criteria_id: number;
  score: number;
  comment?: string;
  criteria_name?: string;
  max_score?: number;
  weight?: number;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface BlacklistRecord {
  id: number;
  supplier_id: number;
  supplier_name: string;
  supplier_email: string;
  reason: string;
  blacklisted_by: number;
  blacklisted_by_name: string;
  blacklisted_at: string;
  is_active: boolean;
  lifted_by?: number;
  lifted_by_name?: string;
  lifted_at?: string;
  lift_reason?: string;
}

export * from './contract';
export * from './rating';
