import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function VendorsPage() {
  const navigate = useNavigate();

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
        <Button>
          <Users className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium text-gray-600">Active Vendors</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{portfolioStats.activeVendors}</div>
            <p className="text-xs text-gray-500 mt-1">With open work orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Assigned Work Orders
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Wrench className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{portfolioStats.totalAssigned}</div>
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

            return (
              <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between">
                    <span className="text-lg">{vendor.companyName}</span>
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

                    {/* View Work Orders Button */}
                    {stats.totalCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => handleViewWorkOrders(vendor.id, e)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View {stats.totalCount} Work Order{stats.totalCount > 1 ? 's' : ''}
                      </Button>
                    )}
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
              <Button>
                <Users className="w-4 h-4 mr-2" />
                Add Your First Vendor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
