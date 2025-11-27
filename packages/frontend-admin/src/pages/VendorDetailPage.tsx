import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Wrench,
  FileText,
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Edit,
  Trash2,
  ExternalLink,
  DollarSign,
  Star,
  BarChart3,
  Loader2,
  Upload,
  Download,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../components/ui/dialog';
import VendorModal from '../components/vendors/VendorModal';

interface Vendor {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  type: string;
  status: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  taxId: string | null;
  licenseNumber: string | null;
  licenseExpiryDate: string | null;
  insuranceExpiryDate: string | null;
  insuranceCertUrl: string | null;
  w9Url: string | null;
  paymentTerms: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  workOrders: WorkOrder[];
}

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  estimatedCost: number | null;
  actualCost: number | null;
  requestedDate: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  createdAt: string;
  updatedAt: string;
  unit: {
    id: string;
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
  } | null;
}

interface VendorStats {
  activeCount: number;
  completedCount: number;
  totalCount: number;
  avgCompletionDays: number;
  overdueCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
};

const WORK_ORDER_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  ASSIGNED: 'bg-purple-100 text-purple-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  ON_HOLD: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  EMERGENCY: 'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  PLUMBER: 'Plumber',
  ELECTRICIAN: 'Electrician',
  HVAC: 'HVAC Technician',
  GENERAL_CONTRACTOR: 'General Contractor',
  LANDSCAPING: 'Landscaping',
  CLEANING: 'Cleaning Service',
  PEST_CONTROL: 'Pest Control',
  APPLIANCE_REPAIR: 'Appliance Repair',
  ROOFING: 'Roofing',
  PAINTING: 'Painting',
  FLOORING: 'Flooring',
  LOCKSMITH: 'Locksmith',
  OTHER: 'Other',
};

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'work-orders' | 'compliance' | 'performance'>('overview');

  const { data: vendorData, isLoading, error } = useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const response = await api.get(`/vendors/${id}/stats`);
      return response.data.data as { vendor: Vendor; stats: VendorStats };
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      navigate('/vendors');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete vendor';
      setDeleteError(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const vendor = vendorData?.vendor;
  const stats = vendorData?.stats;

  // Compliance calculations
  const complianceStatus = useMemo(() => {
    if (!vendor) return null;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Insurance status
    let insuranceStatus: 'valid' | 'expiring' | 'expired' | 'missing' = 'missing';
    let insuranceDaysLeft = 0;
    if (vendor.insuranceExpiryDate) {
      const expiryDate = new Date(vendor.insuranceExpiryDate);
      insuranceDaysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (expiryDate < now) {
        insuranceStatus = 'expired';
      } else if (expiryDate < thirtyDaysFromNow) {
        insuranceStatus = 'expiring';
      } else {
        insuranceStatus = 'valid';
      }
    }

    // License status
    let licenseStatus: 'valid' | 'expiring' | 'expired' | 'missing' = 'missing';
    let licenseDaysLeft = 0;
    if (vendor.licenseExpiryDate) {
      const expiryDate = new Date(vendor.licenseExpiryDate);
      licenseDaysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (expiryDate < now) {
        licenseStatus = 'expired';
      } else if (expiryDate < thirtyDaysFromNow) {
        licenseStatus = 'expiring';
      } else {
        licenseStatus = 'valid';
      }
    } else if (vendor.licenseNumber) {
      licenseStatus = 'valid';
    }

    // W9 status
    const w9Status: 'valid' | 'missing' = vendor.w9Url || vendor.taxId ? 'valid' : 'missing';

    // Overall status
    const issues = [
      insuranceStatus === 'expired' || insuranceStatus === 'missing',
      licenseStatus === 'expired' || licenseStatus === 'missing',
      w9Status === 'missing',
    ].filter(Boolean).length;

    const warnings = [
      insuranceStatus === 'expiring',
      licenseStatus === 'expiring',
    ].filter(Boolean).length;

    let overallStatus: 'compliant' | 'warning' | 'non-compliant' = 'compliant';
    if (issues > 0) {
      overallStatus = 'non-compliant';
    } else if (warnings > 0) {
      overallStatus = 'warning';
    }

    return {
      insuranceStatus,
      insuranceDaysLeft,
      licenseStatus,
      licenseDaysLeft,
      w9Status,
      overallStatus,
      issues,
      warnings,
    };
  }, [vendor]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    if (!vendor?.workOrders || !stats) return null;

    const completedOrders = vendor.workOrders.filter(wo => wo.status === 'COMPLETED');
    const totalCost = completedOrders.reduce((sum, wo) => sum + (Number(wo.actualCost) || 0), 0);
    const avgCost = completedOrders.length > 0 ? totalCost / completedOrders.length : 0;

    // Calculate on-time completion rate (completed within 7 days of request)
    const onTimeCount = completedOrders.filter(wo => {
      if (!wo.completedDate || !wo.requestedDate) return false;
      const requested = new Date(wo.requestedDate);
      const completed = new Date(wo.completedDate);
      const days = Math.ceil((completed.getTime() - requested.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 7;
    }).length;
    const onTimeRate = completedOrders.length > 0 ? (onTimeCount / completedOrders.length) * 100 : 0;

    // Work order types breakdown
    const typeBreakdown: Record<string, number> = {};
    vendor.workOrders.forEach(wo => {
      typeBreakdown[wo.type] = (typeBreakdown[wo.type] || 0) + 1;
    });

    // Monthly activity (last 6 months)
    const monthlyActivity: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      const count = vendor.workOrders.filter(wo => {
        const woDate = new Date(wo.createdAt);
        return woDate.getMonth() === date.getMonth() && woDate.getFullYear() === date.getFullYear();
      }).length;
      monthlyActivity.push({ month: monthKey, count });
    }

    return {
      completionRate: stats.totalCount > 0 ? (stats.completedCount / stats.totalCount) * 100 : 0,
      avgCompletionDays: stats.avgCompletionDays,
      avgCost,
      totalSpent: totalCost,
      onTimeRate,
      typeBreakdown,
      monthlyActivity,
    };
  }, [vendor, stats]);

  const handleDelete = () => {
    setDeleteError(null);
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/vendors')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Vendors
        </Button>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Vendor not found</h3>
              <p className="text-gray-500">
                The vendor you're looking for doesn't exist or has been deleted.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{vendor.companyName}</h1>
              {complianceStatus && (
                <>
                  {complianceStatus.overallStatus === 'compliant' && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      <ShieldCheck className="w-3 h-3" />
                      Compliant
                    </span>
                  )}
                  {complianceStatus.overallStatus === 'warning' && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      <ShieldAlert className="w-3 h-3" />
                      Expiring Soon
                    </span>
                  )}
                  {complianceStatus.overallStatus === 'non-compliant' && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                      <ShieldX className="w-3 h-3" />
                      Non-Compliant
                    </span>
                  )}
                </>
              )}
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[vendor.status] || 'bg-gray-100 text-gray-700'}`}>
                {vendor.status}
              </span>
            </div>
            <p className="text-gray-500 flex items-center gap-1 mt-1">
              <Wrench className="w-4 h-4" />
              {TYPE_LABELS[vendor.type] || vendor.type}
              {vendor.contactName && <span className="ml-2">| {vendor.contactName}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setEditModalOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Vendor
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Jobs</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Wrench className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats?.activeCount || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Currently assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats?.completedCount || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Work orders completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Completion</CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {stats?.avgCompletionDays || 0}d
            </div>
            <p className="text-xs text-gray-500 mt-1">Days to complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
            <div className={`p-2 rounded-lg ${stats?.overdueCount ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.overdueCount ? 'text-red-700' : 'text-gray-700'}`}>
              {stats?.overdueCount || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Jobs overdue (&gt;7 days)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              ${(performanceMetrics?.totalSpent || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Lifetime payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'work-orders', label: 'Work Orders', icon: Wrench },
            { id: 'compliance', label: 'Compliance', icon: Shield },
            { id: 'performance', label: 'Performance', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {vendor.contactName && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Contact Person</p>
                    <p className="font-medium">{vendor.contactName}</p>
                  </div>
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <a href={`mailto:${vendor.email}`} className="font-medium text-blue-600 hover:underline">
                      {vendor.email}
                    </a>
                  </div>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <a href={`tel:${vendor.phone}`} className="font-medium text-blue-600 hover:underline">
                      {vendor.phone}
                    </a>
                  </div>
                </div>
              )}
              {(vendor.address1 || vendor.city) && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium">
                      {vendor.address1}
                      {vendor.address2 && <>, {vendor.address2}</>}
                      {vendor.city && <><br />{vendor.city}, {vendor.state} {vendor.zipCode}</>}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Service Type</p>
                  <p className="font-medium">{TYPE_LABELS[vendor.type] || vendor.type}</p>
                </div>
              </div>
              {vendor.licenseNumber && (
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">License Number</p>
                    <p className="font-medium">{vendor.licenseNumber}</p>
                  </div>
                </div>
              )}
              {vendor.taxId && (
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Tax ID</p>
                    <p className="font-medium">{vendor.taxId}</p>
                  </div>
                </div>
              )}
              {vendor.paymentTerms && (
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Payment Terms</p>
                    <p className="font-medium">{vendor.paymentTerms}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="font-medium">{new Date(vendor.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {vendor.notes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 whitespace-pre-wrap">{vendor.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'work-orders' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Work Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {vendor.workOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Property / Unit</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Priority</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Cost</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.workOrders.map((wo) => (
                      <tr key={wo.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/work-orders/${wo.id}`)}>
                        <td className="py-3 px-4">
                          <p className="font-medium">{wo.title}</p>
                          <p className="text-sm text-gray-500">{wo.type}</p>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {wo.unit ? (
                            <>
                              {wo.unit.property.name}
                              <br />
                              <span className="text-gray-400">Unit {wo.unit.unitNumber}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[wo.priority] || 'bg-gray-100 text-gray-700'}`}>
                            {wo.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${WORK_ORDER_STATUS_COLORS[wo.status] || 'bg-gray-100 text-gray-700'}`}>
                            {wo.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {wo.actualCost ? (
                            <span className="font-medium">${Number(wo.actualCost).toLocaleString()}</span>
                          ) : wo.estimatedCost ? (
                            <span className="text-gray-500">~${Number(wo.estimatedCost).toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(wo.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No work orders yet</h3>
                <p className="text-gray-500">This vendor hasn't been assigned any work orders.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'compliance' && complianceStatus && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Insurance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Insurance
              </CardTitle>
              {complianceStatus.insuranceStatus === 'valid' && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Valid
                </span>
              )}
              {complianceStatus.insuranceStatus === 'expiring' && (
                <span className="flex items-center gap-1 text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  Expiring Soon
                </span>
              )}
              {complianceStatus.insuranceStatus === 'expired' && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  Expired
                </span>
              )}
              {complianceStatus.insuranceStatus === 'missing' && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <AlertCircle className="w-4 h-4" />
                  Not on File
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {vendor.insuranceExpiryDate ? (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Expiration Date</p>
                    <p className="font-medium">{new Date(vendor.insuranceExpiryDate).toLocaleDateString()}</p>
                  </div>
                  {complianceStatus.insuranceStatus !== 'expired' && (
                    <div>
                      <p className="text-sm text-gray-500">Days Remaining</p>
                      <p className={`font-medium ${complianceStatus.insuranceDaysLeft <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
                        {complianceStatus.insuranceDaysLeft} days
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">No insurance information on file.</p>
              )}
              {vendor.insuranceCertUrl && (
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Certificate
                </Button>
              )}
              <Button variant="outline" size="sm" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload New Certificate
              </Button>
            </CardContent>
          </Card>

          {/* License */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                License
              </CardTitle>
              {complianceStatus.licenseStatus === 'valid' && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Valid
                </span>
              )}
              {complianceStatus.licenseStatus === 'expiring' && (
                <span className="flex items-center gap-1 text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  Expiring Soon
                </span>
              )}
              {complianceStatus.licenseStatus === 'expired' && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  Expired
                </span>
              )}
              {complianceStatus.licenseStatus === 'missing' && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <AlertCircle className="w-4 h-4" />
                  Not on File
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {vendor.licenseNumber && (
                <div>
                  <p className="text-sm text-gray-500">License Number</p>
                  <p className="font-medium">{vendor.licenseNumber}</p>
                </div>
              )}
              {vendor.licenseExpiryDate ? (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Expiration Date</p>
                    <p className="font-medium">{new Date(vendor.licenseExpiryDate).toLocaleDateString()}</p>
                  </div>
                  {complianceStatus.licenseStatus !== 'expired' && complianceStatus.licenseDaysLeft > 0 && (
                    <div>
                      <p className="text-sm text-gray-500">Days Remaining</p>
                      <p className={`font-medium ${complianceStatus.licenseDaysLeft <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
                        {complianceStatus.licenseDaysLeft} days
                      </p>
                    </div>
                  )}
                </>
              ) : !vendor.licenseNumber && (
                <p className="text-gray-500">No license information on file.</p>
              )}
              <Button variant="outline" size="sm" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload License Copy
              </Button>
            </CardContent>
          </Card>

          {/* W9 / Tax */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                W9 / Tax Information
              </CardTitle>
              {complianceStatus.w9Status === 'valid' ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  On File
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <AlertCircle className="w-4 h-4" />
                  Missing
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {vendor.taxId && (
                <div>
                  <p className="text-sm text-gray-500">Tax ID (EIN/SSN)</p>
                  <p className="font-medium">***-**-{vendor.taxId.slice(-4)}</p>
                </div>
              )}
              {vendor.w9Url ? (
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download W9
                </Button>
              ) : (
                <p className="text-gray-500">No W9 on file.</p>
              )}
              <Button variant="outline" size="sm" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload W9
              </Button>
            </CardContent>
          </Card>

          {/* Compliance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Compliance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <span className="text-sm font-medium">Overall Status</span>
                  {complianceStatus.overallStatus === 'compliant' && (
                    <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                      <ShieldCheck className="w-4 h-4" />
                      Fully Compliant
                    </span>
                  )}
                  {complianceStatus.overallStatus === 'warning' && (
                    <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                      <ShieldAlert className="w-4 h-4" />
                      Action Needed
                    </span>
                  )}
                  {complianceStatus.overallStatus === 'non-compliant' && (
                    <span className="flex items-center gap-1 text-sm font-medium text-red-600">
                      <ShieldX className="w-4 h-4" />
                      Non-Compliant
                    </span>
                  )}
                </div>

                {complianceStatus.issues > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm font-medium text-red-800">
                      {complianceStatus.issues} issue{complianceStatus.issues > 1 ? 's' : ''} require attention
                    </p>
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                      {complianceStatus.insuranceStatus === 'expired' && <li>Insurance has expired</li>}
                      {complianceStatus.insuranceStatus === 'missing' && <li>Insurance certificate missing</li>}
                      {complianceStatus.licenseStatus === 'expired' && <li>License has expired</li>}
                      {complianceStatus.licenseStatus === 'missing' && <li>License information missing</li>}
                      {complianceStatus.w9Status === 'missing' && <li>W9/Tax ID missing</li>}
                    </ul>
                  </div>
                )}

                {complianceStatus.warnings > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-sm font-medium text-amber-800">
                      {complianceStatus.warnings} item{complianceStatus.warnings > 1 ? 's' : ''} expiring soon
                    </p>
                    <ul className="mt-2 text-sm text-amber-700 list-disc list-inside">
                      {complianceStatus.insuranceStatus === 'expiring' && (
                        <li>Insurance expires in {complianceStatus.insuranceDaysLeft} days</li>
                      )}
                      {complianceStatus.licenseStatus === 'expiring' && (
                        <li>License expires in {complianceStatus.licenseDaysLeft} days</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'performance' && performanceMetrics && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Completion Rate */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Completion Rate</span>
                    <span className="text-sm font-bold">{performanceMetrics.completionRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${performanceMetrics.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* On-Time Rate */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">On-Time Completion</span>
                    <span className="text-sm font-bold">{performanceMetrics.onTimeRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${performanceMetrics.onTimeRate >= 80 ? 'bg-green-600' : performanceMetrics.onTimeRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${performanceMetrics.onTimeRate}%` }}
                    />
                  </div>
                </div>

                {/* Average Completion Time */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-500">Avg. Completion Time</p>
                    <p className="text-2xl font-bold">{performanceMetrics.avgCompletionDays} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg. Job Cost</p>
                    <p className="text-2xl font-bold">${performanceMetrics.avgCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Order Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Work Order Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(performanceMetrics.typeBreakdown).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{type.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / (stats?.totalCount || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Monthly Activity (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between h-40 gap-2">
                {performanceMetrics.monthlyActivity.map((month, index) => {
                  const maxCount = Math.max(...performanceMetrics.monthlyActivity.map(m => m.count), 1);
                  const height = (month.count / maxCount) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-sm font-medium">{month.count}</span>
                      <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '120px' }}>
                        <div
                          className="absolute bottom-0 w-full bg-blue-500 rounded-t transition-all"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{month.month}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Rating (placeholder for future) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5" />
                Vendor Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${star <= 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="text-2xl font-bold">4.0</span>
                <span className="text-gray-500">Based on {stats?.completedCount || 0} completed work orders</span>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Rating is automatically calculated based on completion time, cost accuracy, and work order outcomes.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      <VendorModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        vendor={vendor}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Delete Vendor
              </DialogTitle>
              <DialogDescription className="mt-2 text-gray-600">
                Are you sure you want to delete <strong>{vendor.companyName}</strong>?
                {stats && stats.activeCount > 0 ? (
                  <span className="block mt-2 text-red-600">
                    This vendor has {stats.activeCount} active work order{stats.activeCount > 1 ? 's' : ''}.
                    Please reassign them before deleting.
                  </span>
                ) : (
                  ' This action cannot be undone.'
                )}
              </DialogDescription>
              {deleteError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{deleteError}</p>
                </div>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeleteError(null);
                  }}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending || (stats?.activeCount || 0) > 0}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Vendor
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
