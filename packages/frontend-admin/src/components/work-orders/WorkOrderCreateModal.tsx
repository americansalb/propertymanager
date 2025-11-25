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
  X,
  Droplets,
  Zap,
  Thermometer,
  Key,
  Bug,
  Wifi,
  Trash2,
  Refrigerator,
  MessageSquare,
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
  defaultPropertyId?: string | null;
  defaultPropertyName?: string;
}

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
type WorkOrderType =
  | 'MAINTENANCE'
  | 'REPAIR'
  | 'INSPECTION'
  | 'TURNOVER'
  | 'EMERGENCY'
  | 'PREVENTIVE';

export function WorkOrderCreateModal({
  open,
  onOpenChange,
  defaultPropertyId,
  defaultPropertyName,
}: WorkOrderCreateModalProps) {
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

  // Auto-select property if there's only one OR if defaultPropertyId is provided
  useEffect(() => {
    if (defaultPropertyId && open) {
      setFormData((prev) => ({ ...prev, propertyId: defaultPropertyId }));
    } else if (properties?.length === 1 && !formData.propertyId && open) {
      setFormData((prev) => ({ ...prev, propertyId: properties[0].id }));
    }
  }, [properties, formData.propertyId, open, defaultPropertyId]);

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

  // ONE-TAP PRESETS (Gemini's smart feature)
  const applyQuickPreset = (preset: string) => {
    const presets: Record<
      string,
      Partial<CreateWorkOrderDto> & { title: string; description: string }
    > = {
      LEAK: {
        title: 'Active Water Leak',
        type: 'REPAIR',
        priority: 'HIGH',
        description:
          'Water leak detected. Potential for water damage. Please assess and repair immediately.',
      },
      HVAC: {
        title: 'Heating/Cooling Issue',
        type: 'MAINTENANCE',
        priority: 'MEDIUM',
        description:
          'Unit not maintaining temperature. Check thermostat, filters, and HVAC system operation.',
      },
      ELECTRIC: {
        title: 'Electrical Issue',
        type: 'REPAIR',
        priority: 'HIGH',
        description:
          'Electrical problem reported. Power outage, sparking outlet, or circuit breaker issue.',
      },
      LOCK: {
        title: 'Lockout / Key Issue',
        type: 'MAINTENANCE',
        priority: 'MEDIUM',
        description: 'Tenant locked out or lock malfunction. Requires immediate access assistance.',
      },
      PEST: {
        title: 'Pest Control Request',
        type: 'MAINTENANCE',
        priority: 'LOW',
        description:
          'Tenant reported pests (ants, roaches, rodents). Schedule pest control treatment.',
      },
      APPLIANCE: {
        title: 'Appliance Malfunction',
        type: 'REPAIR',
        priority: 'MEDIUM',
        description:
          'Appliance not working correctly. Refrigerator, stove, dishwasher, or washer/dryer issue.',
      },
      WIFI: {
        title: 'Internet/Access Issue',
        type: 'MAINTENANCE',
        priority: 'LOW',
        description:
          'Building WiFi down or gate code access issue. Check network and access systems.',
      },
      TRASH: {
        title: 'Trash/Debris Removal',
        type: 'MAINTENANCE',
        priority: 'LOW',
        description: 'Excess trash or debris needs removal from common area or unit.',
      },
    };

    if (presets[preset]) {
      setFormData((prev) => ({ ...prev, ...presets[preset] }));
      setTouched({});
      setFieldErrors({});
    }
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
      <DialogContent className="sm:max-w-4xl max-h-[85vh] p-0 flex flex-col overflow-hidden">
        {/* DARK HEADER (Gemini's design) */}
        <div className="bg-slate-900 px-8 py-6 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
              <Wrench className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <DialogTitle className="text-white text-xl">
                {defaultPropertyName
                  ? `Create Work Order – ${defaultPropertyName}`
                  : 'New Maintenance Request'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">
                Create a work order for your team
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          <form onSubmit={handleSubmit}>
            {/* Global Error */}
            {error && (
              <div className="mx-8 mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* MAIN COLUMN */}
              <div className="lg:col-span-8 space-y-6">
                {/* HORIZONTAL SCROLLABLE PRESETS (Gemini's killer feature) */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Common Issues (One-Tap)
                  </Label>
                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x -mx-1 px-1 scrollbar-hide">
                    {[
                      { id: 'LEAK', icon: Droplets, label: 'Leak', color: 'blue' },
                      { id: 'ELECTRIC', icon: Zap, label: 'Power', color: 'yellow' },
                      { id: 'HVAC', icon: Thermometer, label: 'HVAC', color: 'orange' },
                      { id: 'LOCK', icon: Key, label: 'Lockout', color: 'slate' },
                      { id: 'PEST', icon: Bug, label: 'Pests', color: 'red' },
                      { id: 'APPLIANCE', icon: Refrigerator, label: 'Appliances', color: 'indigo' },
                      { id: 'WIFI', icon: Wifi, label: 'Access', color: 'cyan' },
                      { id: 'TRASH', icon: Trash2, label: 'Trash', color: 'green' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => applyQuickPreset(item.id)}
                        className="flex-shrink-0 w-24 bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col items-center gap-2 group snap-start"
                      >
                        <div
                          className={`p-2 rounded-full bg-${item.color}-50 text-${item.color}-600 group-hover:bg-${item.color}-100`}
                        >
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="relative flex items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase tracking-wider">
                    Or describe manually
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Main Form Content */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                  {/* Title */}
                  <div>
                    <Label className="text-base mb-2 block">Issue Title</Label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => {
                        setFormData({ ...formData, title: e.target.value });
                        if (touched.title) handleBlur('title');
                      }}
                      onBlur={() => handleBlur('title')}
                      placeholder="e.g. Leaking faucet in Unit 201"
                      className={`w-full text-lg py-6 font-medium border rounded-lg px-4 ${
                        fieldErrors.title
                          ? 'border-red-500'
                          : 'border-slate-200 focus:border-indigo-500'
                      } focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors placeholder:text-gray-400`}
                      autoFocus
                    />
                    {fieldErrors.title && (
                      <p className="text-xs text-red-600 mt-2">{fieldErrors.title}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="block mb-2">Detailed Description</Label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => {
                        setFormData({ ...formData, description: e.target.value });
                        if (touched.description) handleBlur('description');
                      }}
                      onBlur={() => handleBlur('description')}
                      placeholder="Describe the issue..."
                      rows={6}
                      className={`w-full resize-none text-base rounded-lg border px-4 py-3 ${
                        fieldErrors.description
                          ? 'border-red-500'
                          : 'border-slate-200 focus:border-indigo-500'
                      } focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400`}
                    />
                    {fieldErrors.description && (
                      <p className="text-xs text-red-600 mt-2">{fieldErrors.description}</p>
                    )}
                  </div>
                </div>

                {/* Priority Selection */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <Label className="text-base block">Priority Level</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                          className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 gap-3 ${
                            isSelected
                              ? option.className + ' shadow-sm ring-1 ring-offset-1'
                              : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-500'
                          }`}
                        >
                          <Icon className={`w-6 h-6 ${isSelected ? '' : 'text-slate-400'}`} />
                          <span
                            className={`text-sm font-medium ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}
                          >
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SIDEBAR */}
              <div className="lg:col-span-4 space-y-6">
                {/* Location Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-3">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    Location
                  </div>
                  <div className="space-y-4">
                    {/* Property */}
                    <div className="space-y-1.5">
                      <Label>Property</Label>
                      <select
                        value={formData.propertyId || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, propertyId: e.target.value });
                          if (touched.propertyId) handleBlur('propertyId');
                        }}
                        onBlur={() => handleBlur('propertyId')}
                        className={`w-full h-11 rounded-lg border ${
                          fieldErrors.propertyId ? 'border-red-500' : 'border-slate-200'
                        } bg-white px-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none`}
                      >
                        <option value="">Select property...</option>
                        {properties?.map((property: any) => (
                          <option key={property.id} value={property.id}>
                            {property.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.propertyId && (
                        <p className="text-xs text-red-600 mt-1">{fieldErrors.propertyId}</p>
                      )}
                    </div>

                    {/* Unit/Area */}
                    <div className="space-y-1.5">
                      <Label>Unit / Area</Label>
                      <Input
                        value={formData.location || ''}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g. Unit 4B"
                      />
                    </div>

                    {/* Type */}
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                      >
                        {typeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Estimated Cost */}
                    <div className="space-y-1.5">
                      <Label>Est. Cost</Label>
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
                              estimatedCost: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            });
                            if (touched.estimatedCost) handleBlur('estimatedCost');
                          }}
                          onBlur={() => handleBlur('estimatedCost')}
                          placeholder="0.00"
                          className={`pl-10 ${fieldErrors.estimatedCost ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {fieldErrors.estimatedCost && (
                        <p className="text-xs text-red-600 mt-1">{fieldErrors.estimatedCost}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* SMS PREVIEW (Gemini's smart feature) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-3">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    Tenant Notification
                  </div>
                  <div className="space-y-4">
                    {/* SMS Preview */}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs text-slate-500 italic">
                      <span className="font-semibold text-slate-700 block mb-1">
                        Preview of SMS to Tenant:
                      </span>
                      "Hi {formData.tenantReportedBy || 'Tenant'}, a new work order '
                      {formData.title || '...'}' has been scheduled..."
                    </div>

                    {/* Tenant Name */}
                    <div className="space-y-1.5">
                      <Label>Reported By</Label>
                      <Input
                        value={formData.tenantReportedBy || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, tenantReportedBy: e.target.value })
                        }
                        placeholder="Name (Optional)"
                      />
                    </div>

                    {/* Permission Checkbox */}
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 cursor-pointer hover:border-indigo-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.permissionToEnter}
                        onChange={(e) =>
                          setFormData({ ...formData, permissionToEnter: e.target.checked })
                        }
                        className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium text-slate-900 block">
                          Permission to enter
                        </span>
                        <span className="text-xs text-slate-500 block">
                          Grant access if tenant is absent
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* FOOTER */}
        <div className="bg-white px-8 py-5 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={createWorkOrder.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createWorkOrder.isPending}
            className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px]"
          >
            {createWorkOrder.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Ticket'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
