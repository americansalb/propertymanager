import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Home, Hammer, Briefcase, Calendar, Hash, Ruler } from 'lucide-react';
import api from '../../services/api';
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

interface Property {
  id: string;
  name: string;
  type: string;
  status: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  yearBuilt?: number;
  totalUnits: number;
  squareFeet?: number;
}

interface PropertyEditModalProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROPERTY_TYPES = [
  {
    value: 'MULTIFAMILY',
    label: 'Multifamily',
    icon: Building2,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    value: 'SINGLE_FAMILY',
    label: 'Single Family',
    icon: Home,
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    value: 'COMMERCIAL',
    label: 'Commercial',
    icon: Briefcase,
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    value: 'MIXED_USE',
    label: 'Mixed Use',
    icon: Building2,
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    value: 'STUDENT_HOUSING',
    label: 'Student Housing',
    icon: Home,
    className: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  {
    value: 'SENIOR_LIVING',
    label: 'Senior Living',
    icon: Home,
    className: 'bg-teal-50 text-teal-700 border-teal-200',
  },
];

const PROPERTY_STATUSES = [
  { value: 'ACTIVE', label: 'Active', className: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'INACTIVE', label: 'Inactive', className: 'bg-gray-50 text-gray-700 border-gray-200' },
  {
    value: 'UNDER_CONSTRUCTION',
    label: 'Under Construction',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
];

export default function PropertyEditModal({
  property,
  open,
  onOpenChange,
}: PropertyEditModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<Property>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when property changes
  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        type: property.type,
        status: property.status,
        address1: property.address1,
        address2: property.address2 || '',
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        country: property.country,
        yearBuilt: property.yearBuilt || undefined,
        totalUnits: property.totalUnits,
        squareFeet: property.squareFeet || undefined,
      });
      setErrors({});
    } else {
      // Initialize with smart defaults for create mode
      setFormData({
        name: '',
        type: 'MULTIFAMILY', // Most common property type
        status: 'ACTIVE', // Default to active status
        address1: '',
        address2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US', // Default country
        totalUnits: 1, // Minimum units
        yearBuilt: undefined,
        squareFeet: undefined,
      });
      setErrors({});
    }
  }, [property, open]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Property>) => {
      const response = await api.post('/properties', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Failed to create property:', error);

      // Extract error message from NestJS validation error format
      let errorMessage = 'Failed to create property';
      if (error.response?.data?.message) {
        const msg = error.response.data.message;
        // NestJS ValidationPipe returns array of error messages
        if (Array.isArray(msg)) {
          errorMessage = msg.join(', ');
        } else {
          errorMessage = msg;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrors({
        submit: errorMessage,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Property>) => {
      if (!property?.id) throw new Error('Property ID is required');
      const response = await api.put(`/properties/${property.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Failed to update property:', error);

      // Extract error message from NestJS validation error format
      let errorMessage = 'Failed to update property';
      if (error.response?.data?.message) {
        const msg = error.response.data.message;
        // NestJS ValidationPipe returns array of error messages
        if (Array.isArray(msg)) {
          errorMessage = msg.join(', ');
        } else {
          errorMessage = msg;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrors({
        submit: errorMessage,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = 'Property name is required';
    if (!formData.address1?.trim()) newErrors.address1 = 'Address is required';
    if (!formData.city?.trim()) newErrors.city = 'City is required';
    if (!formData.state?.trim()) newErrors.state = 'State is required';
    if (!formData.zipCode?.trim()) newErrors.zipCode = 'ZIP code is required';
    if (!formData.totalUnits || formData.totalUnits < 1) {
      newErrors.totalUnits = 'Total units must be at least 1';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare data for submission with robust numeric handling
    const totalUnits = Number(formData.totalUnits);
    const yearBuilt = formData.yearBuilt ? Number(formData.yearBuilt) : undefined;
    const squareFeet = formData.squareFeet ? Number(formData.squareFeet) : undefined;

    // Validate numeric fields to ensure no NaN values
    if (isNaN(totalUnits) || totalUnits < 1) {
      setErrors({ totalUnits: 'Total units must be a valid number (at least 1)' });
      return;
    }
    if (yearBuilt !== undefined && isNaN(yearBuilt)) {
      setErrors({ yearBuilt: 'Year built must be a valid number' });
      return;
    }
    if (squareFeet !== undefined && isNaN(squareFeet)) {
      setErrors({ squareFeet: 'Square feet must be a valid number' });
      return;
    }

    const dataToSubmit: any = {
      name: formData.name,
      type: formData.type,
      status: formData.status,
      address1: formData.address1,
      address2: formData.address2 || null,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      country: formData.country || 'US',
      totalUnits,
    };

    // Add optional fields only if they have valid values
    if (yearBuilt !== undefined) {
      dataToSubmit.yearBuilt = yearBuilt;
    }
    if (squareFeet !== undefined) {
      dataToSubmit.squareFeet = squareFeet;
    }

    // Call create or update based on whether property exists
    if (property) {
      updateMutation.mutate(dataToSubmit);
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleChange = (field: keyof Property, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isCreating = !property;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        {/* Header with gradient icon */}
        <DialogHeader onClose={() => onOpenChange(false)}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>{isCreating ? 'Add Property' : 'Edit Property'}</DialogTitle>
              <DialogDescription>
                {isCreating
                  ? 'Create a new property in your portfolio'
                  : 'Update property details and information'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* 2-COLUMN GRID LAYOUT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            {/* MAIN COLUMN - Property Information (col-span-2) */}
            <div className="md:col-span-2 space-y-6">
              {/* Property Name - Document Header Style */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Property Name
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Sunset Apartments"
                  className={`w-full text-xl font-medium border-0 border-b-2 ${
                    errors.name ? 'border-red-500' : 'border-gray-200'
                  } focus:border-blue-500 focus:outline-none px-0 py-2 transition-colors placeholder:text-gray-400`}
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              </div>

              {/* Address Section - Tight Grid */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                  Property Address
                </label>

                {/* Street Address - Full Width */}
                <div>
                  <Input
                    value={formData.address1 || ''}
                    onChange={(e) => handleChange('address1', e.target.value)}
                    placeholder="123 Main Street"
                    className={errors.address1 ? 'border-red-500' : ''}
                  />
                  {errors.address1 && (
                    <p className="text-sm text-red-600 mt-1">{errors.address1}</p>
                  )}
                </div>

                {/* Apt/Suite - Full Width */}
                <div>
                  <Input
                    value={formData.address2 || ''}
                    onChange={(e) => handleChange('address2', e.target.value)}
                    placeholder="Apt, Suite, etc. (Optional)"
                  />
                </div>

                {/* City/State/Zip - ONE LINE (grid-cols-3) */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <Input
                      value={formData.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="City"
                      className={errors.city ? 'border-red-500' : ''}
                    />
                    {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
                  </div>

                  <div className="col-span-1">
                    <Input
                      value={formData.state || ''}
                      onChange={(e) => handleChange('state', e.target.value)}
                      placeholder="ST"
                      maxLength={2}
                      className={errors.state ? 'border-red-500' : ''}
                    />
                    {errors.state && <p className="text-sm text-red-600 mt-1">{errors.state}</p>}
                  </div>

                  <div className="col-span-1">
                    <Input
                      value={formData.zipCode || ''}
                      onChange={(e) => handleChange('zipCode', e.target.value)}
                      placeholder="ZIP"
                      className={errors.zipCode ? 'border-red-500' : ''}
                    />
                    {errors.zipCode && (
                      <p className="text-sm text-red-600 mt-1">{errors.zipCode}</p>
                    )}
                  </div>
                </div>

                {/* Country */}
                <div>
                  <Input
                    value={formData.country || 'US'}
                    onChange={(e) => handleChange('country', e.target.value)}
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* SIDEBAR - Control Panel (col-span-1) */}
            <div className="md:col-span-1 bg-slate-50/50 -mr-6 -my-6 p-6 rounded-r-lg space-y-6">
              {/* Property Type - Rich Button Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 block">
                  Property Type
                </label>
                <div className="space-y-2">
                  {PROPERTY_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.type === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleChange('type', type.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                          isSelected
                            ? type.className + ' ring-2 ring-offset-1 ring-blue-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? '' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status - Rich Button Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 block">
                  Status
                </label>
                <div className="space-y-2">
                  {PROPERTY_STATUSES.map((status) => {
                    const isSelected = formData.status === status.value;
                    return (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => handleChange('status', status.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                          isSelected
                            ? status.className + ' ring-2 ring-offset-1 ring-green-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isSelected
                              ? status.value === 'ACTIVE'
                                ? 'bg-green-500'
                                : status.value === 'INACTIVE'
                                  ? 'bg-gray-400'
                                  : 'bg-orange-500'
                              : 'bg-gray-300'
                          }`}
                        />
                        <span className="text-sm font-medium">{status.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Property Stats */}
              <div className="pt-4 border-t border-slate-200">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 block">
                  Property Details
                </label>

                {/* Total Units */}
                <div className="mb-3">
                  <label className="text-xs text-gray-600 mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3 h-3" />
                    Total Units
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.totalUnits || ''}
                    onChange={(e) => handleChange('totalUnits', parseInt(e.target.value) || 0)}
                    placeholder="50"
                    className={errors.totalUnits ? 'border-red-500' : ''}
                  />
                  {errors.totalUnits && (
                    <p className="text-sm text-red-600 mt-1">{errors.totalUnits}</p>
                  )}
                </div>

                {/* Year Built */}
                <div className="mb-3">
                  <label className="text-xs text-gray-600 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Year Built
                  </label>
                  <Input
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                    value={formData.yearBuilt || ''}
                    onChange={(e) =>
                      handleChange('yearBuilt', parseInt(e.target.value) || undefined)
                    }
                    placeholder="1995"
                  />
                </div>

                {/* Square Feet */}
                <div>
                  <label className="text-xs text-gray-600 mb-1.5 flex items-center gap-1.5">
                    <Ruler className="w-3 h-3" />
                    Square Feet
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.squareFeet || ''}
                    onChange={(e) =>
                      handleChange('squareFeet', parseInt(e.target.value) || undefined)
                    }
                    placeholder="50000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md mx-6 mb-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isCreating ? 'Creating...' : 'Saving...'}
                </>
              ) : isCreating ? (
                'Create Property'
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
