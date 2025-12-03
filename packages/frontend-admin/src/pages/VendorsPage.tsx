import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Mail,
  Phone,
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
  Edit,
  Shield,
  FileText,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Store,
  Star,
} from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import VendorModal from '../components/vendors/VendorModal';
import PendingVendorsSection from '../components/vendors/PendingVendorsSection';

export default function VendorsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);

  const handleAddVendor = () => {
    setSelectedVendor(null);
    setIsModalOpen(true);
  };

  const handleEditVendor = (vendor: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVendor(vendor);
    setIsModalOpen(true);
  };

  // Fetch marketplace profiles for all vendors
  const { data: marketplaceProfiles } = useQuery({
    queryKey: ['marketplace-vendor-profiles'],
    queryFn: async () => {
      const response = await api.get('/marketplace/vendors');
      return response.data.data || [];
    },
  });

  // Create marketplace profile mutation
  const createMarketplaceProfile = useMutation({
    mutationFn: async (vendorId: string) => {
      const response = await api.post('/marketplace/vendors', { vendorId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-vendor-profiles'] });
    },
  });

  // Check if a vendor has a marketplace profile
  const hasMarketplaceProfile = (vendorId: string) => {
    if (!marketplaceProfiles) {
      return false;
    }
    return marketplaceProfiles.some((p: any) => p.vendorId === vendorId);
  };

  // Get marketplace profile for a vendor
  const getMarketplaceProfile = (vendorId: string) => {
    if (!marketplaceProfiles) {
      return null;
    }
    return marketplaceProfiles.find((p: any) => p.vendorId === vendorId);
  };

  const handleEnableMarketplace = async (vendorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await createMarketplaceProfile.mutateAsync(vendorId);
  };

  const { data: vendors, isLoading: isLoadingVendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await api.get('/vendors');
      return response.data.data;
    },
  });

  const { data: workOrders } = useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
      return response.data.data;
    },
  });

  // Calculate vendor performance stats
  const vendorStats = useMemo(() => {
    if (!vendors || !workOrders) {
      return {};
    }

    const stats: Record<
      string,
      {
        activeCount: number;
        completedCount: number;
        totalCount: number;
        avgCompletionDays: number;
        overdueCount: number;
      }
    > = {};

    vendors.forEach((vendor: any) => {
      const vendorWorkOrders = workOrders.filter((wo: any) => wo.vendorId === vendor.id);

      const activeWorkOrders = vendorWorkOrders.filter(
        (wo: any) =>
          wo.status === 'ASSIGNED' || wo.status === 'IN_PROGRESS' || wo.status === 'SUBMITTED',
      );

      const completedWorkOrders = vendorWorkOrders.filter((wo: any) => wo.status === 'COMPLETED');

      // Calculate average completion time
      let totalCompletionDays = 0;
      let completedWithDates = 0;
      completedWorkOrders.forEach((wo: any) => {
        if (wo.createdAt && wo.updatedAt) {
          const created = new Date(wo.createdAt);
          const completed = new Date(wo.updatedAt);
          const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          totalCompletionDays += days;
          completedWithDates++;
        }
      });

      // Count overdue (active work orders older than 7 days)
      const now = new Date();
      const overdueWorkOrders = activeWorkOrders.filter((wo: any) => {
        const created = new Date(wo.createdAt);
        const daysSinceCreated = Math.floor(
          (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysSinceCreated > 7;
      });

      stats[vendor.id] = {
        activeCount: activeWorkOrders.length,
        completedCount: completedWorkOrders.length,
        totalCount: vendorWorkOrders.length,
        avgCompletionDays:
          completedWithDates > 0 ? Math.round(totalCompletionDays / completedWithDates) : 0,
        overdueCount: overdueWorkOrders.length,
      };
    });

    return stats;
  }, [vendors, workOrders]);

  // Portfolio-wide vendor stats
  const portfolioStats = useMemo(() => {
    if (!vendors || !workOrders) {
      return { totalVendors: 0, activeVendors: 0, totalAssigned: 0, avgCompletion: 0 };
    }

    const activeVendorIds = new Set(
      workOrders
        .filter(
          (wo: any) => wo.vendorId && (wo.status === 'ASSIGNED' || wo.status === 'IN_PROGRESS'),
        )
        .map((wo: any) => wo.vendorId),
    );

    const assignedWorkOrders = workOrders.filter((wo: any) => wo.vendorId);

    // Calculate overall average completion
    let totalDays = 0;
    let completedCount = 0;
    assignedWorkOrders
      .filter((wo: any) => wo.status === 'COMPLETED')
      .forEach((wo: any) => {
        if (wo.createdAt && wo.updatedAt) {
          const days = Math.ceil(
            (new Date(wo.updatedAt).getTime() - new Date(wo.createdAt).getTime()) /
              (1000 * 60 * 60 * 24),
          );
          totalDays += days;
          completedCount++;
        }
      });

    return {
      totalVendors: vendors.length,
      activeVendors: activeVendorIds.size,
      totalAssigned: assignedWorkOrders.length,
      avgCompletion: completedCount > 0 ? Math.round(totalDays / completedCount) : 0,
    };
  }, [vendors, workOrders]);

  const handleViewWorkOrders = (vendorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/work-orders?vendorId=${vendorId}`);
  };

  // Compliance status helper
  const getComplianceStatus = (vendor: any) => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Insurance status
    let insuranceStatus: 'valid' | 'expiring' | 'expired' | 'missing' = 'missing';
    if (vendor.insuranceExpiryDate) {
      const expiryDate = new Date(vendor.insuranceExpiryDate);
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
    if (vendor.licenseExpiryDate) {
      const expiryDate = new Date(vendor.licenseExpiryDate);
      if (expiryDate < now) {
        licenseStatus = 'expired';
      } else if (expiryDate < thirtyDaysFromNow) {
        licenseStatus = 'expiring';
      } else {
        licenseStatus = 'valid';
      }
    } else if (vendor.licenseNumber) {
      // Has license number but no expiry tracked
      licenseStatus = 'valid';
    }

    // W9 status
    const w9Status: 'valid' | 'missing' = vendor.w9Url || vendor.taxId ? 'valid' : 'missing';

    // Overall compliance score
    const issues = [
      insuranceStatus === 'expired' || insuranceStatus === 'missing',
      licenseStatus === 'expired' || licenseStatus === 'missing',
      w9Status === 'missing',
    ].filter(Boolean).length;

    const warnings = [insuranceStatus === 'expiring', licenseStatus === 'expiring'].filter(
      Boolean,
    ).length;

    let overallStatus: 'compliant' | 'warning' | 'non-compliant' = 'compliant';
    if (issues > 0) {
      overallStatus = 'non-compliant';
    } else if (warnings > 0) {
      overallStatus = 'warning';
    }

    return { insuranceStatus, licenseStatus, w9Status, overallStatus, issues, warnings };
  };

  // Portfolio compliance summary
  const complianceStats = useMemo(() => {
    if (!vendors) {
      return { compliant: 0, warning: 0, nonCompliant: 0 };
    }

    let compliant = 0;
    let warning = 0;
    let nonCompliant = 0;

    vendors.forEach((vendor: any) => {
      const status = getComplianceStatus(vendor);
      if (status.overallStatus === 'compliant') {
        compliant++;
      } else if (status.overallStatus === 'warning') {
        warning++;
      } else {
        nonCompliant++;
      }
    });

    return { compliant, warning, nonCompliant };
  }, [vendors]);

  if (isLoadingVendors) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Portal</h1>
          <p className="text-gray-500 mt-1">Manage vendors and track work order performance</p>
        </div>
        <Button onClick={handleAddVendor}>
          <Users className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Vendors</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{portfolioStats.totalVendors}</div>
            <p className="text-xs text-gray-500 mt-1">In your network</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Compliance</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-700">{complianceStats.compliant}</span>
              {complianceStats.warning > 0 && (
                <span className="text-sm text-amber-600">{complianceStats.warning} warning</span>
              )}
              {complianceStats.nonCompliant > 0 && (
                <span className="text-sm text-red-600">{complianceStats.nonCompliant} issues</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Fully compliant vendors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Vendors</CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{portfolioStats.activeVendors}</div>
            <p className="text-xs text-gray-500 mt-1">With open work orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Assigned Work Orders
            </CardTitle>
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <Wrench className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">{portfolioStats.totalAssigned}</div>
            <p className="text-xs text-gray-500 mt-1">Total vendor assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Completion</CardTitle>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {portfolioStats.avgCompletion > 0 ? `${portfolioStats.avgCompletion}d` : 'N/A'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Days to complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Vendor Approvals Section */}
      <PendingVendorsSection />

      {/* Vendor Cards with Performance */}
      {vendors && vendors.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor: any) => {
            const stats = vendorStats[vendor.id] || {
              activeCount: 0,
              completedCount: 0,
              totalCount: 0,
              avgCompletionDays: 0,
              overdueCount: 0,
            };
            const compliance = getComplianceStatus(vendor);

            return (
              <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between">
                    <span className="text-lg">{vendor.companyName}</span>
                    <div className="flex items-center gap-2">
                      {/* Overall Compliance Badge */}
                      {compliance.overallStatus === 'compliant' && (
                        <span
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700"
                          title="All compliance documents current"
                        >
                          <ShieldCheck className="w-3 h-3" />
                        </span>
                      )}
                      {compliance.overallStatus === 'warning' && (
                        <span
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700"
                          title="Documents expiring soon"
                        >
                          <ShieldAlert className="w-3 h-3" />
                        </span>
                      )}
                      {compliance.overallStatus === 'non-compliant' && (
                        <span
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700"
                          title="Missing or expired documents"
                        >
                          <ShieldX className="w-3 h-3" />
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          vendor.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : vendor.status === 'SUSPENDED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="font-medium">{vendor.type?.replace('_', ' ')}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Work Order Stats */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Wrench className="w-3 h-3 text-blue-500" />
                          <span className="text-lg font-bold text-gray-900">
                            {stats.activeCount}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Active</p>
                      </div>
                      <div className="text-center border-x border-gray-200">
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-lg font-bold text-gray-900">
                            {stats.completedCount}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Done</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span className="text-lg font-bold text-gray-900">
                            {stats.avgCompletionDays > 0 ? `${stats.avgCompletionDays}d` : '-'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Avg</p>
                      </div>
                    </div>

                    {/* Overdue Warning */}
                    {stats.overdueCount > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-700 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                          {stats.overdueCount} overdue work order{stats.overdueCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {/* Compliance Indicators */}
                    <div className="flex flex-wrap gap-2">
                      {/* Insurance Badge */}
                      <span
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                          compliance.insuranceStatus === 'valid'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : compliance.insuranceStatus === 'expiring'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : compliance.insuranceStatus === 'expired'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-gray-50 text-gray-500 border border-gray-200'
                        }`}
                        title={
                          compliance.insuranceStatus === 'valid'
                            ? `Insurance valid until ${vendor.insuranceExpiryDate ? new Date(vendor.insuranceExpiryDate).toLocaleDateString() : 'N/A'}`
                            : compliance.insuranceStatus === 'expiring'
                              ? `Insurance expiring ${vendor.insuranceExpiryDate ? new Date(vendor.insuranceExpiryDate).toLocaleDateString() : 'soon'}`
                              : compliance.insuranceStatus === 'expired'
                                ? 'Insurance has expired'
                                : 'No insurance on file'
                        }
                      >
                        <Shield className="w-3 h-3" />
                        {compliance.insuranceStatus === 'valid' && 'Insured'}
                        {compliance.insuranceStatus === 'expiring' && 'Ins. Expiring'}
                        {compliance.insuranceStatus === 'expired' && 'Ins. Expired'}
                        {compliance.insuranceStatus === 'missing' && 'No Insurance'}
                      </span>

                      {/* License Badge */}
                      <span
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                          compliance.licenseStatus === 'valid'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : compliance.licenseStatus === 'expiring'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : compliance.licenseStatus === 'expired'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-gray-50 text-gray-500 border border-gray-200'
                        }`}
                        title={
                          compliance.licenseStatus === 'valid'
                            ? `License ${vendor.licenseNumber || ''} ${vendor.licenseExpiryDate ? `valid until ${new Date(vendor.licenseExpiryDate).toLocaleDateString()}` : 'on file'}`
                            : compliance.licenseStatus === 'expiring'
                              ? `License expiring ${vendor.licenseExpiryDate ? new Date(vendor.licenseExpiryDate).toLocaleDateString() : 'soon'}`
                              : compliance.licenseStatus === 'expired'
                                ? 'License has expired'
                                : 'No license on file'
                        }
                      >
                        <FileText className="w-3 h-3" />
                        {compliance.licenseStatus === 'valid' && 'Licensed'}
                        {compliance.licenseStatus === 'expiring' && 'Lic. Expiring'}
                        {compliance.licenseStatus === 'expired' && 'Lic. Expired'}
                        {compliance.licenseStatus === 'missing' && 'No License'}
                      </span>

                      {/* W9 Badge */}
                      <span
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                          compliance.w9Status === 'valid'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-50 text-gray-500 border border-gray-200'
                        }`}
                        title={
                          compliance.w9Status === 'valid'
                            ? 'W9/Tax ID on file'
                            : 'No W9/Tax ID on file'
                        }
                      >
                        <FileText className="w-3 h-3" />
                        {compliance.w9Status === 'valid' ? 'W9' : 'No W9'}
                      </span>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 pt-2 border-t">
                      {vendor.contactName && (
                        <div className="text-sm text-gray-600">{vendor.contactName}</div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />
                          <a
                            href={`mailto:${vendor.email}`}
                            className="hover:text-primary truncate"
                          >
                            {vendor.email}
                          </a>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <a href={`tel:${vendor.phone}`} className="hover:text-primary">
                            {vendor.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Marketplace Status */}
                    {hasMarketplaceProfile(vendor.id) ? (
                      <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg border border-primary/20 mb-3">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary">On Marketplace</span>
                        </div>
                        {(() => {
                          const profile = getMarketplaceProfile(vendor.id);
                          return profile?.averageRating ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span>{Number(profile.averageRating).toFixed(1)}</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mb-3 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={(e) => handleEnableMarketplace(vendor.id, e)}
                        disabled={createMarketplaceProfile.isPending}
                      >
                        <Store className="w-4 h-4 mr-2" />
                        {createMarketplaceProfile.isPending
                          ? 'Enabling...'
                          : 'Enable on Marketplace'}
                      </Button>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => handleEditVendor(vendor, e)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      {stats.totalCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => handleViewWorkOrders(vendor.id, e)}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {stats.totalCount} WO{stats.totalCount > 1 ? 's' : ''}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors yet</h3>
              <p className="text-gray-500 mb-6">Add vendors to manage your service providers</p>
              <Button onClick={handleAddVendor}>
                <Users className="w-4 h-4 mr-2" />
                Add Your First Vendor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor Modal */}
      <VendorModal open={isModalOpen} onOpenChange={setIsModalOpen} vendor={selectedVendor} />
    </div>
  );
}
