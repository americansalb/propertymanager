import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { useCreateWorkOrder, CreateWorkOrderDto } from '../../hooks/useWorkOrders';
import api from '../../services/api';

interface WorkOrderCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkOrderCreateModal({ open, onOpenChange }: WorkOrderCreateModalProps) {
  const [formData, setFormData] = useState<Partial<CreateWorkOrderDto>>({
    title: '',
    description: '',
    type: 'MAINTENANCE',
    priority: 'MEDIUM',
    permissionToEnter: false,
  });

  const [error, setError] = useState<string | null>(null);

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
    enabled: open,
  });

  const createWorkOrder = useCreateWorkOrder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title || !formData.description || !formData.propertyId || !formData.type) {
      setError('Please fill in required fields: Title, Description, Property, and Type');
      return;
    }

    try {
      await createWorkOrder.mutateAsync(formData as CreateWorkOrderDto);
      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'MAINTENANCE',
        priority: 'MEDIUM',
        permissionToEnter: false,
      });
      setError(null);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to create work order:', error);

      // Extract error message from backend response
      let errorMessage = 'Failed to create work order. Please try again.';

      if (error?.response?.data?.message) {
        // NestJS structured error response
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        // Generic error message
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader onClose={() => handleOpenChange(false)}>
          <DialogTitle>Create Work Order</DialogTitle>
          <DialogDescription>Create a new work order for maintenance or repairs</DialogDescription>
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
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Leaking faucet in Unit 201"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide details about the issue..."
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          {/* Property */}
          <div>
            <Label htmlFor="propertyId">
              Property <span className="text-red-500">*</span>
            </Label>
            <select
              id="propertyId"
              value={formData.propertyId || ''}
              onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="">Select a property</option>
              {properties?.map((property: any) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">
                Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
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
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Lobby, Roof, Unit 201 Kitchen"
            />
          </div>

          {/* Estimated Cost */}
          <div>
            <Label htmlFor="estimatedCost">Estimated Cost (Optional)</Label>
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

          {/* Tenant Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tenantReportedBy">Reported By (Optional)</Label>
              <Input
                id="tenantReportedBy"
                value={formData.tenantReportedBy || ''}
                onChange={(e) => setFormData({ ...formData, tenantReportedBy: e.target.value })}
                placeholder="Tenant name"
              />
            </div>
            <div>
              <Label htmlFor="tenantPhone">Tenant Phone (Optional)</Label>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createWorkOrder.isPending}>
              {createWorkOrder.isPending ? 'Creating...' : 'Create Work Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
