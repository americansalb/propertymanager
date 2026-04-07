import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import RegisterPage from './pages/RegisterPage';
import VendorRegisterPage from './pages/VendorRegisterPage';
import MarketplaceBrowsePage from './pages/MarketplaceBrowsePage';
import VendorDashboardPage from './pages/VendorDashboardPage';
import DashboardLayout from './components/layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import LeasesPage from './pages/LeasesPage';
import LeaseDetailPage from './pages/LeaseDetailPage';
import TenantsPage from './pages/TenantsPage';
import FinancialPage from './pages/FinancialPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import VendorsPage from './pages/VendorsPage';
import VendorDetailPage from './pages/VendorDetailPage';
import MarketplacePage from './pages/MarketplacePage';
import ActivityPage from './pages/ActivityPage';
import CalendarPage from './pages/CalendarPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import DocumentsPage from './pages/DocumentsPage';
import NotificationsPage from './pages/NotificationsPage';
import TenantPortalPage from './pages/TenantPortalPage';
import ExportPage from './pages/ExportPage';
import { QADashboard } from './pages/QADashboard';
import LakeviewApplicationPage from './pages/LakeviewApplicationPage';
import ManageApplicantsPage from './pages/ManageApplicantsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      {/* Public routes - no authentication required */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/vendor-register" element={<VendorRegisterPage />} />
      <Route path="/marketplace-browse" element={<MarketplaceBrowsePage />} />
      <Route path="/lakeview" element={<LakeviewApplicationPage />} />
      <Route path="/manageapplicants" element={<ManageApplicantsPage />} />

      {/* Vendor portal route */}
      <Route
        path="/vendor-dashboard"
        element={
          <PrivateRoute>
            <VendorDashboardPage />
          </PrivateRoute>
        }
      />

      {/* Protected admin routes */}
      <Route
        path="/dashboard/*"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/properties" element={<PropertiesPage />} />
                <Route path="/properties/:id" element={<PropertyDetailPage />} />
                <Route path="/leases" element={<LeasesPage />} />
                <Route path="/leases/:id" element={<LeaseDetailPage />} />
                <Route path="/tenants" element={<TenantsPage />} />
                <Route path="/financial" element={<FinancialPage />} />
                <Route path="/work-orders" element={<WorkOrdersPage />} />
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/vendors/:id" element={<VendorDetailPage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/tenant-preview" element={<TenantPortalPage />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/qa" element={<QADashboard />} />
              </Routes>
            </DashboardLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
