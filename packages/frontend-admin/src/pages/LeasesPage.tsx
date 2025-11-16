import { useQuery } from '@tanstack/react-query';
import { FileText, Calendar, DollarSign } from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatCurrency, formatDate } from '../lib/utils';

export default function LeasesPage() {
  const { data: leases, isLoading } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      const response = await api.get('/leases');
      return response.data.data;
    },
  });

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

      {leases && leases.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All Leases</CardTitle>
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
                  {leases.map((lease: any) => (
                    <tr key={lease.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{lease.unit?.property?.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm font-medium">Unit {lease.unit?.unitNumber}</td>
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
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          lease.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          lease.status === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                          lease.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {lease.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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
