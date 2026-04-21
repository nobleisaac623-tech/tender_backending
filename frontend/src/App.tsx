import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/hooks/useToast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import { LandingPage } from '@/pages/LandingPage';
import { PublicTenderView } from '@/pages/PublicTenderView';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { SetPasswordPage } from '@/pages/auth/SetPasswordPage';
import { AccountSuspended } from '@/pages/auth/AccountSuspended';
import { AccountBlacklisted } from '@/pages/auth/AccountBlacklisted';
import { AccountRejected } from '@/pages/auth/AccountRejected';
import { AccountPending } from '@/pages/auth/AccountPending';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { SupplierLayout } from '@/components/layout/SupplierLayout';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminTenders } from '@/pages/admin/AdminTenders';
import { AdminTenderCreate } from '@/pages/admin/AdminTenderCreate';
import { AdminTenderDetail } from '@/pages/admin/AdminTenderDetail';
import { AdminSuppliers } from '@/pages/admin/AdminSuppliers';
import { AdminSupplierDetail } from '@/pages/admin/AdminSupplierDetail';
import { AdminEvaluators } from '@/pages/admin/AdminEvaluators';
import { AdminReports } from '@/pages/admin/AdminReports';
import { AdminAuditLog } from '@/pages/admin/AdminAuditLog';
import { AdminBlacklist } from '@/pages/admin/AdminBlacklist';
import { AdminCategories } from '@/pages/admin/AdminCategories';
import { AdminContracts } from '@/pages/admin/AdminContracts';
import { AdminContractCreate } from '@/pages/admin/AdminContractCreate';
import { AdminContractDetail } from '@/pages/admin/AdminContractDetail';
import { ProcureAI } from '@/pages/intelligence/ProcureAI';

import { EvaluatorDashboard } from '@/pages/evaluator/EvaluatorDashboard';
import { EvaluatorTenders } from '@/pages/evaluator/EvaluatorTenders';
import { EvaluatorTenderBids } from '@/pages/evaluator/EvaluatorTenderBids';
import { EvaluatorBidEvaluate } from '@/pages/evaluator/EvaluatorBidEvaluate';

import { SupplierDashboard } from '@/pages/supplier/SupplierDashboard';
import { SupplierTenders } from '@/pages/supplier/SupplierTenders';
import { SupplierTenderDetail } from '@/pages/supplier/SupplierTenderDetail';
import { SupplierBids } from '@/pages/supplier/SupplierBids';
import { SupplierProfile } from '@/pages/supplier/SupplierProfile';
import { SupplierContracts } from '@/pages/supplier/SupplierContracts';
import { SupplierContractDetail } from '@/pages/supplier/SupplierContractDetail';
import { SupplierPerformance } from '@/pages/supplier/SupplierPerformance';
import { SupplierNotifications } from '@/pages/supplier/SupplierNotifications';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/tender/:id" element={<PublicTenderView />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="/account-suspended" element={<AccountSuspended />} />
            <Route path="/account-blacklisted" element={<AccountBlacklisted />} />
            <Route path="/account-rejected" element={<AccountRejected />} />
            <Route path="/account-pending" element={<AccountPending />} />

            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="tenders" element={<AdminTenders />} />
              <Route path="tenders/create" element={<AdminTenderCreate />} />
              <Route path="tenders/:id" element={<AdminTenderDetail />} />
              <Route path="suppliers" element={<AdminSuppliers />} />
              <Route path="suppliers/:id" element={<AdminSupplierDetail />} />
              <Route path="evaluators" element={<AdminEvaluators />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="audit-log" element={<AdminAuditLog />} />
              <Route path="blacklist" element={<AdminBlacklist />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="contracts" element={<AdminContracts />} />
              <Route path="contracts/create" element={<AdminContractCreate />} />
              <Route path="contracts/:id" element={<AdminContractDetail />} />
              <Route path="intelligence" element={<ProcureAI />} />
            </Route>

            <Route
              path="/evaluator/dashboard"
              element={
                <ProtectedRoute allowedRoles={['evaluator']}>
                  <EvaluatorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluator/tenders"
              element={
                <ProtectedRoute allowedRoles={['evaluator']}>
                  <EvaluatorTenders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluator/tenders/:id/bids"
              element={
                <ProtectedRoute allowedRoles={['evaluator']}>
                  <EvaluatorTenderBids />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluator/bids/:id/evaluate"
              element={
                <ProtectedRoute allowedRoles={['evaluator']}>
                  <EvaluatorBidEvaluate />
                </ProtectedRoute>
              }
            />

            <Route
              path="/supplier"
              element={
                <ProtectedRoute allowedRoles={['supplier']}>
                  <SupplierLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/supplier/dashboard" replace />} />
              <Route path="dashboard" element={<SupplierDashboard />} />
              <Route path="tenders" element={<SupplierTenders />} />
              <Route path="tenders/:id" element={<SupplierTenderDetail />} />
              <Route path="bids" element={<SupplierBids />} />
              <Route path="contracts" element={<SupplierContracts />} />
              <Route path="contracts/:id" element={<SupplierContractDetail />} />
              <Route path="performance" element={<SupplierPerformance />} />
              <Route path="profile" element={<SupplierProfile />} />
              <Route path="notifications" element={<SupplierNotifications />} />
              <Route path="intelligence" element={<ProcureAI />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
