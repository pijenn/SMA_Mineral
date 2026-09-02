export type UserRole = 'hod' | 'admin_logistics' | 'admin_finance' | 'project_manager';

export type ItemCategoryType = 'routine' | 'additional';

export type PriorityLevel = 1 | 2 | 3; // 1: Routine/Normal, 2: Medium/Important, 3: Urgent/Mandatory

export type ItemLifecycleStatus =
  | 'draft'
  | 'submitted'
  | 'needs_revision'
  | 'validated'
  | 'pm_item_approved'
  | 'pm_item_rejected'
  | 'finance_budgeted'
  | 'pm_buy_approved'
  | 'deferred_deficit'
  | 'purchased'
  | 'processing_delivery'
  | 'in_transit'
  | 'received_at_site'
  | 'deferred_next_week';

export type DeliveryStatusType = 'none' | 'processing' | 'in_transit' | 'delivered' | 'delayed';

export type PeriodStatus = 'draft' | 'submission_open' | 'in_review' | 'purchasing' | 'finalized' | 'closed';

export type RequestStatus = 'draft' | 'submitted' | 'needs_revision' | 'validated' | 'approved_by_pm' | 'completed' | 'cancelled';

export type NotificationType = 'need_revision' | 'prioritize_confirmation' | 'purchase_update' | 'delayed_arrival' | 'approval_request' | 'general';

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  department_id?: string | null;
  full_name: string;
  username: string;
  password_hash?: string | null;
  role: UserRole;
  phone_number?: string | null;
  is_active: boolean;
  department?: Department;
  created_at?: string;
}

export interface RoutineItem {
  id: string;
  department_id: string;
  item_code: string;
  name: string;
  description?: string;
  specification?: string;
  unit: string;
  estimated_unit_price: number;
  status: 'active' | 'pending_approval' | 'archived';
  department?: Department;
  created_at?: string;
}

export interface ProcurementPeriod {
  id: string;
  year: number;
  week_number: number;
  period_name: string;
  start_date: string;
  end_date: string;
  disbursed_budget: number;
  previous_rollover_balance: number;
  status: PeriodStatus;
  notes?: string;
}

export interface ProcurementRequestItem {
  id: string;
  request_id: string;
  item_type: ItemCategoryType;
  routine_item_id?: string;
  custom_item_name?: string;
  specification?: string;
  quantity: number;
  unit: string;
  priority_level: PriorityLevel;
  is_rollover: boolean;
  origin_period_id?: string;
  
  // Logistics sourcing
  logistics_notes?: string;
  price_range_min?: number;
  price_range_max?: number;
  reference_link?: string;
  final_unit_price?: number;
  estimated_total_price?: number;
  
  // Approvals & Lifecycle
  pm_item_approval: 'pending' | 'approved' | 'rejected';
  pm_item_approval_notes?: string;
  pm_buy_approval: 'pending' | 'approved' | 'deferred';
  pm_buy_approval_notes?: string;
  
  lifecycle_status: ItemLifecycleStatus;
  delivery_status: DeliveryStatusType;
  eta_delivery?: string;
  received_at?: string;
  received_by?: string;
  receipt_notes?: string;
  
  // Joined details
  department_id?: string;
  routine_item?: RoutineItem;
  department?: Department;
  department_name?: string;
  department_code?: string;
  period_name?: string;
  created_at?: string;
}

export interface ProcurementRequest {
  id: string;
  period_id: string;
  department_id: string;
  submitted_by?: string;
  status: RequestStatus;
  submission_date?: string;
  notes?: string;
  items?: ProcurementRequestItem[];
  department?: Department;
  period?: ProcurementPeriod;
  created_at?: string;
}

export interface PurchaseTransaction {
  id: string;
  period_id: string;
  transaction_code: string;
  vendor_name: string;
  invoice_number?: string;
  purchase_date: string;
  total_amount: number;
  payment_method: string;
  notes?: string;
  created_by?: string;
  proofs?: PurchaseProof[];
  items?: PurchaseTransactionItem[];
  created_at?: string;
}

export interface PurchaseTransactionItem {
  id: string;
  transaction_id: string;
  request_item_id: string;
  purchased_quantity: number;
  actual_unit_price: number;
  actual_total_price: number;
  request_item?: ProcurementRequestItem;
}

export interface PurchaseProof {
  id: string;
  transaction_id: string;
  file_url: string;
  file_name: string;
  file_type?: string;
  file_size_bytes?: number;
  uploaded_by?: string;
  verified_by_finance: boolean;
  verified_by?: string;
  verified_at?: string;
  finance_notes?: string;
  created_at?: string;
}

export interface FinanceWeeklyReport {
  id: string;
  period_id: string;
  disbursed_budget: number;
  previous_rollover_balance: number;
  total_budget_available: number;
  total_actual_expenditure: number;
  remaining_balance: number; // positive = surplus, negative = deficit
  status: 'draft' | 'submitted_by_finance' | 'approved_by_pm' | 'closed';
  submitted_by?: string;
  submitted_at?: string;
  approved_by_pm?: string;
  approved_at?: string;
  pm_approval_notes?: string;
}

export interface FinancialJournalEntry {
  id: string;
  period_id: string;
  transaction_id?: string;
  entry_date: string;
  account_code: string;
  account_name: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
}

export interface AppNotification {
  id: string;
  recipient_id?: string;
  department_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  related_request_id?: string;
  related_item_id?: string;
  is_read: boolean;
  created_at: string;
}
