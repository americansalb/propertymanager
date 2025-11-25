import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Loader2,
  Home,
  Briefcase,
  Calendar,
  Hash,
  Ruler,
  MapPin,
  Wand2,
  X,
} from 'lucide-react';
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
  const [smartPasteValue, setSmartPasteValue] = useState('');

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

  // SMART ADDRESS PASTE (Gemini's killer feature)
  const handleSmartPaste = () => {
    if (!smartPasteValue.trim()) return;

    // Simple but effective parsing logic for common formats:
    // "123 Main St, Chicago, IL 60605"
    // "123 Main Street, Suite 100, Chicago, IL 60605"
    const parts = smartPasteValue.split(',').map((s) => s.trim());

    if (parts.length >= 3) {
      const street = parts[0];
      let city = '';
      let state = '';
      let zip = '';

      // Check if second part looks like a suite/apt (contains keywords)
      const suiteKeywords = ['suite', 'apt', 'unit', '#'];
      const secondPartIsSuite = suiteKeywords.some((keyword) =>
        parts[1].toLowerCase().includes(keyword),
      );

      if (secondPartIsSuite && parts.length >= 4) {
        // Format: "123 Main St, Suite 100, Chicago, IL 60605"
        const suite = parts[1];
        city = parts[2];
        const stateZip = parts[3];
        const stateZipParts = stateZip.split(' ').filter((p) => p.length > 0);
        state = stateZipParts[0] || '';
        zip = stateZipParts[1] || '';

        setFormData((prev) => ({
          ...prev,
          name: prev.name || `${street} Property`,
          address1: street,
          address2: suite,
          city: city,
          state: state.toUpperCase(),
          zipCode: zip,
        }));
      } else {
        // Format: "123 Main St, Chicago, IL 60605"
        city = parts[1];
        const stateZip = parts[2];
        const stateZipParts = stateZip.split(' ').filter((p) => p.length > 0);
        state = stateZipParts[0] || '';
        zip = stateZipParts[1] || '';

        setFormData((prev) => ({
          ...prev,
          name: prev.name || `${street} Property`,
          address1: street,
          city: city,
          state: state.toUpperCase(),
          zipCode: zip,
        }));
      }

      setSmartPasteValue(''); // Clear the paste box
    }
  };

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
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 flex flex-col overflow-hidden">
        {/* DARK HEADER (Gemini's design) */}
        <div className="bg-slate-900 px-8 py-6 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
              <Building2 className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <DialogTitle className="text-white text-xl">
                {isCreating ? 'Add New Property' : 'Edit Property'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {isCreating
                  ? 'Create a new property in your portfolio'
                  : 'Update property details and information'}
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
            <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* MAIN COLUMN */}
              <div className="lg:col-span-7 space-y-6">
                {/* SMART PASTE CARD (Gemini's killer feature) */}
                <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-indigo-900 flex items-center gap-2 font-semibold">
                      <Wand2 className="w-4 h-4 text-indigo-600" /> Magic Address Fill
                    </label>
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                      For lazy people
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste full address (e.g. 123 Main St, Chicago, IL 60605)"
                      className="bg-white border-indigo-200 focus:ring-indigo-500"
                      value={smartPasteValue}
                      onChange={(e) => setSmartPasteValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSmartPaste();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                      onClick={handleSmartPaste}
                    >
                      Auto-Fill Form
                    </Button>
                  </div>
                </div>

                {/* Main Form Content */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                  {/* Property Name */}
                  <div className="space-y-4">
                    <label className="text-base font-semibold">Property Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="e.g. Sunset Apartments"
                      className={`w-full text-lg py-6 font-medium border rounded-lg px-4 ${
                        errors.name ? 'border-red-500' : 'border-slate-200 focus:border-indigo-500'
                      } focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors placeholder:text-gray-400`}
                    />
                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                  </div>

                  {/* Address Section */}
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <label className="text-base font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      Address
                    </label>

                    {/* Street Address */}
                    <Input
                      value={formData.address1 || ''}
                      onChange={(e) => handleChange('address1', e.target.value)}
                      placeholder="Street Address"
                      className={errors.address1 ? 'border-red-500' : ''}
                    />
                    {errors.address1 && (
                      <p className="text-sm text-red-600 mt-1">{errors.address1}</p>
                    )}

                    {/* Apt/Suite */}
                    <Input
                      value={formData.address2 || ''}
                      onChange={(e) => handleChange('address2', e.target.value)}
                      placeholder="Apt, Suite, etc. (Optional)"
                    />

                    {/* City/State/Zip - ONE LINE (grid-cols-3) */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Input
                          value={formData.city || ''}
                          onChange={(e) => handleChange('city', e.target.value)}
                          placeholder="City"
                          className={errors.city ? 'border-red-500' : ''}
                        />
                        {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
                      </div>
                      <Input
                        value={formData.state || ''}
                        onChange={(e) => handleChange('state', e.target.value)}
                        placeholder="State"
                        className={`text-center uppercase ${errors.state ? 'border-red-500' : ''}`}
                        maxLength={2}
                      />
                    </div>

                    {/* ZIP Code */}
                    <div className="w-1/2">
                      <Input
                        value={formData.zipCode || ''}
                        onChange={(e) => handleChange('zipCode', e.target.value)}
                        placeholder="ZIP Code"
                        className={errors.zipCode ? 'border-red-500' : ''}
                      />
                      {errors.zipCode && (
                        <p className="text-sm text-red-600 mt-1">{errors.zipCode}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SIDEBAR */}
              <div className="lg:col-span-5 space-y-6">
                {/* Property Type - Rich Button Selector */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <label className="text-base font-semibold">Property Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {PROPERTY_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isSelected = formData.type === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleChange('type', type.value)}
                          className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 gap-2 h-24 ${
                            isSelected
                              ? type.className + ' ring-1 ring-indigo-200 shadow-sm'
                              : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-500'
                          }`}
                        >
                          <Icon className={`w-6 h-6 ${isSelected ? '' : 'text-slate-400'}`} />
                          <span
                            className={`text-xs font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}
                          >
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status - Rich Button Selector */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <label className="text-base font-semibold">Status</label>
                  <div className="space-y-2">
                    {PROPERTY_STATUSES.map((status) => {
                      const isSelected = formData.status === status.value;
                      return (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => handleChange('status', status.value)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200'
                              : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="capitalize">
                            {status.label.replace('_', ' ').toLowerCase()}
                          </span>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Property Details */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <label className="text-base font-semibold">Property Details</label>

                  {/* Total Units */}
                  <div>
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
                  <div>
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
              <div className="p-3 bg-red-50 border border-red-200 rounded-md mx-8 mb-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </form>
        </div>

        {/* FOOTER */}
        <div className="bg-white px-8 py-5 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px]"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
