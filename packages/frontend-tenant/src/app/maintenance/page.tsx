'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Loader2,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import TenantLayout from '@/components/layouts/TenantLayout';
import { format } from 'date-fns';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  location: string | null;
  photos: string[];
  permissionToEnter: boolean;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  ACKNOWLEDGED: { bg: 'bg-purple-100', text: 'text-purple-700', icon: CheckCircle },
  IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Wrench },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertCircle },
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  EMERGENCY: 'bg-red-100 text-red-700',
};

const CATEGORY_ICONS: Record<string, string> = {
  Plumbing: '🚿',
  Electrical: '💡',
  HVAC: '❄️',
  Appliance: '🔌',
  'Pest Control': '🐜',
  General: '🔧',
  Other: '📝',
};

export default function MaintenancePage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['maintenance-requests', statusFilter],
    queryFn: async () => {
      const url =
        statusFilter === 'ALL'
          ? '/tenant-portal/maintenance'
          : `/tenant-portal/maintenance?status=${statusFilter}`;
      const response = await api.get(url);
      return response.data.data as MaintenanceRequest[];
    },
  });

  const activeRequests = requests?.filter(
    (r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED'
  ) || [];
  const completedRequests = requests?.filter(
    (r) => r.status === 'COMPLETED' || r.status === 'CANCELLED'
  ) || [];

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Maintenance Requests</h1>
            <p className="text-gray-600">Submit and track your service requests</p>
          </div>
          <Link href="/maintenance/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Filter:</span>
              <div className="flex flex-wrap gap-2">
                {['ALL', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'ALL' ? 'All' : status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : requests?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance requests</h3>
              <p className="text-gray-500 mb-6">
                Need something fixed? Submit a maintenance request and we'll take care of it.
              </p>
              <Link href="/maintenance/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Request
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Active Requests */}
            {activeRequests.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Active Requests ({activeRequests.length})
                </h2>
                <div className="space-y-4">
                  {activeRequests.map((request) => {
                    const statusConfig = STATUS_COLORS[request.status] || STATUS_COLORS.SUBMITTED;
                    const StatusIcon = statusConfig.icon;
                    return (
                      <Link key={request.id} href={`/maintenance/${request.id}`}>
                        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div className="text-3xl">
                                  {CATEGORY_ICONS[request.category] || '🔧'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-gray-900 truncate">
                                      {request.title}
                                    </h3>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[request.priority]}`}
                                    >
                                      {request.priority}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                                    {request.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(request.createdAt), 'MMM d, yyyy')}
                                    </span>
                                    <span>{request.category}</span>
                                    {request.location && <span>Location: {request.location}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}
                                >
                                  <StatusIcon className="w-4 h-4" />
                                  {request.status.replace('_', ' ')}
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed Requests */}
            {completedRequests.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Completed Requests ({completedRequests.length})
                </h2>
                <div className="space-y-4">
                  {completedRequests.map((request) => {
                    const statusConfig = STATUS_COLORS[request.status] || STATUS_COLORS.COMPLETED;
                    const StatusIcon = statusConfig.icon;
                    return (
                      <Link key={request.id} href={`/maintenance/${request.id}`}>
                        <Card className="hover:border-gray-300 transition-colors cursor-pointer opacity-75">
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div className="text-3xl grayscale opacity-50">
                                  {CATEGORY_ICONS[request.category] || '🔧'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-700 truncate mb-1">
                                    {request.title}
                                  </h3>
                                  <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Submitted: {format(new Date(request.createdAt), 'MMM d, yyyy')}
                                    </span>
                                    {request.resolvedAt && (
                                      <span>
                                        Resolved: {format(new Date(request.resolvedAt), 'MMM d, yyyy')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}
                                >
                                  <StatusIcon className="w-4 h-4" />
                                  {request.status}
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TenantLayout>
  );
}
