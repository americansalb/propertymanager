import { useQuery } from '@tanstack/react-query';
import { Package, CheckCircle, Clock, DollarSign, LogOut, User, Settings } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function VendorDashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery({
    queryKey: ['vendor-profile', user?.id],
    queryFn: async () => {
      const response = await api.get(`/vendors/me`);
      return response.data.data;
    },
    enabled: !!user,
  });

  // Fetch available jobs
  const { data: availableJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['vendor-available-jobs'],
    queryFn: async () => {
      const response = await api.get('/marketplace/jobs/available');
      return response.data.data || [];
    },
    enabled: !!vendorProfile,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Available Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">{availableJobs?.length || 0}</div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">0</div>
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">0</div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Earnings (This Month)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">$0</div>
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Message / Getting Started */}
        <Card className="mb-8 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Welcome to Your Vendor Portal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-700">
              Your vendor account has been successfully created! Here's what you can do:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>View and accept available service requests from property managers</li>
              <li>Track your active jobs and update their status</li>
              <li>Submit quotes and completion reports</li>
              <li>Manage your earnings and payment information</li>
            </ul>
            <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                🚧 Your dashboard is being set up
              </p>
              <p className="text-sm text-gray-600">
                The marketplace job system is currently in development. You'll be notified when new
                job opportunities become available. In the meantime, make sure your profile and
                service offerings are complete.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Available Jobs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Available Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading jobs...</p>
              </div>
            ) : availableJobs && availableJobs.length > 0 ? (
              <div className="space-y-4">
                {availableJobs.map((job: any) => (
                  <Card key={job.id} className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">{job.description}</p>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm">View Details</Button>
                        <Button size="sm" variant="outline">
                          Accept Job
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs available</h3>
                <p className="text-gray-600">
                  Check back soon for new service requests in your area.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
