export interface Contract {
  id: number;
  tender_id: number;
  tender_title: string;
  supplier_id: number;
  supplier_name: string;
  company_name: string;
  contract_number: string;
  title: string;
  description?: string;
  contract_value: number;
  start_date: string;
  end_date: string;
  status: ContractStatus;
  signed_by_admin: boolean;
  signed_by_supplier: boolean;
  admin_signed_at?: string | null;
  supplier_signed_at?: string | null;
  milestones: ContractMilestone[];
  documents: ContractDocument[];
}

export type ContractStatus = 'draft' | 'active' | 'completed' | 'terminated' | 'disputed';

export interface ContractMilestone {
  id: number;
  title: string;
  description?: string;
  due_date: string;
  status: MilestoneStatus;
  completion_date?: string | null;
  notes?: string | null;
}

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface ContractDocument {
  id: number;
  original_name: string;
  document_type: string;
  uploaded_by_name: string;
  uploaded_at: string;
}

export interface ContractListItem {
  id: number;
  contract_number: string;
  title: string;
  tender_id: number;
  tender_title: string;
  supplier_id: number;
  supplier_name: string;
  company_name: string;
  contract_value: number;
  start_date: string;
  end_date: string;
  status: ContractStatus;
}

export interface AwardedTenderForContract {
  tender_id: number;
  tender_title: string;
  reference_number: string;
  supplier_id: number;
  supplier_name: string;
  company_name: string;
}
