import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractService } from '@/services/contractService';
import { ratingService } from '@/services/ratingService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastSuccess, toastError } from '@/hooks/useToast';
import { ArrowLeft, Check, Clock, Plus, Download, Pencil, Star, FileText, Building2, Calendar, DollarSign, AlertTriangle, Printer, Upload } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { RatingBreakdown } from '@/components/ratings/RatingBreakdown';
import { cn } from '@/utils/cn';
import type { ContractStatus, MilestoneStatus } from '@/types';

// ── Status Workflow Configuration ─────────────────────────────────────────────────

type WorkflowStep = 'draft' | 'active' | 'completed' | 'terminated';

const workflowSteps: { key: WorkflowStep; label: string; description: string }[] = [
  { key: 'draft', label: 'Draft', description: 'Contract created, awaiting signatures' },
  { key: 'active', label: 'Active', description: 'Both parties signed, contract in effect' },
  { key: 'completed', label: 'Completed', description: 'Contract successfully fulfilled' },
  { key: 'terminated', label: 'Terminated', description: 'Contract ended early' },
];

const milestoneStatusConfig: Record<string, { label: string; className: string; icon: string }> = {
  pending: { label: 'Pending', className: 'bg-slate-200 text-slate-700', icon: '○' },
  in_progress: { label: 'In Progress', className: 'bg-blue-200 text-blue-800', icon: '🔵' },
  completed: { label: 'Completed', className: 'bg-green-200 text-green-800', icon: '✅' },
  overdue: { label: 'Overdue', className: 'bg-red-200 text-red-800', icon: '🔴' },
};

// ── Helper Functions ────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(value);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function calculateDurationProgress(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  
  const totalDays = Math.floor((end - start) / 86400000);
  const elapsed = Math.floor((now - start) / 86400000);
  const remaining = Math.floor((end - now) / 86400000);
  
  const percent = Math.min(Math.max((elapsed / totalDays) * 100, 0), 100);
  
  return { totalDays, elapsed, remaining, percent };
}

function getProgressColor(percent: number) {
  if (percent <= 60) return '#10b981'; // green
  if (percent <= 85) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

// ── Components ────────────────────────────────────────────────────────────────

function StatusWorkflowBar({ status }: { status: ContractStatus }) {
  const currentIndex = status === 'draft' ? 0 : status === 'active' ? 1 : status === 'completed' ? 2 : status === 'terminated' ? 2 : 0;
  
  return (
    <div className="mb-6 rounded-xl bg-white p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between">
        {workflowSteps.slice(0, 3).map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isTerminated = status === 'terminated' && index === 2;
          
          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all",
                    isCompleted && "border-green-500 bg-green-500 text-white",
                    isCurrent && !isTerminated && "border-blue-600 bg-blue-600 text-white ring-4 ring-blue-100",
                    isTerminated && "border-red-500 bg-red-500 text-white",
                    !isCompleted && !isCurrent && "border-slate-300 bg-white text-slate-400"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className={cn("mt-2 text-xs font-medium", isCurrent ? "text-blue-600" : "text-slate-600")}>
                  {step.label}
                </span>
                <span className="text-[10px] text-slate-400 text-center max-w-[80px]">
                  {step.description}
                </span>
              </div>
              {index < 2 && (
                <div className={cn("flex-1 h-0.5 mx-2", isCompleted ? "bg-green-500" : "border-t border-dashed border-slate-300")} />
              )}
            </div>
          );
        })}
      </div>
      {status === 'terminated' && (
        <div className="mt-4 flex items-center justify-center">
          <span className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            <AlertTriangle className="h-3 w-3" />
            Contract Terminated
          </span>
        </div>
      )}
    </div>
  );
}

function ContractHeaderCard({ contract }: { contract: any }) {
  const { totalDays, elapsed, remaining, percent } = calculateDurationProgress(contract.start_date, contract.end_date);
  const progressColor = getProgressColor(percent);
  
  return (
    <div className="mb-6 rounded-xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <FileText className="h-7 w-7 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{contract.title}</h1>
              <p className="font-mono text-sm text-slate-500">{contract.contract_number}</p>
            </div>
            <span className={cn(
              "rounded-full px-3 py-1 text-sm font-medium",
              contract.status === 'draft' && "bg-slate-200 text-slate-700",
              contract.status === 'active' && "bg-blue-200 text-blue-800",
              contract.status === 'completed' && "bg-green-200 text-green-800",
              contract.status === 'terminated' && "bg-red-200 text-red-800",
              contract.status === 'disputed' && "bg-amber-200 text-amber-800"
            )}>
              {contract.status === 'draft' && 'Draft'}
              {contract.status === 'active' && 'Active'}
              {contract.status === 'completed' && 'Completed'}
              {contract.status === 'terminated' && 'Terminated'}
              {contract.status === 'disputed' && 'Disputed'}
            </span>
          </div>
          
          <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 text-sm md:grid-cols-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-slate-400" />
              <span className="font-semibold text-slate-900">{formatCurrency(contract.contract_value)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">{contract.company_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">
                {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
              </span>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Contract Duration Progress</span>
              <span>{Math.round(percent)}% elapsed ({elapsed} of {totalDays} days)</span>
            </div>
            <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%`, backgroundColor: progressColor }}
              />
            </div>
            <p className={cn("mt-1 text-xs font-medium", remaining >= 0 ? "text-slate-500" : "text-red-600")}>
              {remaining >= 0 ? `${remaining} days remaining` : `Contract ended ${Math.abs(remaining)} days ago`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractHealthCard({ contract, rating }: { contract: any; rating?: any }) {
  const { remaining } = calculateDurationProgress(contract.start_date, contract.end_date);
  const bothSigned = contract.signed_by_admin && contract.signed_by_supplier;
  const completedMilestones = contract.milestones.filter((m: any) => m.status === 'completed').length;
  const totalMilestones = contract.milestones.length;
  const hasOverdue = contract.milestones.some((m: any) => m.status === 'overdue');
  const hasDocuments = contract.documents.length > 0;
  const hasRating = !!rating;
  
  const healthItems = [
    { 
      icon: bothSigned ? '✅' : '⚠️', 
      label: 'Signatures', 
      status: bothSigned ? 'healthy' : 'warning',
      detail: bothSigned ? 'Both parties signed' : 'Awaiting signatures'
    },
    { 
      icon: totalMilestones > 0 ? (hasOverdue ? '⚠️' : '✅') : '⚠️', 
      label: 'Milestones', 
      status: totalMilestones > 0 ? (hasOverdue ? 'warning' : 'healthy') : 'neutral',
      detail: `${completedMilestones} of ${totalMilestones} completed`
    },
    { 
      icon: hasDocuments ? '✅' : '⚠️', 
      label: 'Documents', 
      status: hasDocuments ? 'healthy' : 'warning',
      detail: hasDocuments ? `${contract.documents.length} uploaded` : 'No documents'
    },
    { 
      icon: remaining > 30 ? '✅' : remaining > 7 ? '⚠️' : '🔴', 
      label: 'Time Remaining', 
      status: remaining > 30 ? 'healthy' : remaining > 7 ? 'warning' : 'critical',
      detail: remaining >= 0 ? `${remaining} days left` : 'Contract ended'
    },
    { 
      icon: contract.status === 'completed' ? (hasRating ? '✅' : '⚠️') : '⚠️', 
      label: 'Rating', 
      status: contract.status === 'completed' ? (hasRating ? 'healthy' : 'warning') : 'neutral',
      detail: contract.status === 'completed' ? (hasRating ? 'Rated' : 'Pending rating') : 'N/A (active)'
    },
  ];
  
  return (
    <Card className="border border-slate-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Contract Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {healthItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{item.icon}</span>
              <span className="text-sm text-slate-600">{item.label}</span>
            </div>
            <span className={cn(
              "text-xs",
              item.status === 'healthy' && "text-green-600",
              item.status === 'warning' && "text-amber-600",
              item.status === 'critical' && "text-red-600",
              item.status === 'neutral' && "text-slate-400"
            )}>
              {item.detail}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SignatureBlock({ 
  title, 
  signed, 
  signedAt, 
  name, 
  role, 
  canSign, 
  onSign,
  isSigning 
}: { 
  title: string; 
  signed: boolean; 
  signedAt?: string; 
  name?: string; 
  role?: string; 
  canSign?: boolean;
  onSign?: () => void;
  isSigning?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-5",
      signed ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"
    )}>
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      
      {signed ? (
        <div className="text-center">
          <Check className="mx-auto h-12 w-12 text-green-500" />
          <p className="mt-2 font-semibold text-green-700">SIGNED</p>
          {name && <p className="mt-3 text-sm text-slate-700">{name}</p>}
          {role && <p className="text-xs text-slate-500">{role}</p>}
          {signedAt && <p className="mt-2 text-xs text-slate-400">{formatDateTime(signedAt)}</p>}
          <Button className="mt-4" variant="outline" size="sm" disabled>
            <Check className="mr-1 h-3 w-3" /> Signed & Verified
          </Button>
        </div>
      ) : (
        <div>
          <div className="mb-4 border-b border-slate-200 pb-4">
            <p className="text-sm text-slate-500">Authorized Signature</p>
            <div className="mt-2 border-b-2 border-slate-300" />
          </div>
          <p className="text-xs text-slate-500">Name: {name || '—'}</p>
          <p className="text-xs text-slate-500">Title: {role || '—'}</p>
          <p className="text-xs text-slate-500">Date: _______________</p>
          
          {canSign && (
            <Button 
              className="mt-4 w-full" 
              onClick={onSign}
              disabled={isSigning}
            >
              {isSigning ? 'Signing...' : `Sign as ${title.includes('Admin') ? 'Admin' : 'Supplier'}`}
            </Button>
          )}
          
          {!canSign && (
            <div className="mt-4 flex items-center gap-2 text-amber-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Awaiting signature</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MilestoneTimeline({ milestones, onAdd, onUpdate, isAdding }: { 
  milestones: any[]; 
  onAdd: () => void;
  onUpdate: (id: number, status: MilestoneStatus) => void;
  isAdding: boolean;
}) {
  return (
    <Card className="border border-slate-100 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Milestones</CardTitle>
        <Button variant="outline" size="sm" onClick={onAdd} disabled={isAdding}>
          <Plus className="mr-1 h-3 w-3" /> Add Milestone
        </Button>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600">No milestones added yet</p>
            <p className="text-xs text-slate-400">Break down this contract into trackable deliverables</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200" />
            
            <div className="space-y-4">
              {milestones.map((milestone) => {
                const statusKey = milestone.status as string;
                const config = milestoneStatusConfig[statusKey] || milestoneStatusConfig.pending;
                const isCompleted = milestone.status === 'completed';
                const isInProgress = milestone.status === 'in_progress';
                const isOverdue = milestone.status === 'overdue';
                
                return (
                  <div key={milestone.id} className="relative flex gap-4">
                    <div className={cn(
                      "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isCompleted && "bg-green-500 text-white",
                      isInProgress && "bg-blue-500 text-white ring-4 ring-blue-100",
                      isOverdue && "bg-red-500 text-white",
                      !isCompleted && !isInProgress && !isOverdue && "bg-slate-200 text-slate-600"
                    )}>
                      {config.icon}
                    </div>
                    
                    <div className={cn(
                      "flex-1 rounded-lg border p-3",
                      isOverdue && "border-red-200 bg-red-50",
                      !isOverdue && "border-slate-200 bg-white"
                    )}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{milestone.title}</p>
                          <p className="text-xs text-slate-500">
                            Due: {formatDate(milestone.due_date)}
                            {milestone.completion_date && ` • Completed: ${formatDate(milestone.completion_date)}`}
                          </p>
                          {milestone.notes && (
                            <p className="mt-1 text-xs text-slate-600">{milestone.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", config.className)}>
                            {config.label}
                          </span>
                          {!isCompleted && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => onUpdate(milestone.id, 'completed')}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentUpload({ 
  documents, 
  uploadType, 
  setUploadType, 
  onUpload, 
}: { 
  documents: any[]; 
  uploadType: string; 
  setUploadType: (v: string) => void;
  onUpload: (file: File) => void; 
  isUploading: boolean;
  onDelete: (id: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onUpload(files[0]);
    }
  };
  
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    return '📁';
  };
  
  return (
    <Card className="border border-slate-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={cn(
            "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all",
            isDragging ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm text-slate-600">Drag & drop files here, or click to browse</p>
          <p className="text-xs text-slate-400">PDF, DOC, DOCX, XLS, XLSX — Max 10MB each</p>
          
          <div className="mt-3 flex items-center justify-center gap-2">
            <select
              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="contract">Contract</option>
              <option value="amendment">Amendment</option>
              <option value="correspondence">Correspondence</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </div>
        
        {/* Uploaded Documents */}
        {documents.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-slate-500">Uploaded Documents ({documents.length})</p>
            <div className="grid gap-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getFileIcon(doc.mime_type || '')}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{doc.original_name}</p>
                      <p className="text-xs text-slate-400">
                        {formatDate(doc.uploaded_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={contractService.documentDownloadUrl(doc.id)} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminContractDetail() {
  const { id } = useParams<{ id: string }>();
  const contractId = id ? parseInt(id, 10) : 0;
  const queryClient = useQueryClient();
  
  const [newMilestone, setNewMilestone] = useState<{ title: string; due_date: string } | null>(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [signConfirmOpen, setSignConfirmOpen] = useState(false);
  const [uploadType, setUploadType] = useState('contract');
  const [ratingForm, setRatingForm] = useState({ 
    quality_score: 1, delivery_score: 1, communication_score: 1, compliance_score: 1, comments: '' 
  });

  // Queries
  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => contractService.show(contractId),
    enabled: contractId > 0,
  });

  const { data: contractRating } = useQuery({
    queryKey: ['rating-by-contract', contractId],
    queryFn: () => ratingService.getByContractId(contractId),
    enabled: contractId > 0 && !!contract && contract.status === 'completed',
  });

  // Mutations
  const signMutation = useMutation({
    mutationFn: () => contractService.sign(contractId, 'admin'),
    onSuccess: () => {
      toastSuccess('Contract signed successfully');
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      setSignConfirmOpen(false);
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed to sign'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => contractService.documentUpload(contractId, file, uploadType),
    onSuccess: () => {
      toastSuccess('Document uploaded');
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Upload failed'),
  });

  const addMilestoneMutation = useMutation({
    mutationFn: (data: { title: string; due_date: string }) =>
      contractService.milestoneCreate({ contract_id: contractId, title: data.title, due_date: data.due_date }),
    onSuccess: () => {
      toastSuccess('Milestone added');
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      setNewMilestone(null);
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: MilestoneStatus }) =>
      contractService.milestoneUpdate({ id, status, notes: '' }),
    onSuccess: () => {
      toastSuccess('Milestone updated');
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  const submitRatingMutation = useMutation({
    mutationFn: () => ratingService.create({
      contract_id: contractId,
      quality_score: ratingForm.quality_score,
      delivery_score: ratingForm.delivery_score,
      communication_score: ratingForm.communication_score,
      compliance_score: ratingForm.compliance_score,
      comments: ratingForm.comments.trim() || undefined,
    }),
    onSuccess: () => {
      toastSuccess('Rating submitted');
      queryClient.invalidateQueries({ queryKey: ['rating-by-contract', contractId] });
      setRatingModalOpen(false);
      setRatingForm({ quality_score: 1, delivery_score: 1, communication_score: 1, compliance_score: 1, comments: '' });
    },
    onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
  });

  // Computed
  if (isLoading || !contract) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const bothSigned = contract.signed_by_admin && contract.signed_by_supplier;
  const canRate = contract.status === 'completed' && !contractRating;
  const canSign = !contract.signed_by_admin && !['completed', 'terminated'].includes(contract.status);
  
  const overallLive = [
    ratingForm.quality_score, 
    ratingForm.delivery_score, 
    ratingForm.communication_score, 
    ratingForm.compliance_score
  ].every(s => s >= 1)
    ? ((ratingForm.quality_score + ratingForm.delivery_score + ratingForm.communication_score + ratingForm.compliance_score) / 4).toFixed(1)
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Back Link */}
      <Link 
        to="/admin/contracts" 
        className="mb-4 inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Contracts
      </Link>

      {/* Status Workflow Bar */}
      <StatusWorkflowBar status={contract.status} />

      {/* Contract Header Card */}
      <ContractHeaderCard contract={contract} />

      {/* Status Banner */}
      {bothSigned && contract.status === 'active' && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <Check className="mr-2 inline h-5 w-5" />
          <strong>Contract Fully Executed</strong> — Both parties have signed. Contract is now Active.
        </div>
      )}

      {contract.status === 'terminated' && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertTriangle className="mr-2 inline h-5 w-5" />
          <strong>This contract was terminated.</strong>
        </div>
      )}

      {contract.status === 'completed' && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <Check className="mr-2 inline h-5 w-5" />
          <strong>This contract was successfully completed.</strong>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column - 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Contract Details */}
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="border-b border-slate-100 pb-3 text-base font-semibold">Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { label: 'Contract Number', value: contract.contract_number },
                    { label: 'Contract Value', value: formatCurrency(contract.contract_value) },
                    { label: 'Start Date', value: formatDate(contract.start_date) },
                    { label: 'End Date', value: formatDate(contract.end_date) },
                    { label: 'Linked Tender', value: contract.tender_title, link: `/admin/tenders/${contract.tender_id}` },
                    { label: 'Supplier', value: `${contract.company_name} (${contract.supplier_name})`, link: `/admin/suppliers/${contract.supplier_id}` },
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-6 py-3 text-xs font-medium uppercase text-slate-500">{row.label}</td>
                      <td className="px-6 py-3 text-slate-700">
                        {row.link ? (
                          <Link to={row.link} className="text-blue-600 hover:underline">{row.value}</Link>
                        ) : row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Signature Blocks */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SignatureBlock
              title="Company Representative"
              signed={contract.signed_by_admin}
              signedAt={contract.admin_signed_at || undefined}
              name="System Admin"
              role="Procurement Officer"
              canSign={canSign}
              onSign={() => setSignConfirmOpen(true)}
              isSigning={signMutation.isPending}
            />
            <SignatureBlock
              title="Supplier Representative"
              signed={contract.signed_by_supplier}
              signedAt={contract.supplier_signed_at || undefined}
              name={contract.supplier_name || '—'}
            />
          </div>

          {bothSigned && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <Check className="mx-auto h-8 w-8 text-green-500" />
              <p className="mt-2 font-semibold text-green-700">Contract Fully Executed</p>
              <p className="text-sm text-green-600">Both parties have signed. Contract is now Active.</p>
            </div>
          )}

          {/* Description */}
          {contract.description && (
            <Card className="border border-slate-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{contract.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Milestone Timeline */}
          <MilestoneTimeline
            milestones={contract.milestones}
            onAdd={() => setNewMilestone({ title: '', due_date: '' })}
            onUpdate={(mid, status) => updateMilestoneMutation.mutate({ id: mid, status })}
            isAdding={!!newMilestone}
          />

          {newMilestone && (
            <Card className="border border-slate-200 bg-slate-50">
              <CardContent className="flex gap-2 p-4">
                <Input
                  placeholder="Milestone title"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone(p => p ? { ...p, title: e.target.value } : null)}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={newMilestone.due_date}
                  onChange={(e) => setNewMilestone(p => p ? { ...p, due_date: e.target.value } : null)}
                  className="w-40"
                />
                <Button
                  size="sm"
                  onClick={() => addMilestoneMutation.mutate(newMilestone)}
                  disabled={!newMilestone.title.trim() || !newMilestone.due_date || addMilestoneMutation.isPending}
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setNewMilestone(null)}>
                  Cancel
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Documents with Drag & Drop */}
          <DocumentUpload
            documents={contract.documents}
            uploadType={uploadType}
            setUploadType={setUploadType}
            onUpload={(file) => uploadMutation.mutate(file)}
            isUploading={uploadMutation.isPending}
            onDelete={() => {}}
          />

          {/* Rating (if completed) */}
          {contract.status === 'completed' && contractRating && (
            <Card className="border border-slate-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Performance Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <RatingBreakdown singleRating={contractRating} showOverall={true} />
                {contractRating.comments && (
                  <p className="mt-4 text-sm text-slate-600"><strong>Comments:</strong> {contractRating.comments}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          {/* Contract Health */}
          <ContractHealthCard contract={contract} rating={contractRating} />

          {/* Quick Actions */}
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to={`/admin/contracts/${contractId}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit Contract
                </Link>
              </Button>
              
              <Button variant="outline" className="w-full justify-start" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print Contract
              </Button>
            </CardContent>
          </Card>

          {/* Rating CTA */}
          {canRate && (
            <Card className="border border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">Rate Supplier Performance</p>
                    <p className="text-sm text-amber-700">This contract is complete. Rate the supplier's performance.</p>
                    <Button className="mt-3" size="sm" onClick={() => setRatingModalOpen(true)}>
                      <Star className="mr-1 h-3 w-3" /> Rate Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {ratingModalOpen && contract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRatingModalOpen(false)}>
          <Card className="w-full max-w-[500px] animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Rate {contract.company_name}</CardTitle>
                <p className="mt-1 text-sm font-mono text-slate-500">{contract.contract_number} · {contract.tender_title}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setRatingModalOpen(false)}>×</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'quality_score' as const, label: 'Quality of Work/Goods' },
                { key: 'delivery_score' as const, label: 'Delivery & Timeliness' },
                { key: 'communication_score' as const, label: 'Communication & Responsiveness' },
                { key: 'compliance_score' as const, label: 'Contract Compliance' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label className="text-sm">{label}</Label>
                  <StarRating
                    value={ratingForm[key]}
                    onChange={(v) => setRatingForm((p) => ({ ...p, [key]: v }))}
                    size="md"
                    showValue={false}
                  />
                </div>
              ))}
              {overallLive && (
                <p className="text-sm font-medium text-slate-700">Overall: {overallLive} / 5</p>
              )}
              <div>
                <Label>Additional comments (optional)</Label>
                <textarea
                  value={ratingForm.comments}
                  onChange={(e) => setRatingForm((p) => ({ ...p, comments: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRatingModalOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => submitRatingMutation.mutate()}
                  disabled={
                    ratingForm.quality_score < 1 || ratingForm.delivery_score < 1 || 
                    ratingForm.communication_score < 1 || ratingForm.compliance_score < 1 || 
                    submitRatingMutation.isPending
                  }
                >
                  {submitRatingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sign Confirmation Modal */}
      {signConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSignConfirmOpen(false)}>
          <Card className="w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Confirm Contract Signature</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                By clicking confirm, you are digitally signing this contract on behalf of the company. This action cannot be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSignConfirmOpen(false)}>Cancel</Button>
                <Button onClick={() => signMutation.mutate()} disabled={signMutation.isPending}>
                  {signMutation.isPending ? 'Signing...' : 'Confirm & Sign'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
