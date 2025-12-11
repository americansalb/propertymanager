'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Building2,
  Home,
  User,
  Briefcase,
  Loader2,
  Phone,
  CheckSquare,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TenantLayout from '@/components/layouts/TenantLayout';

interface MaintenanceRequestDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  location: string | null;
  photos: string[];
  permissionToEnter: boolean;
  preferredTimes: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  unit: {
    id: string;
    unitNumber: string;
  } | null;
  property: {
    id: string;
    name: string;
    address1: string;
    city: string;
    state: string;
  } | null;
  workOrder: {
    status: string;
    assignedTo: string | null;
    vendor: string | null;
    scheduledDate: string | null;
    completedDate: string | null;
    completionNotes: string | null;
    estimatedCost: number | null;
  } | null;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  SUBMITTED: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: Clock,
    label: 'Submitted',
  },
  ACKNOWLEDGED: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    icon: CheckSquare,
    label: 'Acknowledged',
  },
  ASSIGNED: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    icon: User,
    label: 'Assigned',
  },
  IN_PROGRESS: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    icon: Wrench,
    label: 'In Progress',
  },
  COMPLETED: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: CheckCircle,
    label: 'Completed',
  },
  CANCELLED: {
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    icon: XCircle,
    label: 'Cancelled',
  },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  LOW: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Low' },
  MEDIUM: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Medium' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
  EMERGENCY: { bg: 'bg-red-100', text: 'text-red-700', label: 'Emergency' },
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

export default function MaintenanceDetailPage() {
  const params = useParams();
  const requestId = params.id as string;

  const {
    data: request,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['maintenance-request', requestId],
    queryFn: async () => {
      const response = await api.get(`/tenant-portal/maintenance/${requestId}`);
      return response.data.data as MaintenanceRequestDetail;
    },
    enabled: !!requestId,
  });

  if (isLoading) {
    return (
      <TenantLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </TenantLayout>
    );
  }

  if (error || !request) {
    return (
      <TenantLayout>
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Request not found</h3>
              <p className="text-gray-500 mb-6">
                This maintenance request doesn&apos;t exist or you don&apos;t have access to it.
              </p>
              <Link href="/maintenance">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Requests
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </TenantLayout>
    );
  }

  const priorityConfig = PRIORITY_CONFIG[request.priority] || PRIORITY_CONFIG.MEDIUM;

  // Determine the effective status (use work order status if available for better accuracy)
  const effectiveStatus = request.workOrder?.status || request.status;
  const effectiveStatusConfig = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.SUBMITTED;
  const EffectiveStatusIcon = effectiveStatusConfig.icon;

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/maintenance">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Request Details</h1>
            <p className="text-sm text-gray-500">#{request.id.slice(0, 8)}</p>
          </div>
        </div>

        {/* Status Banner */}
        <Card className={`border-l-4 ${effectiveStatusConfig.bg.replace('100', '500')}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${effectiveStatusConfig.bg}`}>
                  <EffectiveStatusIcon className={`w-5 h-5 ${effectiveStatusConfig.text}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Status</p>
                  <p className={`font-semibold ${effectiveStatusConfig.text}`}>
                    {effectiveStatusConfig.label}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${priorityConfig.bg} ${priorityConfig.text}`}
              >
                {priorityConfig.label} Priority
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Main Details */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <span className="text-4xl">{CATEGORY_ICONS[request.category] || '🔧'}</span>
              <div className="flex-1">
                <CardTitle className="text-xl">{request.title}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">{request.category}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
              <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                {request.description}
              </p>
            </div>

            {/* Location */}
            {request.location && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Location</p>
                  <p className="font-medium text-gray-900">{request.location}</p>
                </div>
              </div>
            )}

            {/* Property & Unit */}
            {(request.property || request.unit) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {request.property && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase">Property</p>
                      <p className="font-medium text-blue-900">{request.property.name}</p>
                      <p className="text-sm text-blue-700">
                        {request.property.city}, {request.property.state}
                      </p>
                    </div>
                  </div>
                )}
                {request.unit && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Home className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase">Unit</p>
                      <p className="font-medium text-gray-900">Unit {request.unit.unitNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preferences */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckSquare className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">Permission to Enter</p>
                  <p className="font-medium text-gray-900">
                    {request.permissionToEnter ? 'Yes, granted' : 'No, please contact first'}
                  </p>
                </div>
              </div>
              {request.preferredTimes && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Preferred Times</p>
                    <p className="font-medium text-gray-900">{request.preferredTimes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-600 uppercase">Submitted</p>
                </div>
                <p className="font-medium text-gray-900">
                  {format(new Date(request.createdAt), 'MMMM d, yyyy')}
                </p>
                <p className="text-sm text-gray-500">
                  {format(new Date(request.createdAt), 'h:mm a')}
                </p>
              </div>
              {request.resolvedAt && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-xs font-medium text-green-700 uppercase">Resolved</p>
                  </div>
                  <p className="font-medium text-green-900">
                    {format(new Date(request.resolvedAt), 'MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-green-700">
                    {format(new Date(request.resolvedAt), 'h:mm a')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Work Order Progress (if management is working on it) */}
        {request.workOrder && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Service Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Timeline */}
              <div className="relative pl-8 space-y-4">
                {/* Submitted */}
                <div className="relative">
                  <div className="absolute left-[-28px] top-1 w-4 h-4 rounded-full bg-blue-500" />
                  <div className="absolute left-[-22px] top-5 w-0.5 h-full bg-gray-200" />
                  <p className="text-sm font-medium text-gray-900">Request Submitted</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>

                {/* Assigned */}
                {(request.workOrder.assignedTo || request.workOrder.vendor) && (
                  <div className="relative">
                    <div
                      className={`absolute left-[-28px] top-1 w-4 h-4 rounded-full ${
                        ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(request.workOrder.status)
                          ? 'bg-purple-500'
                          : 'bg-gray-300'
                      }`}
                    />
                    <div className="absolute left-[-22px] top-5 w-0.5 h-full bg-gray-200" />
                    <p className="text-sm font-medium text-gray-900">
                      {request.workOrder.vendor
                        ? `Assigned to ${request.workOrder.vendor}`
                        : request.workOrder.assignedTo
                          ? `Assigned to ${request.workOrder.assignedTo}`
                          : 'Pending Assignment'}
                    </p>
                  </div>
                )}

                {/* Scheduled */}
                {request.workOrder.scheduledDate && (
                  <div className="relative">
                    <div
                      className={`absolute left-[-28px] top-1 w-4 h-4 rounded-full ${
                        new Date(request.workOrder.scheduledDate) <= new Date()
                          ? 'bg-yellow-500'
                          : 'bg-gray-300'
                      }`}
                    />
                    <div className="absolute left-[-22px] top-5 w-0.5 h-full bg-gray-200" />
                    <p className="text-sm font-medium text-gray-900">Scheduled for Service</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(request.workOrder.scheduledDate), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                )}

                {/* In Progress */}
                {request.workOrder.status === 'IN_PROGRESS' && (
                  <div className="relative">
                    <div className="absolute left-[-28px] top-1 w-4 h-4 rounded-full bg-yellow-500 animate-pulse" />
                    <div className="absolute left-[-22px] top-5 w-0.5 h-full bg-gray-200" />
                    <p className="text-sm font-medium text-gray-900">Work In Progress</p>
                    <p className="text-xs text-gray-500">
                      Our team is currently working on your request
                    </p>
                  </div>
                )}

                {/* Completed */}
                {request.workOrder.status === 'COMPLETED' && request.workOrder.completedDate && (
                  <div className="relative">
                    <div className="absolute left-[-28px] top-1 w-4 h-4 rounded-full bg-green-500" />
                    <p className="text-sm font-medium text-gray-900">Completed</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(request.workOrder.completedDate), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
              </div>

              {/* Assigned Contact Info */}
              {(request.workOrder.assignedTo || request.workOrder.vendor) && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {request.workOrder.vendor ? (
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    ) : (
                      <User className="w-5 h-5 text-blue-600" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase">
                        {request.workOrder.vendor ? 'Service Provider' : 'Assigned To'}
                      </p>
                      <p className="font-medium text-blue-900">
                        {request.workOrder.vendor || request.workOrder.assignedTo}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resolution */}
        {request.resolution && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                Resolution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-900 whitespace-pre-wrap">{request.resolution}</p>
              {request.workOrder?.completionNotes &&
                request.workOrder.completionNotes !== request.resolution && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-sm font-medium text-green-800 mb-2">Additional Notes</p>
                    <p className="text-green-900">{request.workOrder.completionNotes}</p>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Emergency Notice */}
        {request.priority === 'EMERGENCY' && request.status !== 'COMPLETED' && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Emergency Request</p>
                  <p className="text-sm text-red-700 mt-1">
                    This is marked as an emergency. If you haven&apos;t been contacted yet, please
                    call our emergency maintenance line directly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        {request.photos && request.photos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {request.photos.map((photo, index) => (
                  <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Link href="/maintenance">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Requests
            </Button>
          </Link>
          {request.status !== 'COMPLETED' && request.status !== 'CANCELLED' && (
            <Link href="/messages">
              <Button>
                <Phone className="w-4 h-4 mr-2" />
                Contact Management
              </Button>
            </Link>
          )}
        </div>
      </div>
    </TenantLayout>
  );
}
