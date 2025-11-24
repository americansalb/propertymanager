import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
import { useUpdateWorkOrder, UpdateWorkOrderDto, WorkOrder } from '../../hooks/useWorkOrders';

interface WorkOrderUpdateModalProps {
  workOrder: WorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkOrderUpdateModal({ workOrder, open, onOpenChange }: WorkOrderUpdateModalProps) {
  const [formData, setFormData] = useState<Partial<UpdateWorkOrderDto>>({});
  const [error, setError] = useState<string | null>(null);

  const updateWorkOrder = useUpdateWorkOrder();

  // Get valid status transitions based on current status
  const getValidStatusTransitions = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
      ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: ['COMPLETED'], // No transitions from completed
      CANCELLED: ['SUBMITTED'], // Allow resubmission
    };
    return transitions[currentStatus] || [];
  };

  // Initialize form data when modal opens or work order changes
  useEffect(() => {
    if (workOrder) {
      setFormData({
        title: workOrder.title,
        description: workOrder.description,
        type: workOrder.type,
        priority: workOrder.priority,
        status: workOrder.status,
        location: workOrder.location || '',
        scheduledDate: workOrder.scheduledDate || '',
        estimatedCost: workOrder.estimatedCost,
        actualCost: workOrder.actualCost,
        tenantReportedBy: workOrder.tenantReportedBy || '',
        tenantPhone: workOrder.tenantPhone || '',
        permissionToEnter: workOrder.permissionToEnter,
        completionNotes: workOrder.completionNotes || '',
      });
    }
  }, [workOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Defensive check: Ensure work order exists and has a valid ID
    if (!workOrder) {
      setError('No work order selected. Please close and reopen from the work orders list.');
      return;
    }

    if (!workOrder.id) {
      setError('Work order ID is missing. Please close and reopen from the work orders list.');
      return;
    }

    try {
      // Normalize numeric fields to prevent NaN
      const payload: Partial<UpdateWorkOrderDto> = { ...formData };

      // Handle estimated cost
      if (payload.estimatedCost !== undefined && payload.estimatedCost !== null) {
        const cost = Number(payload.estimatedCost);
        if (isNaN(cost)) {
          delete payload.estimatedCost;
        } else {
          payload.estimatedCost = cost;
        }
      }

      // Handle actual cost
      if (payload.actualCost !== undefined && payload.actualCost !== null) {
        const cost = Number(payload.actualCost);
        if (isNaN(cost)) {
          delete payload.actualCost;
        } else {
          payload.actualCost = cost;
        }
      }

      await updateWorkOrder.mutateAsync({
        id: workOrder.id,
        data: payload,
      });
      setError(null);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to update work order:', error);

      // Extract error message from backend response (handle NestJS validation errors)
      let errorMessage = 'Failed to update work order. Please try again.';

      if (error?.response?.data?.message) {
        const msg = error.response.data.message;
        // NestJS ValidationPipe returns array of error messages
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
    }
    onOpenChange(open);
  };

  if (!workOrder) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader onClose={() => handleOpenChange(false)}>
          <DialogTitle>Edit Work Order</DialogTitle>
          <DialogDescription>Update work order details and status</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          {/* Title */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Work order title"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Work order description"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {/* Always show current status */}
              {workOrder.status === 'DRAFT' && <option value="DRAFT">Draft</option>}
              {(workOrder.status === 'SUBMITTED' ||
                getValidStatusTransitions(workOrder.status).includes('SUBMITTED')) && (
                <option value="SUBMITTED">Submitted</option>
              )}
              {(workOrder.status === 'ASSIGNED' ||
                getValidStatusTransitions(workOrder.status).includes('ASSIGNED')) && (
                <option value="ASSIGNED">Assigned</option>
              )}
              {(workOrder.status === 'IN_PROGRESS' ||
                getValidStatusTransitions(workOrder.status).includes('IN_PROGRESS')) && (
                <option value="IN_PROGRESS">In Progress</option>
              )}
              {(workOrder.status === 'COMPLETED' ||
                getValidStatusTransitions(workOrder.status).includes('COMPLETED')) && (
                <option value="COMPLETED">Completed</option>
              )}
              {(workOrder.status === 'CANCELLED' ||
                getValidStatusTransitions(workOrder.status).includes('CANCELLED')) && (
                <option value="CANCELLED">Cancelled</option>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Only valid status transitions are shown
            </p>
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Lobby, Roof, Unit 201 Kitchen"
            />
          </div>

          {/* Scheduled Date */}
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

          {/* Costs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimatedCost">Estimated Cost</Label>
              <Input
                id="estimatedCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.estimatedCost || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimatedCost: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="actualCost">Actual Cost</Label>
              <Input
                id="actualCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.actualCost || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    actualCost: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Tenant Info */}
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

          {/* Permission to Enter */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="permissionToEnter"
              checked={formData.permissionToEnter}
              onChange={(e) => setFormData({ ...formData, permissionToEnter: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="permissionToEnter" className="font-normal cursor-pointer">
              Permission to enter unit
            </Label>
          </div>

          {/* Completion Notes */}
          <div>
            <Label htmlFor="completionNotes">Completion Notes</Label>
            <textarea
              id="completionNotes"
              value={formData.completionNotes || ''}
              onChange={(e) => setFormData({ ...formData, completionNotes: e.target.value })}
              placeholder="Add notes about the completed work..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateWorkOrder.isPending}>
              {updateWorkOrder.isPending ? 'Updating...' : 'Update Work Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
