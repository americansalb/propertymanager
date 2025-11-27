import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Building2,
  Calendar,
  Users,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import api from '../../services/api';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';

interface CreateLeaseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Property {
  id: string;
  name: string;
  address1: string;
  city: string;
  state: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  marketRent: number;
  status: string;
}

interface Tenant {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

interface LeaseFormData {
  propertyId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  securityDeposit: string;
  paymentDueDay: number;
  tenants: Tenant[];
}

const STEPS = [
  { id: 'unit', title: 'Select Unit', icon: Building2 },
  { id: 'terms', title: 'Lease Terms', icon: Calendar },
  { id: 'tenants', title: 'Add Tenants', icon: Users },
  { id: 'review', title: 'Review', icon: CheckCircle },
];

export default function CreateLeaseWizard({ open, onOpenChange }: CreateLeaseWizardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<LeaseFormData>({
    propertyId: '',
    unitId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    monthlyRent: '',
    securityDeposit: '',
    paymentDueDay: 1,
    tenants: [{ firstName: '', lastName: '', email: '', phone: '', isPrimary: true }],
  });

  // Fetch properties
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data as Property[];
    },
    enabled: open,
  });

  // Fetch units for selected property
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ['units', formData.propertyId],
    queryFn: async () => {
      const response = await api.get(`/units?propertyId=${formData.propertyId}`);
      return response.data.data as Unit[];
    },
    enabled: !!formData.propertyId && open,
  });

  // Filter to only vacant units
  const vacantUnits = units?.filter((u) => u.status === 'VACANT') || [];

  // Set default end date to 1 year from start date
  useEffect(() => {
    if (formData.startDate && !formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      setFormData((prev) => ({
        ...prev,
        endDate: endDate.toISOString().split('T')[0],
      }));
    }
  }, [formData.startDate, formData.endDate]);

  // Set market rent when unit is selected
  useEffect(() => {
    if (formData.unitId && units) {
      const selectedUnit = units.find((u) => u.id === formData.unitId);
      if (selectedUnit && !formData.monthlyRent) {
        setFormData((prev) => ({
          ...prev,
          monthlyRent: selectedUnit.marketRent.toString(),
          securityDeposit: selectedUnit.marketRent.toString(),
        }));
      }
    }
  }, [formData.unitId, units, formData.monthlyRent]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setErrors({});
      setFormData({
        propertyId: '',
        unitId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        monthlyRent: '',
        securityDeposit: '',
        paymentDueDay: 1,
        tenants: [{ firstName: '', lastName: '', email: '', phone: '', isPrimary: true }],
      });
    }
  }, [open]);

  const createLeaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/leases', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      onOpenChange(false);
      navigate('/leases');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create lease';
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message });
    },
  });

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Unit selection
        if (!formData.propertyId) {
          newErrors.propertyId = 'Please select a property';
        }
        if (!formData.unitId) {
          newErrors.unitId = 'Please select a unit';
        }
        break;
      case 1: // Lease terms
        if (!formData.startDate) {
          newErrors.startDate = 'Start date is required';
        }
        if (!formData.endDate) {
          newErrors.endDate = 'End date is required';
        }
        if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
          newErrors.endDate = 'End date must be after start date';
        }
        if (!formData.monthlyRent || parseFloat(formData.monthlyRent) <= 0) {
          newErrors.monthlyRent = 'Monthly rent must be greater than 0';
        }
        if (formData.securityDeposit && parseFloat(formData.securityDeposit) < 0) {
          newErrors.securityDeposit = 'Security deposit cannot be negative';
        }
        break;
      case 2: {
        // Tenants
        if (formData.tenants.length === 0) {
          newErrors.tenants = 'At least one tenant is required';
        }
        const hasPrimary = formData.tenants.some((t) => t.isPrimary);
        if (!hasPrimary) {
          newErrors.tenants = 'One tenant must be marked as primary';
        }
        formData.tenants.forEach((tenant, index) => {
          if (!tenant.firstName.trim()) {
            newErrors[`tenant_${index}_firstName`] = 'First name is required';
          }
          if (!tenant.lastName.trim()) {
            newErrors[`tenant_${index}_lastName`] = 'Last name is required';
          }
          if (!tenant.email.trim()) {
            newErrors[`tenant_${index}_email`] = 'Email is required';
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenant.email)) {
            newErrors[`tenant_${index}_email`] = 'Invalid email format';
          }
          if (!tenant.phone.trim()) {
            newErrors[`tenant_${index}_phone`] = 'Phone is required';
          }
        });
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setErrors({});
  };

  const handleSubmit = () => {
    if (!validateStep(2)) {
      return;
    }

    const data = {
      unitId: formData.unitId,
      type: 'FIXED_TERM', // Required by backend - FIXED_TERM for leases with end date
      startDate: formData.startDate,
      endDate: formData.endDate,
      monthlyRent: parseFloat(formData.monthlyRent),
      securityDeposit: parseFloat(formData.securityDeposit || '0'),
      tenants: formData.tenants.map((t) => ({
        firstName: t.firstName.trim(),
        lastName: t.lastName.trim(),
        email: t.email.trim(),
        phone: t.phone.trim() || 'N/A', // Phone is required by backend
        isPrimary: t.isPrimary,
      })),
    };

    createLeaseMutation.mutate(data);
  };

  const handleTenantChange = (index: number, field: keyof Tenant, value: any) => {
    setFormData((prev) => {
      const newTenants = [...prev.tenants];
      if (field === 'isPrimary' && value === true) {
        // Only one primary tenant allowed
        newTenants.forEach((t) => (t.isPrimary = false));
      }
      newTenants[index] = { ...newTenants[index], [field]: value };
      return { ...prev, tenants: newTenants };
    });

    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`tenant_${index}_${field}`];
      return newErrors;
    });
  };

  const addTenant = () => {
    setFormData((prev) => ({
      ...prev,
      tenants: [
        ...prev.tenants,
        { firstName: '', lastName: '', email: '', phone: '', isPrimary: false },
      ],
    }));
  };

  const removeTenant = (index: number) => {
    if (formData.tenants.length <= 1) {
      return;
    }
    setFormData((prev) => {
      const newTenants = prev.tenants.filter((_, i) => i !== index);
      // If we removed the primary tenant, make the first one primary
      if (!newTenants.some((t) => t.isPrimary) && newTenants.length > 0) {
        newTenants[0].isPrimary = true;
      }
      return { ...prev, tenants: newTenants };
    });
  };

  const selectedProperty = properties?.find((p) => p.id === formData.propertyId);
  const selectedUnit = units?.find((u) => u.id === formData.unitId);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Unit Selection
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Property *
              </label>
              <select
                value={formData.propertyId}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    propertyId: e.target.value,
                    unitId: '',
                    monthlyRent: '',
                    securityDeposit: '',
                  }));
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.propertyId;
                    return newErrors;
                  });
                }}
                className={`w-full h-11 border rounded-md px-3 ${errors.propertyId ? 'border-red-500' : ''}`}
              >
                <option value="">Choose a property...</option>
                {properties?.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.address1}, {property.city}
                  </option>
                ))}
              </select>
              {errors.propertyId && (
                <p className="text-sm text-red-600 mt-1">{errors.propertyId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Unit *</label>
              {unitsLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading units...
                </div>
              ) : !formData.propertyId ? (
                <p className="text-gray-500 text-sm">Select a property first</p>
              ) : vacantUnits.length === 0 ? (
                <p className="text-yellow-600 text-sm">
                  No vacant units available for this property
                </p>
              ) : (
                <div className="grid gap-3">
                  {vacantUnits.map((unit) => (
                    <div
                      key={unit.id}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, unitId: unit.id }));
                        setErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.unitId;
                          return newErrors;
                        });
                      }}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.unitId === unit.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Unit {unit.unitNumber}</span>
                          <span className="text-gray-500 ml-2">
                            {Number(unit.bedrooms)} bed / {Number(unit.bathrooms)} bath
                          </span>
                        </div>
                        <span className="font-medium text-green-600">
                          ${Number(unit.marketRent).toLocaleString()}/mo
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {errors.unitId && <p className="text-sm text-red-600 mt-1">{errors.unitId}</p>}
            </div>
          </div>
        );

      case 1: // Lease Terms
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.startDate}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && <p className="text-sm text-red-600 mt-1">{errors.endDate}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Rent *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthlyRent}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, monthlyRent: e.target.value }))
                    }
                    className={`pl-7 ${errors.monthlyRent ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.monthlyRent && (
                  <p className="text-sm text-red-600 mt-1">{errors.monthlyRent}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Deposit
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.securityDeposit}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, securityDeposit: e.target.value }))
                    }
                    className={`pl-7 ${errors.securityDeposit ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.securityDeposit && (
                  <p className="text-sm text-red-600 mt-1">{errors.securityDeposit}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Due Day
              </label>
              <select
                value={formData.paymentDueDay}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, paymentDueDay: parseInt(e.target.value) }))
                }
                className="w-full h-10 border rounded-md px-3"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day === 1 ? '1st' : day === 2 ? '2nd' : day === 3 ? '3rd' : `${day}th`} of each
                    month
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 2: // Tenants
        return (
          <div className="space-y-4">
            {errors.tenants && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.tenants}</p>
              </div>
            )}

            {formData.tenants.map((tenant, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-6">
                  {formData.tenants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTenant(index)}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <Input
                        value={tenant.firstName}
                        onChange={(e) => handleTenantChange(index, 'firstName', e.target.value)}
                        className={errors[`tenant_${index}_firstName`] ? 'border-red-500' : ''}
                      />
                      {errors[`tenant_${index}_firstName`] && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors[`tenant_${index}_firstName`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <Input
                        value={tenant.lastName}
                        onChange={(e) => handleTenantChange(index, 'lastName', e.target.value)}
                        className={errors[`tenant_${index}_lastName`] ? 'border-red-500' : ''}
                      />
                      {errors[`tenant_${index}_lastName`] && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors[`tenant_${index}_lastName`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={tenant.email}
                        onChange={(e) => handleTenantChange(index, 'email', e.target.value)}
                        className={errors[`tenant_${index}_email`] ? 'border-red-500' : ''}
                      />
                      {errors[`tenant_${index}_email`] && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors[`tenant_${index}_email`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                      <Input
                        type="tel"
                        value={tenant.phone}
                        onChange={(e) => handleTenantChange(index, 'phone', e.target.value)}
                        className={errors[`tenant_${index}_phone`] ? 'border-red-500' : ''}
                        placeholder="(555) 555-5555"
                      />
                      {errors[`tenant_${index}_phone`] && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors[`tenant_${index}_phone`]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={tenant.isPrimary}
                        onChange={(e) => handleTenantChange(index, 'isPrimary', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Primary tenant (main contact)</span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button type="button" variant="outline" onClick={addTenant} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Tenant
            </Button>
          </div>
        );

      case 3: // Review
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Property & Unit</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Property:</span> {selectedProperty?.name}
                </p>
                <p>
                  <span className="font-medium">Address:</span> {selectedProperty?.address1},{' '}
                  {selectedProperty?.city}, {selectedProperty?.state}
                </p>
                <p>
                  <span className="font-medium">Unit:</span> {selectedUnit?.unitNumber} (
                  {Number(selectedUnit?.bedrooms || 0)} bed / {Number(selectedUnit?.bathrooms || 0)} bath)
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Lease Terms</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Term:</span>{' '}
                  {new Date(formData.startDate).toLocaleDateString()} -{' '}
                  {new Date(formData.endDate).toLocaleDateString()}
                </p>
                <p>
                  <span className="font-medium">Monthly Rent:</span> $
                  {parseFloat(formData.monthlyRent).toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">Security Deposit:</span> $
                  {parseFloat(formData.securityDeposit || '0').toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">Payment Due:</span> {formData.paymentDueDay}
                  {formData.paymentDueDay === 1
                    ? 'st'
                    : formData.paymentDueDay === 2
                      ? 'nd'
                      : formData.paymentDueDay === 3
                        ? 'rd'
                        : 'th'}{' '}
                  of each month
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Tenants</h4>
              <div className="text-sm text-gray-600 space-y-2">
                {formData.tenants.map((tenant, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span>
                      {tenant.firstName} {tenant.lastName}
                    </span>
                    <span className="text-gray-400">({tenant.email})</span>
                    {tenant.isPrimary && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-700">
                The lease will be created as a <strong>Draft</strong>. You can activate it from the
                leases page after review.
              </p>
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <FileText className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg">Create New Lease</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50 shrink-0">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : isCompleted
                          ? 'text-green-600'
                          : 'text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderStepContent()}</div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 border-t flex justify-between shrink-0">
          <Button type="button" variant="ghost" onClick={handleBack} disabled={currentStep === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createLeaseMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createLeaseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create Lease
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
