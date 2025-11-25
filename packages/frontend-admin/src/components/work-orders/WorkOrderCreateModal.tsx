import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Wrench,
  Loader2,
  MapPin,
  User,
  Phone,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
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

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
type WorkOrderType =
  | 'MAINTENANCE'
  | 'REPAIR'
  | 'INSPECTION'
  | 'TURNOVER'
  | 'EMERGENCY'
  | 'PREVENTIVE';

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

    const emergencyKeywords = [
      'gas leak',
      'no heat',
      'no water',
      'flooding',
      'fire',
      'emergency',
      'urgent',
      'broken pipe',
    ];
    const highKeywords = ['leak', 'electrical', 'hvac', 'heat', 'ac', 'water', 'urgent'];

    const title = formData.title.toLowerCase();
    const hasEmergency = emergencyKeywords.some((keyword) => title.includes(keyword));
    const hasHigh = highKeywords.some((keyword) => title.includes(keyword));

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
      const payload: Partial<CreateWorkOrderDto> = {
        title: formData.title!.trim(),
        description: formData.description!.trim(),
        type: formData.type || 'MAINTENANCE',
        priority: formData.priority || 'MEDIUM',
        propertyId: formData.propertyId!,
        permissionToEnter: formData.permissionToEnter || false,
      };

      if (formData.location?.trim()) payload.location = formData.location.trim();
      if (formData.tenantReportedBy?.trim())
        payload.tenantReportedBy = formData.tenantReportedBy.trim();
      if (formData.tenantPhone?.trim()) payload.tenantPhone = formData.tenantPhone.trim();

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

      await createWorkOrder.mutateAsync(payload as CreateWorkOrderDto);

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

  const priorityOptions: { value: Priority; label: string; icon: any; className: string }[] = [
    {
      value: 'LOW',
      label: 'Low',
      icon: Info,
      className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
    },
    {
      value: 'MEDIUM',
      label: 'Medium',
      icon: CheckCircle2,
      className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    },
    {
      value: 'HIGH',
      label: 'High',
      icon: AlertTriangle,
      className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    },
    {
      value: 'EMERGENCY',
      label: 'Emergency',
      icon: AlertTriangle,
      className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    },
  ];

  const typeOptions: { value: WorkOrderType; label: string }[] = [
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'REPAIR', label: 'Repair' },
    { value: 'INSPECTION', label: 'Inspection' },
    { value: 'TURNOVER', label: 'Turnover' },
    { value: 'EMERGENCY', label: 'Emergency' },
    { value: 'PREVENTIVE', label: 'Preventive' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Create Work Order</DialogTitle>
              <DialogDescription className="text-sm">
                Submit a new maintenance request
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Global Error */}
          {error && (
            <div className="mx-6 mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {/* 2-Column Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            {/* MAIN COLUMN - The Story (col-span-2) */}
            <div className="md:col-span-2 space-y-6">
              {/* Title - Document Header Style */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Issue Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (touched.title) handleBlur('title');
                  }}
                  onBlur={() => handleBlur('title')}
                  placeholder="e.g., Leaking faucet in Unit 201 bathroom"
                  className={`w-full text-xl font-medium border-0 border-b-2 ${
                    fieldErrors.title ? 'border-red-500' : 'border-gray-200'
                  } focus:border-blue-500 focus:outline-none px-0 py-2 transition-colors placeholder:text-gray-400`}
                />
                {fieldErrors.title && (
                  <p className="text-xs text-red-600 mt-2">{fieldErrors.title}</p>
                )}
              </div>

              {/* Description - Clean Textarea */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Full Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (touched.description) handleBlur('description');
                  }}
                  onBlur={() => handleBlur('description')}
                  placeholder="Provide full details about what needs to be done, including any specific observations or tenant concerns..."
                  rows={6}
                  className={`w-full rounded-lg border ${
                    fieldErrors.description ? 'border-red-500' : 'border-gray-200'
                  } focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none px-4 py-3 text-sm transition-all placeholder:text-gray-400`}
                />
                {fieldErrors.description && (
                  <p className="text-xs text-red-600 mt-2">{fieldErrors.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Include location details, when the issue started, and tenant concerns
                </p>
              </div>

              {/* Tenant Contact Info */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 block">
                  Tenant Contact
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={formData.tenantReportedBy || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, tenantReportedBy: e.target.value })
                      }
                      placeholder="Reported by"
                      className="pl-10 border-gray-200 focus:border-blue-500"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={formData.tenantPhone || ''}
                      onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                      placeholder="Phone number"
                      className="pl-10 border-gray-200 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SIDEBAR - Control Panel (col-span-1) */}
            <div className="md:col-span-1 bg-slate-50/50 -mr-6 -my-6 p-6 rounded-r-lg space-y-6">
              {/* Priority - Rich Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 block">
                  Priority
                </label>
                <div className="space-y-2">
                  {priorityOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = formData.priority === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, priority: option.value });
                          setTouched((prev) => ({ ...prev, priority: true }));
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                          isSelected
                            ? option.className +
                              ' ring-2 ring-offset-1 ' +
                              (option.value === 'EMERGENCY'
                                ? 'ring-red-300'
                                : option.value === 'HIGH'
                                  ? 'ring-orange-300'
                                  : 'ring-blue-300')
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? '' : 'text-gray-400'}`} />
                        <span
                          className={`text-sm font-medium ${isSelected ? '' : 'text-gray-600'}`}
                        >
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {formData.priority === 'EMERGENCY' && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    Emergency requests are treated with highest urgency
                  </p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Property *
                </label>
                <select
                  value={formData.propertyId || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, propertyId: e.target.value });
                    if (touched.propertyId) handleBlur('propertyId');
                  }}
                  onBlur={() => handleBlur('propertyId')}
                  className={`w-full h-10 rounded-lg border ${
                    fieldErrors.propertyId ? 'border-red-500' : 'border-gray-200'
                  } bg-white px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none`}
                >
                  <option value="">Select property</option>
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
                  <p className="text-xs text-green-600 mt-1">✓ Auto-selected</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Unit 201, Lobby, etc."
                    className="pl-10 border-gray-200 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Cost */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Est. Cost
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.estimatedCost ?? ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        estimatedCost: e.target.value ? parseFloat(e.target.value) : undefined,
                      });
                      if (touched.estimatedCost) handleBlur('estimatedCost');
                    }}
                    onBlur={() => handleBlur('estimatedCost')}
                    placeholder="0.00"
                    className={`pl-10 border-gray-200 focus:border-blue-500 ${
                      fieldErrors.estimatedCost ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {fieldErrors.estimatedCost && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.estimatedCost}</p>
                )}
              </div>

              {/* Permission Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.permissionToEnter}
                    onChange={(e) =>
                      setFormData({ ...formData, permissionToEnter: e.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      Permission to enter
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">Tenant has granted access</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t bg-gray-50/50">
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createWorkOrder.isPending}
                className="flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createWorkOrder.isPending}
                className="flex-1 sm:flex-initial bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {createWorkOrder.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Work Order'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
