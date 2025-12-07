import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  CheckCircle,
  Clock,
  DollarSign,
  LogOut,
  Settings,
  MapPin,
  Calendar,
  AlertCircle,
  Play,
  FileText,
  Star,
  Building2,
  Eye,
  X,
  Send,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

const JOB_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING_DISPATCH: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  DISPATCHED: { label: 'New Request', color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { label: 'Accepted', color: 'bg-purple-100 text-purple-700' },
  QUOTE_SUBMITTED: { label: 'Quote Sent', color: 'bg-amber-100 text-amber-700' },
  QUOTE_APPROVED: { label: 'Quote Approved', color: 'bg-indigo-100 text-indigo-700' },
  QUOTE_DECLINED: { label: 'Quote Declined', color: 'bg-red-100 text-red-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-cyan-100 text-cyan-700' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700' },
  DISPUTED: { label: 'Disputed', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
};

interface JobDetailModalProps {
  job: any;
  open: boolean;
  onClose: () => void;
  vendorProfileId: string;
  onActionComplete: () => void;
}

function JobDetailModal({
  job,
  open,
  onClose,
  vendorProfileId,
  onActionComplete,
}: JobDetailModalProps) {
  const queryClient = useQueryClient();
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [actualAmount, setActualAmount] = useState('');

  // Accept job mutation
  const acceptJobMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/marketplace/jobs/${job.id}/accept`, {
        vendorProfileId,
        estimatedArrivalMinutes: 60,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-available-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-active-jobs'] });
      onActionComplete();
      onClose();
    },
  });

  // Decline job mutation
  const declineJobMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/marketplace/jobs/${job.id}/decline`, {
        vendorProfileId,
        reason: 'Unable to take this job at this time',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-available-jobs'] });
      onActionComplete();
      onClose();
    },
  });

  // Submit quote mutation
  const submitQuoteMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/marketplace/jobs/${job.id}/quote`, {
        vendorProfileId,
        quotedAmount: parseFloat(quoteAmount),
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        notes: quoteNotes || undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-available-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-active-jobs'] });
      setShowQuoteForm(false);
      setQuoteAmount('');
      setQuoteNotes('');
      setEstimatedHours('');
      onActionComplete();
      onClose();
    },
  });

  // Start job mutation
  const startJobMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/marketplace/jobs/${job.id}/start`, {
        vendorProfileId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-active-jobs'] });
      onActionComplete();
    },
  });

  // Complete job mutation
  const completeJobMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/marketplace/jobs/${job.id}/complete`, {
        vendorProfileId,
        actualTotal: actualAmount ? parseFloat(actualAmount) : undefined,
        completionNotes: completionNotes || undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-active-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-completed-jobs'] });
      setShowCompleteForm(false);
      setActualAmount('');
      setCompletionNotes('');
      onActionComplete();
      onClose();
    },
  });

  if (!job) {
    return null;
  }

  const statusInfo = JOB_STATUS_LABELS[job.status] || {
    label: job.status,
    color: 'bg-gray-100 text-gray-700',
  };

  const canAccept = job.status === 'DISPATCHED';
  const canSubmitQuote = job.status === 'ACCEPTED';
  const canStart = job.status === 'QUOTE_APPROVED';
  const canComplete = job.status === 'IN_PROGRESS';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                {job.workOrder?.title || 'Service Request'}
              </DialogTitle>
              <DialogDescription>
                {job.workOrder?.property?.name}
                {job.workOrder?.unit && ` - Unit ${job.workOrder.unit.unitNumber}`}
              </DialogDescription>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Job Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              {/* Property Info */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">Property</span>
                </div>
                <p className="font-medium text-blue-900">
                  {job.workOrder?.property?.name || 'N/A'}
                </p>
                {job.workOrder?.property?.address && (
                  <p className="text-sm text-blue-700">{job.workOrder.property.address}</p>
                )}
                {(job.workOrder?.property?.city || job.workOrder?.property?.state) && (
                  <p className="text-sm text-blue-700">
                    {job.workOrder.property.city}
                    {job.workOrder.property.city && job.workOrder.property.state && ', '}
                    {job.workOrder.property.state}
                  </p>
                )}
              </div>

              {/* Service Info */}
              {job.serviceCatalog && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <Wrench className="w-4 h-4" />
                    <span className="font-medium">Service Type</span>
                  </div>
                  <p className="font-medium">{job.serviceCatalog.name}</p>
                  <p className="text-sm text-gray-600">
                    Typical: ${Number(job.serviceCatalog.typicalTotalMin || 0).toFixed(0)} - $
                    {Number(job.serviceCatalog.typicalTotalMax || 0).toFixed(0)}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Estimated Amount */}
              {job.estimatedTotal && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium">Estimated Budget</span>
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    ${Number(job.estimatedTotal).toFixed(2)}
                  </p>
                </div>
              )}

              {/* Scheduled Date */}
              {job.scheduledDate && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Requested Date</span>
                  </div>
                  <p className="font-medium text-purple-900">
                    {new Date(job.scheduledDate).toLocaleDateString()}
                  </p>
                  {job.scheduledTimeSlot && (
                    <p className="text-sm text-purple-700">{job.scheduledTimeSlot}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {job.workOrder?.description && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Description</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-800">{job.workOrder.description}</p>
              </div>
            </div>
          )}

          {/* Priority */}
          {job.workOrder?.priority && (
            <div className="flex items-center gap-2">
              <AlertCircle
                className={`w-4 h-4 ${
                  job.workOrder.priority === 'EMERGENCY'
                    ? 'text-red-600'
                    : job.workOrder.priority === 'HIGH'
                      ? 'text-orange-600'
                      : 'text-gray-600'
                }`}
              />
              <span className="text-sm font-medium">Priority: {job.workOrder.priority}</span>
            </div>
          )}

          {/* Quote Form */}
          {showQuoteForm && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-4">
              <h4 className="font-medium text-amber-800 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Submit Your Quote
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quoteAmount">Quote Amount ($) *</Label>
                  <Input
                    id="quoteAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter your quote"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Optional"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quoteNotes">Notes (Optional)</Label>
                <Textarea
                  id="quoteNotes"
                  placeholder="Any additional details about your quote..."
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowQuoteForm(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => submitQuoteMutation.mutate()}
                  disabled={!quoteAmount || submitQuoteMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {submitQuoteMutation.isPending ? 'Submitting...' : 'Submit Quote'}
                </Button>
              </div>
            </div>
          )}

          {/* Complete Form */}
          {showCompleteForm && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-4">
              <h4 className="font-medium text-green-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Complete Job
              </h4>
              <div className="space-y-2">
                <Label htmlFor="actualAmount">Final Amount ($)</Label>
                <Input
                  id="actualAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Leave blank to use quoted amount"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completionNotes">Completion Notes</Label>
                <Textarea
                  id="completionNotes"
                  placeholder="Describe the work completed..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCompleteForm(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => completeJobMutation.mutate()}
                  disabled={completeJobMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {completeJobMutation.isPending ? 'Completing...' : 'Mark Complete'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {canAccept && (
            <>
              <Button
                variant="outline"
                onClick={() => declineJobMutation.mutate()}
                disabled={declineJobMutation.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {declineJobMutation.isPending ? 'Declining...' : 'Decline'}
              </Button>
              <Button
                onClick={() => acceptJobMutation.mutate()}
                disabled={acceptJobMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {acceptJobMutation.isPending ? 'Accepting...' : 'Accept Job'}
              </Button>
            </>
          )}

          {canSubmitQuote && !showQuoteForm && (
            <Button
              onClick={() => setShowQuoteForm(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Quote
            </Button>
          )}

          {canStart && (
            <Button
              onClick={() => startJobMutation.mutate()}
              disabled={startJobMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              {startJobMutation.isPending ? 'Starting...' : 'Start Work'}
            </Button>
          )}

          {canComplete && !showCompleteForm && (
            <Button
              onClick={() => setShowCompleteForm(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Job
            </Button>
          )}

          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JobCard({ job, onViewDetails }: { job: any; onViewDetails: (job: any) => void }) {
  const statusInfo = JOB_STATUS_LABELS[job.status] || {
    label: job.status,
    color: 'bg-gray-100 text-gray-700',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium">{job.workOrder?.title || 'Service Request'}</h4>
              <p className="text-sm text-gray-500">
                {job.workOrder?.property?.name}
                {job.workOrder?.unit && ` - Unit ${job.workOrder.unit.unitNumber}`}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Location */}
          {(job.workOrder?.property?.city || job.workOrder?.property?.state) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>
                {job.workOrder.property.city}
                {job.workOrder.property.city && job.workOrder.property.state && ', '}
                {job.workOrder.property.state}
              </span>
            </div>
          )}

          {/* Service Type */}
          {job.serviceCatalog && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Wrench className="w-4 h-4" />
              <span>{job.serviceCatalog.name}</span>
            </div>
          )}

          {/* Budget/Quote */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-700">
                {job.quotedAmount
                  ? `Quote: $${Number(job.quotedAmount).toFixed(2)}`
                  : job.estimatedTotal
                    ? `Est: $${Number(job.estimatedTotal).toFixed(2)}`
                    : 'No estimate'}
              </span>
            </div>
            {job.scheduledDate && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{new Date(job.scheduledDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Priority Badge */}
          {job.workOrder?.priority && ['EMERGENCY', 'HIGH'].includes(job.workOrder.priority) && (
            <div
              className={`flex items-center gap-1 text-xs ${
                job.workOrder.priority === 'EMERGENCY'
                  ? 'text-red-600 bg-red-50'
                  : 'text-orange-600 bg-orange-50'
              } px-2 py-1 rounded`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>{job.workOrder.priority} Priority</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(job)}
              className="w-full"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VendorDashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('available');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobDetail, setShowJobDetail] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fetch vendor profile
  const { data: vendorProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['vendor-profile', user?.id],
    queryFn: async () => {
      const response = await api.get(`/vendors/me`);
      return response.data.data;
    },
    enabled: !!user,
  });

  // Fetch vendor marketplace profile
  const { data: marketplaceProfile } = useQuery({
    queryKey: ['vendor-marketplace-profile', vendorProfile?.id],
    queryFn: async () => {
      const response = await api.get(`/marketplace/vendors/by-vendor/${vendorProfile.id}`);
      return response.data.data;
    },
    enabled: !!vendorProfile?.id,
  });

  // Fetch available jobs
  const { data: availableJobs, isLoading: availableJobsLoading } = useQuery({
    queryKey: ['vendor-available-jobs'],
    queryFn: async () => {
      const response = await api.get('/marketplace/jobs/available');
      return response.data.data || [];
    },
    enabled: !!marketplaceProfile,
  });

  // Fetch active jobs
  const { data: activeJobs, isLoading: activeJobsLoading } = useQuery({
    queryKey: ['vendor-active-jobs'],
    queryFn: async () => {
      const response = await api.get('/marketplace/jobs/my-active');
      return response.data.data || [];
    },
    enabled: !!marketplaceProfile,
  });

  // Fetch completed jobs
  const { data: completedJobs, isLoading: completedJobsLoading } = useQuery({
    queryKey: ['vendor-completed-jobs'],
    queryFn: async () => {
      const response = await api.get('/marketplace/jobs/my-completed');
      return response.data.data || [];
    },
    enabled: !!marketplaceProfile,
  });

  const handleViewJobDetails = (job: any) => {
    setSelectedJob(job);
    setShowJobDetail(true);
  };

  const handleActionComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['vendor-available-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-active-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-completed-jobs'] });
  };

  // Calculate earnings
  const totalEarnings = (completedJobs || []).reduce(
    (sum: number, job: any) => sum + Number(job.actualTotal || job.quotedAmount || 0),
    0,
  );

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

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
                {vendorProfile?.companyName && ` - ${vendorProfile.companyName}`}
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
                <div className="text-3xl font-bold text-gray-900">{activeJobs?.length || 0}</div>
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
                <div className="text-3xl font-bold text-gray-900">{completedJobs?.length || 0}</div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">
                  ${totalEarnings.toLocaleString()}
                </div>
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Marketplace Profile Status */}
        {!marketplaceProfile && vendorProfile && (
          <Card className="mb-8 border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5" />
                Complete Your Marketplace Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700 mb-4">
                Your vendor account is set up, but you need a marketplace profile to receive job
                opportunities. Contact your property manager to be added to the marketplace.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Rating Display */}
        {marketplaceProfile && (
          <Card className="mb-8 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                    <span className="text-2xl font-bold">
                      {marketplaceProfile.averageRating
                        ? Number(marketplaceProfile.averageRating).toFixed(1)
                        : 'New'}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium">
                      {marketplaceProfile.totalJobsCompleted || 0}
                    </span>{' '}
                    jobs completed
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {marketplaceProfile.acceptingJobs ? (
                    <span className="flex items-center gap-1 text-green-600 bg-green-100 px-3 py-1 rounded-full text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Accepting Jobs
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-500 bg-gray-100 px-3 py-1 rounded-full text-sm">
                      <X className="w-4 h-4" />
                      Not Accepting
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Jobs Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px] mb-6">
            <TabsTrigger value="available" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Available ({availableJobs?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Active ({activeJobs?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed ({completedJobs?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Available Jobs Tab */}
          <TabsContent value="available">
            {availableJobsLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading jobs...</p>
              </div>
            ) : availableJobs && availableJobs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableJobs.map((job: any) => (
                  <JobCard key={job.id} job={job} onViewDetails={handleViewJobDetails} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No available jobs</h3>
                    <p className="text-gray-600">
                      Check back soon for new service requests in your area.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Active Jobs Tab */}
          <TabsContent value="active">
            {activeJobsLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading jobs...</p>
              </div>
            ) : activeJobs && activeJobs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeJobs.map((job: any) => (
                  <JobCard key={job.id} job={job} onViewDetails={handleViewJobDetails} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No active jobs</h3>
                    <p className="text-gray-600">Accept an available job to get started.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Completed Jobs Tab */}
          <TabsContent value="completed">
            {completedJobsLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading jobs...</p>
              </div>
            ) : completedJobs && completedJobs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedJobs.map((job: any) => (
                  <JobCard key={job.id} job={job} onViewDetails={handleViewJobDetails} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No completed jobs</h3>
                    <p className="text-gray-600">Your completed jobs will appear here.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Job Detail Modal */}
      {selectedJob && marketplaceProfile && (
        <JobDetailModal
          job={selectedJob}
          open={showJobDetail}
          onClose={() => {
            setShowJobDetail(false);
            setSelectedJob(null);
          }}
          vendorProfileId={marketplaceProfile.id}
          onActionComplete={handleActionComplete}
        />
      )}
    </div>
  );
}
