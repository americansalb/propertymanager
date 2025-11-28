import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, AlertTriangle, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { formatDate } from '../../lib/utils';

interface ExpirationSummary {
  expiring30Days: number;
  expiring60Days: number;
  expiring90Days: number;
  expired: number;
  total: number;
}

interface ExpiringLease {
  id: string;
  endDate: string;
  monthlyRent: number;
  status: string;
  unit: {
    unitNumber: string;
    property: {
      name: string;
    };
  };
  tenants: Array<{
    firstName: string;
    lastName: string;
    isPrimary: boolean;
  }>;
}

export default function ExpiringLeasesWidget() {
  const navigate = useNavigate();

  const { data: summary, isLoading: summaryLoading } = useQuery<ExpirationSummary>({
    queryKey: ['lease-expiration-summary'],
    queryFn: async () => {
      const response = await api.get('/leases/expiration/summary');
      return response.data.data;
    },
  });

  const { data: expiringLeases, isLoading: leasesLoading } = useQuery<ExpiringLease[]>({
    queryKey: ['expiring-leases-30'],
    queryFn: async () => {
      const response = await api.get('/leases/expiring/30');
      return response.data.data;
    },
  });

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return 'bg-red-100 text-red-700 border-red-200';
    if (days <= 14) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (days <= 30) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const isLoading = summaryLoading || leasesLoading;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5 text-purple-600" />
          Lease Expirations
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/leases?filter=expiring')}>
          View All <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 bg-red-50 rounded-lg border border-red-100">
                <p className="text-lg font-bold text-red-600">{summary?.expired || 0}</p>
                <p className="text-xs text-red-500">Expired</p>
              </div>
              <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-lg font-bold text-amber-600">{summary?.expiring30Days || 0}</p>
                <p className="text-xs text-amber-500">30 Days</p>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-lg font-bold text-blue-600">{summary?.expiring60Days || 0}</p>
                <p className="text-xs text-blue-500">60 Days</p>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-lg font-bold text-slate-600">{summary?.expiring90Days || 0}</p>
                <p className="text-xs text-slate-500">90 Days</p>
              </div>
            </div>

            {/* Urgent Expirations List */}
            {expiringLeases && expiringLeases.length > 0 ? (
              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Expiring Soon
                </h4>
                {expiringLeases.slice(0, 5).map((lease) => {
                  const daysRemaining = getDaysRemaining(lease.endDate);
                  const primaryTenant = lease.tenants.find((t) => t.isPrimary);

                  return (
                    <div
                      key={lease.id}
                      onClick={() => navigate(`/leases/${lease.id}`)}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {lease.unit.property.name} - Unit {lease.unit.unitNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {primaryTenant
                            ? `${primaryTenant.firstName} ${primaryTenant.lastName}`
                            : 'No primary tenant'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium border ${getUrgencyColor(daysRemaining)}`}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {daysRemaining <= 0 ? 'Expired' : `${daysRemaining}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No leases expiring in the next 30 days</p>
              </div>
            )}

            {/* Total Expiring */}
            {summary && summary.total > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total expiring (90 days)</span>
                  <span className="font-semibold text-gray-900">{summary.total} leases</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
