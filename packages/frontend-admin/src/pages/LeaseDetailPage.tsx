import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Edit2,
  Loader2,
  MapPin,
  Clock,
  Home,
} from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import EditLeaseModal from '../components/leases/EditLeaseModal';
import LeaseStatusActions from '../components/leases/LeaseStatusActions';
import TenantManagement from '../components/leases/TenantManagement';
import { formatCurrency, formatDate } from '../lib/utils';

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isPrimary: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

interface Lease {
  id: string;
  type: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'CANCELLED';
  startDate: string;
  endDate?: string;
  moveInDate?: string;
  moveOutDate?: string;
  noticeDate?: string;
  monthlyRent: number;
  securityDeposit: number;
  terms?: Record<string, unknown>;
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
  unit: {
    id: string;
    unitNumber: string;
    type: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number;
    marketRent: number;
    status: string;
    property: {
      id: string;
      name: string;
      address1: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  tenants: Tenant[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-yellow-100 text-yellow-700',
  TERMINATED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-orange-100 text-orange-700',
};

const TYPE_LABELS: Record<string, string> = {
  FIXED_TERM: 'Fixed Term',
  MONTH_TO_MONTH: 'Month-to-Month',
};

export default function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const {
    data: lease,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['lease', id],
    queryFn: async () => {
      const response = await api.get(`/leases/${id}`);
      return response.data.data as Lease;
    },
    enabled: !!id,
  });

  // Handle status action completion - navigate back if deleted
  const handleActionComplete = () => {
    // Refetch to get updated status, or if deleted, redirect
    refetch().catch(() => {
      navigate('/leases');
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !lease) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/leases')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leases
        </Button>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Lease not found</h3>
              <p className="text-gray-500">
                The lease you're looking for doesn't exist or has been deleted.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get primary tenant
  const primaryTenant = lease.tenants.find((t) => t.isPrimary);
  const tenantName = primaryTenant
    ? `${primaryTenant.firstName} ${primaryTenant.lastName}`
    : lease.tenants.length > 0
      ? `${lease.tenants[0].firstName} ${lease.tenants[0].lastName}`
      : 'No tenant';

  // Calculate lease duration
  const calculateDuration = () => {
    if (!lease.startDate) {
      return 'N/A';
    }
    const start = new Date(lease.startDate);
    const end = lease.endDate ? new Date(lease.endDate) : null;
    if (!end) {
      return 'Month-to-Month';
    }

    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months === 12) {
      return '1 year';
    }
    if (months > 12) {
      return `${Math.floor(months / 12)} years ${months % 12} months`;
    }
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  // Calculate days remaining
  const calculateDaysRemaining = () => {
    if (!lease.endDate || lease.status !== 'ACTIVE') {
      return null;
    }
    const end = new Date(lease.endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysRemaining = calculateDaysRemaining();

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/leases')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Unit {lease.unit.unitNumber} Lease
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[lease.status]}`}
              >
                {lease.status}
              </span>
            </div>
            <p className="text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" />
              {lease.unit.property.name} - {lease.unit.property.address1},{' '}
              {lease.unit.property.city}
            </p>
          </div>
        </div>
        <Button onClick={() => setEditModalOpen(true)}>
          <Edit2 className="w-4 h-4 mr-2" />
          Edit Lease
        </Button>
      </div>

      {/* Status Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Lease Actions:</span>
            </div>
            <LeaseStatusActions lease={lease} onActionComplete={handleActionComplete} />
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Lease Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lease Terms Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Lease Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Lease Type</p>
                  <p className="font-medium">{TYPE_LABELS[lease.type] || lease.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Start Date</p>
                  <p className="font-medium">{formatDate(lease.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">End Date</p>
                  <p className="font-medium">
                    {lease.endDate ? formatDate(lease.endDate) : 'Month-to-Month'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Duration</p>
                  <p className="font-medium">{calculateDuration()}</p>
                </div>
                {lease.moveInDate && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Move-in Date</p>
                    <p className="font-medium">{formatDate(lease.moveInDate)}</p>
                  </div>
                )}
                {lease.moveOutDate && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Move-out Date</p>
                    <p className="font-medium">{formatDate(lease.moveOutDate)}</p>
                  </div>
                )}
              </div>

              {/* Days remaining indicator */}
              {daysRemaining !== null && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {daysRemaining > 0 ? (
                      <span className="text-sm">
                        <span className="font-medium text-gray-900">{daysRemaining} days</span>
                        <span className="text-gray-500"> remaining until lease ends</span>
                      </span>
                    ) : daysRemaining === 0 ? (
                      <span className="text-sm text-orange-600 font-medium">Lease ends today</span>
                    ) : (
                      <span className="text-sm text-red-600 font-medium">
                        Lease ended {Math.abs(daysRemaining)} days ago
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Monthly Rent</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(Number(lease.monthlyRent))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Security Deposit</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(Number(lease.securityDeposit))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Annual Rent</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(Number(lease.monthlyRent) * 12)}
                  </p>
                </div>
              </div>

              {/* Rent comparison with market */}
              {lease.unit.marketRent && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">Comparison to Market Rent</p>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Lease Rent: </span>
                      <span className="font-medium">
                        {formatCurrency(Number(lease.monthlyRent))}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Market Rent: </span>
                      <span className="font-medium">
                        {formatCurrency(Number(lease.unit.marketRent))}
                      </span>
                    </div>
                    <div>
                      {Number(lease.monthlyRent) >= Number(lease.unit.marketRent) ? (
                        <span className="text-sm text-green-600 font-medium">
                          +
                          {formatCurrency(
                            Number(lease.monthlyRent) - Number(lease.unit.marketRent),
                          )}{' '}
                          above market
                        </span>
                      ) : (
                        <span className="text-sm text-red-600 font-medium">
                          {formatCurrency(
                            Number(lease.monthlyRent) - Number(lease.unit.marketRent),
                          )}{' '}
                          below market
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tenant Management */}
          <TenantManagement lease={lease} />
        </div>

        {/* Right Column - Unit & Property Info */}
        <div className="space-y-6">
          {/* Unit Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Unit Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Unit Number</p>
                <p className="font-medium text-lg">Unit {lease.unit.unitNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Bedrooms</p>
                  <p className="font-medium">{lease.unit.bedrooms}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Bathrooms</p>
                  <p className="font-medium">{lease.unit.bathrooms}</p>
                </div>
              </div>
              {lease.unit.squareFeet && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Square Feet</p>
                  <p className="font-medium">{lease.unit.squareFeet.toLocaleString()} sq ft</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 mb-1">Unit Status</p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${
                    lease.unit.status === 'OCCUPIED'
                      ? 'bg-green-100 text-green-700'
                      : lease.unit.status === 'VACANT'
                        ? 'bg-yellow-100 text-yellow-700'
                        : lease.unit.status === 'NOTICE'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {lease.unit.status}
                </span>
              </div>
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/properties/${lease.unit.property.id}`)}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  View Property
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Property Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-900">{lease.unit.property.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{lease.unit.property.address1}</p>
                  <p className="text-sm text-gray-600">
                    {lease.unit.property.city}, {lease.unit.property.state}{' '}
                    {lease.unit.property.zipCode}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Primary Contact Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Primary Contact</CardTitle>
            </CardHeader>
            <CardContent>
              {primaryTenant ? (
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{tenantName}</p>
                  <p className="text-sm text-gray-600">{primaryTenant.email}</p>
                  {primaryTenant.phone && (
                    <p className="text-sm text-gray-600">{primaryTenant.phone}</p>
                  )}
                </div>
              ) : lease.tenants.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{tenantName}</p>
                  <p className="text-sm text-gray-600">{lease.tenants[0].email}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No tenants on this lease</p>
              )}
            </CardContent>
          </Card>

          {/* Document Link */}
          {lease.documentUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lease Document</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={lease.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Signed Lease
                </a>
              </CardContent>
            </Card>
          )}

          {/* Lease Timestamps */}
          <Card>
            <CardContent className="py-4">
              <div className="text-xs text-gray-500 space-y-1">
                <p>Created: {formatDate(lease.createdAt)}</p>
                <p>Last Updated: {formatDate(lease.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Lease Modal */}
      <EditLeaseModal lease={lease} open={editModalOpen} onOpenChange={setEditModalOpen} />
    </div>
  );
}
