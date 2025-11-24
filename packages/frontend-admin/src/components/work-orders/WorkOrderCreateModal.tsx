import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Wrench, Loader2 } from 'lucide-react';
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
    enabled: open,
  });

  const createWorkOrder = useCreateWorkOrder();

  // Auto-select property if there's only one
  useEffect(() => {
    if (properties?.length === 1 && !formData.propertyId && open) {
      setFormData((prev) => ({ ...prev, propertyId: properties[0].id }));
    }
  }, [properties, formData.propertyId, open]);

  // Smart priority suggestion based on title keywords
  useEffect(() => {
    if (!formData.title) return;

    const emergencyKeywords = ['gas leak', 'no heat', 'no water', 'flooding', 'fire', 'emergency', 'urgent', 'broken pipe'];
    const highKeywords = ['leak', 'electrical', 'hvac', 'heat', 'ac', 'water', 'urgent'];

    const title = formData.title.toLowerCase();
    const hasEmergency = emergencyKeywords.some(keyword => title.includes(keyword));
    const hasHigh = highKeywords.some(keyword => title.includes(keyword));

    // Only auto-adjust if user hasn't explicitly set priority
    if (hasEmergency && formData.priority !== 'EMERGENCY' && !touched.priority) {
      setFormData((prev) => ({ ...prev, priority: 'EMERGENCY' }));
    } else if (hasHigh && formData.priority === 'MEDIUM' && !touched.priority) {
      setFormData((prev) => ({ ...prev, priority: 'HIGH' }));
    }
  }, [formData.title, formData.priority, touched.priority]);

  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'title':
        if (!value?.trim()) return 'Title is required';
        if (value.trim().length < 5) return 'Please describe the issue (at least 5 characters)';
        return '';
      case 'description':
        if (!value?.trim()) return 'Description is required';
        if (value.trim().length < 10) return 'Please provide more details (at least 10 characters)';
        return '';
      case 'propertyId':
        if (!value) return 'Please select a property';
        return '';
      case 'estimatedCost':
        if (value !== undefined && value !== null && value !== '') {
          const cost = Number(value);
          if (isNaN(cost) || cost < 0) return 'Must be a positive number';
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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    ['title', 'description', 'propertyId', 'estimatedCost'].forEach((field) => {
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error) errors[field] = error;
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      // Build payload with proper type handling
      const payload: Partial<CreateWorkOrderDto> = {
        title: formData.title!.trim(),
        description: formData.description!.trim(),
        type: formData.type || 'MAINTENANCE',
        priority: formData.priority || 'MEDIUM',
        propertyId: formData.propertyId!,
        permissionToEnter: formData.permissionToEnter || false,
      };

      // Add optional fields only if they have values
      if (formData.location?.trim()) {
        payload.location = formData.location.trim();
      }

      if (formData.tenantReportedBy?.trim()) {
        payload.tenantReportedBy = formData.tenantReportedBy.trim();
      }

      if (formData.tenantPhone?.trim()) {
        payload.tenantPhone = formData.tenantPhone.trim();
      }

      // Handle numeric fields carefully to prevent NaN
      if (formData.estimatedCost !== undefined && formData.estimatedCost !== null && formData.estimatedCost !== '') {
        const cost = Number(formData.estimatedCost);
        if (!isNaN(cost) && cost >= 0) {
          payload.estimatedCost = cost;
        }
      }

      await createWorkOrder.mutateAsync(payload as CreateWorkOrderDto);

      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'MAINTENANCE',
        priority: 'MEDIUM',
        permissionToEnter: false,
      });
      setError(null);
      setFieldErrors({});
      setTouched({});
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to create work order:', error);

      // Extract and format error message from NestJS
      let errorMessage = 'Failed to create work order. Please try again.';

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wrench className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Create Work Order</DialogTitle>
              <DialogDescription>
                Submit a new maintenance request or work order
              </DialogDescription>
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

          {/* Request Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              Request Details
            </h3>

            <div>
              <Label htmlFor="title">
                Issue Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (touched.title) handleBlur('title');
                }}
                onBlur={() => handleBlur('title')}
                placeholder="e.g., Leaking faucet in Unit 201 bathroom"
                className={fieldErrors.title ? 'border-red-500' : ''}
              />
              {fieldErrors.title && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Briefly describe the issue (minimum 5 characters)
              </p>
            </div>

            <div>
              <Label htmlFor="description">
                Detailed Description <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (touched.description) handleBlur('description');
                }}
                onBlur={() => handleBlur('description')}
                placeholder="Provide full details about what needs to be done, including any specific observations or tenant concerns..."
                rows={4}
                className={`flex w-full rounded-md border ${fieldErrors.description ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              />
              {fieldErrors.description && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Include relevant details like location within unit, when the issue started, etc.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">
                  Type <span className="text-red-500">*</span>
                </Label>
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
                  onChange={(e) => {
                    setFormData({ ...formData, priority: e.target.value });
                    setTouched((prev) => ({ ...prev, priority: true }));
                  }}
                  className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                    formData.priority === 'EMERGENCY' ? 'border-red-500 bg-red-50 text-red-900 font-medium' : ''
                  }`}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="EMERGENCY">🚨 Emergency</option>
                </select>
                {formData.priority === 'EMERGENCY' && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    Emergency requests are treated with highest urgency
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Location & Access Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              Location & Access
            </h3>

            <div>
              <Label htmlFor="propertyId">
                Property <span className="text-red-500">*</span>
              </Label>
              <select
                id="propertyId"
                value={formData.propertyId || ''}
                onChange={(e) => {
                  setFormData({ ...formData, propertyId: e.target.value });
                  if (touched.propertyId) handleBlur('propertyId');
                }}
                onBlur={() => handleBlur('propertyId')}
                className={`flex h-10 w-full rounded-md border ${fieldErrors.propertyId ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`}
              >
                <option value="">Select a property</option>
                {properties?.map((property: any) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              {fieldErrors.propertyId && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.propertyId}</p>
              )}
              {properties?.length === 1 && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Auto-selected (only property available)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="location">Specific Location (Optional)</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Unit 201 kitchen, 2nd floor hallway, rooftop"
              />
              <p className="text-xs text-gray-500 mt-1">
                Help the technician find the exact location quickly
              </p>
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
                <p className="text-xs text-gray-600 mt-1">
                  Check this if the tenant has granted permission for maintenance to enter
                </p>
              </div>
            </div>
          </div>

          {/* Tenant & Cost Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              Contact & Cost
            </h3>

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

            <div>
              <Label htmlFor="estimatedCost">Estimated Cost (Optional)</Label>
              <Input
                id="estimatedCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.estimatedCost ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({
                    ...formData,
                    estimatedCost: value ? parseFloat(value) : undefined,
                  });
                  if (touched.estimatedCost) handleBlur('estimatedCost');
                }}
                onBlur={() => handleBlur('estimatedCost')}
                placeholder="0.00"
                className={fieldErrors.estimatedCost ? 'border-red-500' : ''}
              />
              {fieldErrors.estimatedCost && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.estimatedCost}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Initial estimate if known; can be updated later
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createWorkOrder.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createWorkOrder.isPending}>
              {createWorkOrder.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Work Order'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
