import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Wrench, Loader2, CheckCircle2, Briefcase } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  useUpdateWorkOrder,
  type UpdateWorkOrderDto,
  type WorkOrder,
} from '../../hooks/useWorkOrders';
import api from '../../services/api';

interface WorkOrderUpdateModalProps {
  workOrder: WorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkOrderUpdateModal({ workOrder, open, onOpenChange }: WorkOrderUpdateModalProps) {
  const [formData, setFormData] = useState<Partial<UpdateWorkOrderDto>>({});
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const updateWorkOrder = useUpdateWorkOrder();

  // Fetch vendors for assignment
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await api.get('/vendors');
      return response.data.data;
    },
  });

  // CRITICAL: Validate work order exists and has ID before any operations
  const isValidWorkOrder =
    workOrder && workOrder.id && typeof workOrder.id === 'string' && workOrder.id.length > 0;

  // Get valid status transitions based on current status
  const getValidStatusTransitions = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
      ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [], // No transitions from completed
      CANCELLED: ['SUBMITTED'], // Allow resubmission
    };
    return transitions[currentStatus] || [];
  };

  // Initialize form data when modal opens or work order changes
  useEffect(() => {
    if (isValidWorkOrder) {
      setFormData({
        title: workOrder.title,
        description: workOrder.description,
        type: workOrder.type,
        priority: workOrder.priority,
        status: workOrder.status,
        location: workOrder.location || '',
        vendorId: workOrder.vendorId || '',
        scheduledDate: workOrder.scheduledDate || '',
        estimatedCost: workOrder.estimatedCost,
        actualCost: workOrder.actualCost,
        tenantReportedBy: workOrder.tenantReportedBy || '',
        tenantPhone: workOrder.tenantPhone || '',
        permissionToEnter: workOrder.permissionToEnter,
        completionNotes: workOrder.completionNotes || '',
      });
      setError(null);
      setFieldErrors({});
      setTouched({});
    }
  }, [workOrder, open, isValidWorkOrder]);

  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'title':
        if (!value?.trim()) {
          return 'Title is required';
        }
        if (value.trim().length < 5) {
          return 'Title must be at least 5 characters';
        }
        return '';
      case 'description':
        if (!value?.trim()) {
          return 'Description is required';
        }
        if (value.trim().length < 10) {
          return 'Description must be at least 10 characters';
        }
        return '';
      case 'estimatedCost':
      case 'actualCost':
        if (value !== undefined && value !== null && value !== '') {
          const cost = Number(value);
          if (isNaN(cost) || cost < 0) {
            return 'Must be a positive number';
          }
        }
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof typeof formData]);
    if (error) {
      setFieldErrors((prev) => ({ ...prev, [field]: error }));
    } else {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // EXTREME DEFENSIVE CHECKS - Prevent undefined ID at all costs
    if (!workOrder) {
      setError(
        '⚠️ No work order selected. Please close this modal and select a work order from the list.',
      );
      console.error('[WorkOrderUpdateModal] Attempted submit without workOrder');
      return;
    }

    if (!workOrder.id) {
      setError(
        '⚠️ Work order ID is missing. Please close this modal and reopen from the work orders list.',
      );
      console.error('[WorkOrderUpdateModal] Attempted submit without workOrder.id:', { workOrder });
      return;
    }

    if (typeof workOrder.id !== 'string' || workOrder.id.length === 0) {
      setError(
        '⚠️ Work order ID is invalid. Please close this modal and reopen from the work orders list.',
      );
      console.error('[WorkOrderUpdateModal] Invalid workOrder.id type or length:', {
        id: workOrder.id,
        type: typeof workOrder.id,
      });
      return;
    }

    // Validate required fields
    const errors: Record<string, string> = {};
    ['title', 'description'].forEach((field) => {
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error) {
        errors[field] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      // Build payload with defensive numeric handling
      const payload: Partial<UpdateWorkOrderDto> = {};

      // Only include fields that have changed or are required
      if (formData.title?.trim()) {
        payload.title = formData.title.trim();
      }
      if (formData.description?.trim()) {
        payload.description = formData.description.trim();
      }
      if (formData.type) {
        payload.type = formData.type;
      }
      if (formData.priority) {
        payload.priority = formData.priority;
      }
      if (formData.status) {
        payload.status = formData.status;
      }

      // Optional text fields
      if (formData.location?.trim()) {
        payload.location = formData.location.trim();
      }
      if (formData.tenantReportedBy?.trim()) {
        payload.tenantReportedBy = formData.tenantReportedBy.trim();
      }
      if (formData.tenantPhone?.trim()) {
        payload.tenantPhone = formData.tenantPhone.trim();
      }
      if (formData.completionNotes?.trim()) {
        payload.completionNotes = formData.completionNotes.trim();
      }

      // Vendor assignment
      if (formData.vendorId) {
        payload.vendorId = formData.vendorId;
      }

      // Scheduled date
      if (formData.scheduledDate) {
        payload.scheduledDate = formData.scheduledDate;
      }

      // Permission to enter
      payload.permissionToEnter = formData.permissionToEnter || false;

      // Handle numeric cost fields carefully
      if (
        formData.estimatedCost !== undefined &&
        formData.estimatedCost !== null &&
        formData.estimatedCost !== ''
      ) {
        const cost = Number(formData.estimatedCost);
        if (!isNaN(cost) && cost >= 0) {
          payload.estimatedCost = cost;
        }
      }

      if (
        formData.actualCost !== undefined &&
        formData.actualCost !== null &&
        formData.actualCost !== ''
      ) {
        const cost = Number(formData.actualCost);
        if (!isNaN(cost) && cost >= 0) {
          payload.actualCost = cost;
        }
      }

      await updateWorkOrder.mutateAsync({
        id: workOrder.id,
        data: payload,
      });

      setError(null);
      setFieldErrors({});
      setTouched({});
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('[WorkOrderUpdateModal] Failed to update work order:', error);

      // Extract and format error message from NestJS
      let errorMessage = 'Failed to update work order. Please try again.';

      if (error?.response?.data?.message) {
        const msg = error.response.data.message;
        if (Array.isArray(msg)) {
          errorMessage = msg.join(', ');
        } else {
          errorMessage = msg;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
      setFieldErrors({});
      setTouched({});
    }
    onOpenChange(open);
  };

  // Don't render if work order is invalid
  if (!isValidWorkOrder) {
    console.warn('[WorkOrderUpdateModal] Attempted to render with invalid work order:', {
      workOrder,
      open,
    });
    return null;
  }

  const validTransitions = getValidStatusTransitions(workOrder.status);
  const isCompleting = formData.status === 'COMPLETED' && workOrder.status !== 'COMPLETED';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wrench className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Edit Work Order</DialogTitle>
              <DialogDescription>Update work order details and status</DialogDescription>
              <p className="text-xs text-gray-500 mt-1">ID: {workOrder.id.slice(0, 12)}...</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Global Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Status & Progress Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Status & Progress</h3>

            <div>
              <Label htmlFor="status">
                Status <span className="text-red-500">*</span>
              </Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                  formData.status === 'COMPLETED' ? 'border-green-500 bg-green-50 font-medium' : ''
                }`}
              >
                {/* Always show current status */}
                <option value={workOrder.status}>
                  {workOrder.status.replace('_', ' ')} (Current)
                </option>
                {/* Show valid transitions */}
                {validTransitions.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {validTransitions.length > 0
                  ? `You can move to: ${validTransitions.join(', ').replace(/_/g, ' ')}`
                  : 'No status transitions available from current status'}
              </p>
            </div>

            {/* Show completion notes prominently when completing */}
            {isCompleting && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <Label htmlFor="completionNotes" className="font-semibold text-green-900">
                    Completion Notes <span className="text-red-500">*</span>
                  </Label>
                </div>
                <textarea
                  id="completionNotes"
                  value={formData.completionNotes || ''}
                  onChange={(e) => setFormData({ ...formData, completionNotes: e.target.value })}
                  placeholder="Describe what was done to complete this work order..."
                  rows={3}
                  className="flex w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm"
                />
                <p className="text-xs text-green-700 mt-1">
                  Required when marking as completed. Document the work performed.
                </p>
              </div>
            )}
          </div>

          {/* Request Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Request Details</h3>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (touched.title) {
                    handleBlur('title');
                  }
                }}
                onBlur={() => handleBlur('title')}
                placeholder="Work order title"
                className={fieldErrors.title ? 'border-red-500' : ''}
              />
              {fieldErrors.title && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (touched.description) {
                    handleBlur('description');
                  }
                }}
                onBlur={() => handleBlur('description')}
                placeholder="Work order description"
                rows={3}
                className={`flex w-full rounded-md border ${fieldErrors.description ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`}
              />
              {fieldErrors.description && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="REPAIR">Repair</option>
                  <option value="INSPECTION">Inspection</option>
                  <option value="TURNOVER">Turnover</option>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="PREVENTIVE">Preventive</option>
                </select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                    formData.priority === 'EMERGENCY' ? 'border-red-500 bg-red-50 font-medium' : ''
                  }`}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="EMERGENCY">🚨 Emergency</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location & Scheduling Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              Location & Scheduling
            </h3>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Unit 201 bathroom, Lobby, Roof"
              />
            </div>

            <div>
              <Label htmlFor="scheduledDate">Scheduled Date</Label>
              <Input
                id="scheduledDate"
                type="datetime-local"
                value={
                  formData.scheduledDate
                    ? new Date(formData.scheduledDate).toISOString().slice(0, 16)
                    : ''
                }
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              />
            </div>
          </div>

          {/* Assignment Section */}
          {vendors && vendors.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Assignment</h3>

              <div>
                <Label htmlFor="vendorId">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Assign to Vendor
                  </div>
                </Label>
                <select
                  id="vendorId"
                  value={formData.vendorId || ''}
                  onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No vendor assigned</option>
                  {vendors.map((vendor: any) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.companyName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Assign this work order to a vendor for external service
                </p>
              </div>
            </div>
          )}

          {/* Cost & Contact Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Cost & Contact</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimatedCost">Estimated Cost</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimatedCost || ''}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      estimatedCost: e.target.value ? parseFloat(e.target.value) : undefined,
                    });
                    if (touched.estimatedCost) {
                      handleBlur('estimatedCost');
                    }
                  }}
                  onBlur={() => handleBlur('estimatedCost')}
                  placeholder="0.00"
                  className={fieldErrors.estimatedCost ? 'border-red-500' : ''}
                />
                {fieldErrors.estimatedCost && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.estimatedCost}</p>
                )}
              </div>
              <div>
                <Label htmlFor="actualCost">Actual Cost</Label>
                <Input
                  id="actualCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.actualCost || ''}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      actualCost: e.target.value ? parseFloat(e.target.value) : undefined,
                    });
                    if (touched.actualCost) {
                      handleBlur('actualCost');
                    }
                  }}
                  onBlur={() => handleBlur('actualCost')}
                  placeholder="0.00"
                  className={fieldErrors.actualCost ? 'border-red-500' : ''}
                />
                {fieldErrors.actualCost && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.actualCost}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tenantReportedBy">Reported By</Label>
                <Input
                  id="tenantReportedBy"
                  value={formData.tenantReportedBy || ''}
                  onChange={(e) => setFormData({ ...formData, tenantReportedBy: e.target.value })}
                  placeholder="Tenant name"
                />
              </div>
              <div>
                <Label htmlFor="tenantPhone">Tenant Phone</Label>
                <Input
                  id="tenantPhone"
                  value={formData.tenantPhone || ''}
                  onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="permissionToEnter"
                checked={formData.permissionToEnter}
                onChange={(e) => setFormData({ ...formData, permissionToEnter: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="permissionToEnter" className="font-medium cursor-pointer">
                  Permission to enter unit
                </Label>
              </div>
            </div>
          </div>

          {/* Completion Notes (always show if not completing now) */}
          {!isCompleting && formData.status !== 'COMPLETED' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
                Completion Notes
              </h3>
              <div>
                <Label htmlFor="completionNotes">Notes (Optional)</Label>
                <textarea
                  id="completionNotes"
                  value={formData.completionNotes || ''}
                  onChange={(e) => setFormData({ ...formData, completionNotes: e.target.value })}
                  placeholder="Add notes about the work performed..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateWorkOrder.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateWorkOrder.isPending}>
              {updateWorkOrder.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
