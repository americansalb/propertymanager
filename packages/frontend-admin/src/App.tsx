import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './components/layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import PropertiesPage from './pages/PropertiesPage';
import LeasesPage from './pages/LeasesPage';
import FinancialPage from './pages/FinancialPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import VendorsPage from './pages/VendorsPage';
import ActivityPage from './pages/ActivityPage';
import CalendarPage from './pages/CalendarPage';
import ReportsPage from './pages/ReportsPage';
import { QADashboard } from './pages/QADashboard';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/*"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/properties" element={<PropertiesPage />} />
                <Route path="/leases" element={<LeasesPage />} />
                <Route path="/financial" element={<FinancialPage />} />
                <Route path="/work-orders" element={<WorkOrdersPage />} />
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/reports" element={<ReportsPage />} />
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
