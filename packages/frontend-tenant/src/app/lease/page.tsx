'use client';

import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Home,
  Calendar,
  DollarSign,
  User,
  Download,
  MapPin,
  Building2,
  Bed,
  Bath,
  Square,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import TenantLayout from '@/components/layouts/TenantLayout';
import { format, differenceInDays } from 'date-fns';

interface LeaseDetails {
  id: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string | null;
  moveInDate: string | null;
  monthlyRent: number;
  securityDeposit: number;
  terms: Record<string, any>;
  documentUrl: string | null;
  unit: {
    id: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number | null;
    type: string;
  };
  property: {
    id: string;
    name: string;
    address1: string;
    address2: string | null;
    city: string;
    state: string;
    zipCode: string;
    type: string;
  };
  tenants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isPrimary: boolean;
  }>;
  daysRemaining: number | null;
}

const LEASE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700' },
  EXPIRED: { bg: 'bg-red-100', text: 'text-red-700' },
  TERMINATED: { bg: 'bg-red-100', text: 'text-red-700' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

const UNIT_TYPE_LABELS: Record<string, string> = {
  STUDIO: 'Studio',
  ONE_BED: '1 Bedroom',
  TWO_BED: '2 Bedrooms',
  THREE_BED: '3 Bedrooms',
  FOUR_PLUS_BED: '4+ Bedrooms',
  COMMERCIAL: 'Commercial',
};

export default function LeasePage() {
  const { data: lease, isLoading, error } = useQuery({
    queryKey: ['lease-details'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/lease');
      return response.data.data as LeaseDetails;
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

  if (error || !lease) {
    return (
      <TenantLayout>
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No active lease found</h3>
          <p className="text-gray-500">Contact your property manager for assistance.</p>
        </div>
      </TenantLayout>
    );
  }

  const statusConfig = LEASE_STATUS_COLORS[lease.status] || LEASE_STATUS_COLORS.ACTIVE;
  const isExpiringSoon = lease.daysRemaining !== null && lease.daysRemaining <= 60 && lease.daysRemaining > 0;
  const isExpired = lease.daysRemaining !== null && lease.daysRemaining <= 0;

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Lease</h1>
            <p className="text-gray-600">View your lease details and documents</p>
          </div>
          {lease.documentUrl && (
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Lease
            </Button>
          )}
        </div>

        {/* Expiration Warning */}
        {isExpiringSoon && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-800">
                    Your lease expires in {lease.daysRemaining} days
                  </p>
                  <p className="text-sm text-amber-700">
                    Contact your property manager to discuss renewal options.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isExpired && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <div>
                  <p className="font-medium text-red-800">Your lease has expired</p>
                  <p className="text-sm text-red-700">
                    Please contact your property manager to renew or discuss move-out procedures.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lease Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Lease Agreement</CardTitle>
                  <CardDescription>
                    {lease.type === 'FIXED_TERM' ? 'Fixed Term Lease' : 'Month-to-Month'}
                  </CardDescription>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                {lease.status}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Lease Period</p>
                  <p className="font-medium">
                    {format(new Date(lease.startDate), 'MMM d, yyyy')} -{' '}
                    {lease.endDate ? format(new Date(lease.endDate), 'MMM d, yyyy') : 'Ongoing'}
                  </p>
                  {lease.daysRemaining !== null && lease.daysRemaining > 0 && (
                    <p className="text-sm text-gray-500">{lease.daysRemaining} days remaining</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Monthly Rent</p>
                  <p className="font-medium text-xl">
                    ${Number(lease.monthlyRent).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Security Deposit</p>
                  <p className="font-medium">
                    ${Number(lease.securityDeposit).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property & Unit Info */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Property */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-400" />
                <CardTitle className="text-lg">Property</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium text-lg">{lease.property.name}</p>
                <div className="flex items-start gap-2 mt-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <div>
                    <p>{lease.property.address1}</p>
                    {lease.property.address2 && <p>{lease.property.address2}</p>}
                    <p>
                      {lease.property.city}, {lease.property.state} {lease.property.zipCode}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unit */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Home className="w-5 h-5 text-gray-400" />
                <CardTitle className="text-lg">Your Unit</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-medium text-lg">Unit {lease.unit.unitNumber}</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Bed className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">
                    {lease.unit.bedrooms} bed{lease.unit.bedrooms !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{lease.unit.bathrooms} bath</span>
                </div>
                {lease.unit.squareFeet && (
                  <div className="flex items-center gap-2">
                    <Square className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{lease.unit.squareFeet.toLocaleString()} sqft</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {UNIT_TYPE_LABELS[lease.unit.type] || lease.unit.type}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tenants */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <CardTitle className="text-lg">Tenants on Lease</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {lease.tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {tenant.firstName[0]}
                      {tenant.lastName[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {tenant.firstName} {tenant.lastName}
                      {tenant.isPrimary && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Primary
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{tenant.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lease Terms */}
        {Object.keys(lease.terms).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lease Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(lease.terms).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {lease.documentUrl ? (
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium">Lease Agreement</p>
                    <p className="text-sm text-gray-500">PDF Document</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No documents available</p>
                <p className="text-sm text-gray-400">
                  Contact your property manager for lease documents
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TenantLayout>
  );
}
