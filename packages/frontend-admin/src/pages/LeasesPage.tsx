import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, DollarSign, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatCurrency, formatDate } from '../lib/utils';

type StatusFilter = 'ALL' | 'ACTIVE' | 'UPCOMING' | 'ENDED';

export default function LeasesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const { data: leases, isLoading } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      const response = await api.get('/leases');
      return response.data.data;
    },
  });

  // Filter leases based on status
  const filteredLeases = useMemo(() => {
    if (!leases) {
      return [];
    }

    const now = new Date();

    return leases.filter((lease: any) => {
      if (statusFilter === 'ALL') {
        return true;
      }

      if (statusFilter === 'ACTIVE') {
        return lease.status === 'ACTIVE';
      }

      if (statusFilter === 'UPCOMING') {
        // Leases that haven't started yet
        return new Date(lease.startDate) > now;
      }

      if (statusFilter === 'ENDED') {
        // EXPIRED, TERMINATED, or CANCELLED
        return ['EXPIRED', 'TERMINATED', 'CANCELLED'].includes(lease.status);
      }

      return true;
    });
  }, [leases, statusFilter]);

  // Calculate rent roll stats for active leases
  const rentRollStats = useMemo(() => {
    if (!leases) {
      return { activeCount: 0, totalRent: 0, averageRent: 0 };
    }

    const activeLeases = leases.filter((lease: any) => lease.status === 'ACTIVE');
    const totalRent = activeLeases.reduce(
      (sum: number, lease: any) => sum + Number(lease.monthlyRent),
      0,
    );
    const averageRent = activeLeases.length > 0 ? totalRent / activeLeases.length : 0;

    return {
      activeCount: activeLeases.length,
      totalRent,
      averageRent,
    };
  }, [leases]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading leases...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leases</h1>
          <p className="text-gray-500 mt-1">Manage tenant leases and agreements</p>
        </div>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          Create Lease
        </Button>
      </div>

      {/* Rent Roll Summary */}
      {leases && leases.length > 0 && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Leases</p>
                  <p className="text-2xl font-bold text-gray-900">{rentRollStats.activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Monthly Rent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(rentRollStats.totalRent)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Rent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(rentRollStats.averageRent)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {leases && leases.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Leases</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('ALL')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('ACTIVE')}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === 'UPCOMING' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('UPCOMING')}
                >
                  Upcoming
                </Button>
                <Button
                  variant={statusFilter === 'ENDED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('ENDED')}
                >
                  Ended
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Property</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Unit</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tenants</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Rent</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Start Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">End Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeases.length > 0 ? (
                    filteredLeases.map((lease: any) => (
                      <tr key={lease.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{lease.unit?.property?.name || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm font-medium">
                          Unit {lease.unit?.unitNumber}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {lease.tenants?.length > 0
                            ? `${lease.tenants[0].firstName} ${lease.tenants[0].lastName}`
                            : 'No tenants'}
                          {lease.tenants?.length > 1 && (
                            <span className="text-gray-500 ml-1">+{lease.tenants.length - 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">
                          {formatCurrency(Number(lease.monthlyRent))}
                        </td>
                        <td className="py-3 px-4 text-sm">{formatDate(lease.startDate)}</td>
                        <td className="py-3 px-4 text-sm">
                          {lease.endDate ? formatDate(lease.endDate) : 'Month-to-Month'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              lease.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : lease.status === 'EXPIRED'
                                  ? 'bg-red-100 text-red-700'
                                  : lease.status === 'DRAFT'
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {lease.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        No leases found for this filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leases yet</h3>
              <p className="text-gray-500 mb-6">Create your first lease to get started</p>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Create Your First Lease
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
