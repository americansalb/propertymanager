'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Truck,
  Check,
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TenantLayout from '@/components/layouts/TenantLayout';
import { format, formatDistanceToNow } from 'date-fns';

interface PackageItem {
  id: string;
  status: string;
  size: string;
  carrier: string | null;
  trackingNumber: string | null;
  description: string | null;
  storageLocation: string | null;
  receivedAt: string;
  notifiedAt: string | null;
  pickedUpAt: string | null;
  photoUrl: string | null;
  notes: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  RECEIVED: {
    label: 'Ready for Pickup',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  NOTIFIED: {
    label: 'Ready for Pickup',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  PICKED_UP: {
    label: 'Picked Up',
    color: 'bg-gray-100 text-gray-700',
    icon: Check,
  },
  RETURNED_TO_SENDER: {
    label: 'Returned',
    color: 'bg-red-100 text-red-700',
    icon: AlertCircle,
  },
};

const SIZE_LABELS: Record<string, string> = {
  SMALL: 'Small',
  MEDIUM: 'Medium',
  LARGE: 'Large',
  OVERSIZED: 'Oversized',
};

const CARRIER_ICONS: Record<string, string> = {
  UPS: '📦',
  FEDEX: '📦',
  USPS: '📬',
  AMAZON: '📦',
  DHL: '📦',
};

export default function PackagesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'history'>('pending');

  const { data, isLoading, error } = useQuery({
    queryKey: ['packages', filter],
    queryFn: async () => {
      const status = filter === 'pending' ? 'RECEIVED,NOTIFIED' : undefined;
      const response = await api.get('/tenant-portal/packages', {
        params: { status },
      });
      return response.data.data as PackageItem[];
    },
  });

  const { data: countData } = useQuery({
    queryKey: ['package-count'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/packages/count');
      return response.data.data as { count: number };
    },
  });

  const pickupMutation = useMutation({
    mutationFn: async (packageId: string) => {
      await api.put(`/tenant-portal/packages/${packageId}/pickup`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['package-count'] });
    },
  });

  if (isLoading) {
    return (
      <TenantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </TenantLayout>
    );
  }

  if (error) {
    return (
      <TenantLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load packages</h3>
          <p className="text-gray-500">Please try again later.</p>
        </div>
      </TenantLayout>
    );
  }

  const packages = data || [];
  const pendingCount = countData?.count || 0;

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Packages</h1>
            <p className="text-gray-600 mt-1">
              {pendingCount > 0
                ? `You have ${pendingCount} package${pendingCount === 1 ? '' : 's'} ready for pickup`
                : 'No packages waiting for pickup'}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            <Clock className="w-4 h-4 mr-2" />
            Ready for Pickup
            {pendingCount > 0 && (
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button
            variant={filter === 'history' ? 'default' : 'outline'}
            onClick={() => setFilter('history')}
          >
            History
          </Button>
        </div>

        {/* Package List */}
        {packages.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {filter === 'pending' ? 'No packages waiting' : 'No package history'}
                </h3>
                <p className="text-gray-500">
                  {filter === 'pending'
                    ? "When packages arrive for you, they'll appear here."
                    : 'Your picked up packages will appear here.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg) => {
              const statusConfig = STATUS_CONFIG[pkg.status] || STATUS_CONFIG.RECEIVED;
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={pkg.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <span className="text-2xl">
                          {pkg.carrier ? CARRIER_ICONS[pkg.carrier.toUpperCase()] || '📦' : '📦'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}
                              >
                                <StatusIcon className="w-3 h-3 inline mr-1" />
                                {statusConfig.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                {SIZE_LABELS[pkg.size] || pkg.size}
                              </span>
                            </div>

                            <div className="mt-2 space-y-1">
                              {pkg.carrier && (
                                <p className="text-sm text-gray-700 flex items-center gap-1">
                                  <Truck className="w-4 h-4 text-gray-400" />
                                  {pkg.carrier}
                                  {pkg.trackingNumber && (
                                    <span className="text-gray-400"> - {pkg.trackingNumber}</span>
                                  )}
                                </p>
                              )}

                              {pkg.storageLocation && (
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  {pkg.storageLocation}
                                </p>
                              )}

                              {pkg.description && (
                                <p className="text-sm text-gray-600">{pkg.description}</p>
                              )}
                            </div>

                            <p className="text-xs text-gray-400 mt-2">
                              Received{' '}
                              {formatDistanceToNow(new Date(pkg.receivedAt), {
                                addSuffix: true,
                              })}
                              {pkg.pickedUpAt && (
                                <> • Picked up {format(new Date(pkg.pickedUpAt), 'MMM d, yyyy')}</>
                              )}
                            </p>
                          </div>

                          {(pkg.status === 'RECEIVED' || pkg.status === 'NOTIFIED') && (
                            <Button
                              size="sm"
                              onClick={() => pickupMutation.mutate(pkg.id)}
                              disabled={pickupMutation.isPending}
                            >
                              {pickupMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  Mark Picked Up
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TenantLayout>
  );
}
