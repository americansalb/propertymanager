import {
  X,
  Building2,
  Home,
  User,
  Briefcase,
  Calendar,
  DollarSign,
  Edit,
  ExternalLink,
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../lib/utils';
import { Button } from '../ui/button';

interface WorkOrderDetailDrawerProps {
  workOrder: any;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onPropertyClick?: (property: any) => void;
}

export function WorkOrderDetailDrawer({
  workOrder,
  open,
  onClose,
  onEdit,
  onPropertyClick,
}: WorkOrderDetailDrawerProps) {
  if (!open || !workOrder) {
    return null;
  }

  const statusColors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    ASSIGNED: 'bg-purple-100 text-purple-700',
    SUBMITTED: 'bg-gray-100 text-gray-700',
  };

  const priorityColors: Record<string, string> = {
    EMERGENCY: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-gray-100 text-gray-700',
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] bg-white shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Work Order Details</h2>
            <p className="text-sm text-gray-500 mt-0.5">#{workOrder.id.slice(0, 8)}</p>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title and Status */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{workOrder.title}</h3>
            <div className="flex gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[workOrder.status] || 'bg-gray-100 text-gray-700'}`}
              >
                {workOrder.status.replace('_', ' ')}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[workOrder.priority] || 'bg-gray-100 text-gray-700'}`}
              >
                {workOrder.priority}
              </span>
            </div>
          </div>

          {/* Description */}
          {workOrder.description && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Description</label>
              <p className="text-gray-900 leading-relaxed">{workOrder.description}</p>
            </div>
          )}

          {/* Property & Unit */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <label className="text-xs font-medium text-blue-700 uppercase">Property</label>
                {workOrder.property ? (
                  <>
                    {onPropertyClick ? (
                      <button
                        onClick={() => onPropertyClick(workOrder.property)}
                        className="font-medium text-blue-900 hover:text-blue-700 transition-colors flex items-center gap-1 group"
                      >
                        {workOrder.property.name}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ) : (
                      <p className="font-medium text-blue-900">{workOrder.property.name}</p>
                    )}
                    {(workOrder.property.city || workOrder.property.state) && (
                      <p className="text-sm text-blue-700 mt-0.5">
                        {workOrder.property.city}
                        {workOrder.property.city && workOrder.property.state && ', '}
                        {workOrder.property.state}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-medium text-gray-500">N/A</p>
                )}
              </div>
            </div>

            {workOrder.unit && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Home className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Unit</label>
                  <p className="font-medium text-gray-900">Unit {workOrder.unit.unitNumber}</p>
                </div>
              </div>
            )}

            {workOrder.location && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="text-xs font-medium text-gray-600 uppercase block mb-1">
                  Location
                </label>
                <p className="font-medium text-gray-900">{workOrder.location}</p>
              </div>
            )}
          </div>

          {/* Type */}
          {workOrder.type && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Type</label>
              <span className="inline-flex px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
                {workOrder.type.replace('_', ' ')}
              </span>
            </div>
          )}

          {/* Assigned To */}
          {workOrder.assignedTo && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase">Assigned To</label>
                <p className="font-medium text-gray-900">
                  {workOrder.assignedTo.firstName} {workOrder.assignedTo.lastName}
                </p>
                {workOrder.assignedTo.email && (
                  <p className="text-sm text-gray-600">{workOrder.assignedTo.email}</p>
                )}
              </div>
            </div>
          )}

          {/* Vendor */}
          {workOrder.vendor && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Briefcase className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase">Vendor</label>
                <p className="font-medium text-gray-900">{workOrder.vendor.companyName}</p>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            {workOrder.createdAt && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="text-xs font-medium text-gray-600 uppercase block mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Created
                </label>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(workOrder.createdAt)}
                </p>
              </div>
            )}
            {workOrder.scheduledDate && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <label className="text-xs font-medium text-blue-700 uppercase block mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Scheduled
                </label>
                <p className="text-sm font-medium text-blue-900">
                  {formatDate(workOrder.scheduledDate)}
                </p>
              </div>
            )}
            {workOrder.completedDate && (
              <div className="p-3 bg-green-50 rounded-lg col-span-2">
                <label className="text-xs font-medium text-green-700 uppercase block mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Completed
                </label>
                <p className="text-sm font-medium text-green-900">
                  {formatDate(workOrder.completedDate)}
                </p>
              </div>
            )}
          </div>

          {/* Costs */}
          {(workOrder.estimatedCost || workOrder.actualCost) && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 block">Costs</label>
              <div className="grid grid-cols-2 gap-3">
                {workOrder.estimatedCost && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <label className="text-xs font-medium text-gray-600 uppercase block mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Estimated
                    </label>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(Number(workOrder.estimatedCost))}
                    </p>
                  </div>
                )}
                {workOrder.actualCost && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <label className="text-xs font-medium text-green-700 uppercase block mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Actual
                    </label>
                    <p className="text-lg font-bold text-green-900">
                      {formatCurrency(Number(workOrder.actualCost))}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tenant Information */}
          {(workOrder.tenantReportedBy || workOrder.tenantPhone) && (
            <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <label className="text-xs font-medium text-amber-800 uppercase block">
                Tenant Information
              </label>
              {workOrder.tenantReportedBy && (
                <p className="text-sm text-amber-900">
                  <span className="font-medium">Reported by:</span> {workOrder.tenantReportedBy}
                </p>
              )}
              {workOrder.tenantPhone && (
                <p className="text-sm text-amber-900">
                  <span className="font-medium">Phone:</span> {workOrder.tenantPhone}
                </p>
              )}
              {workOrder.permissionToEnter !== undefined && (
                <p className="text-sm text-amber-900">
                  <span className="font-medium">Permission to enter:</span>{' '}
                  {workOrder.permissionToEnter ? 'Yes' : 'No'}
                </p>
              )}
            </div>
          )}

          {/* Completion Notes */}
          {workOrder.completionNotes && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Completion Notes
              </label>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-gray-900">{workOrder.completionNotes}</p>
              </div>
            </div>
          )}

          {/* Updated At */}
          {workOrder.updatedAt && workOrder.updatedAt !== workOrder.createdAt && (
            <div className="text-xs text-gray-500 border-t pt-3">
              Last updated: {formatDate(workOrder.updatedAt)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
