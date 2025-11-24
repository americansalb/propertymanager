import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2 } from 'lucide-react';
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
import { Label } from '../ui/label';

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
  'MULTIFAMILY',
  'SINGLE_FAMILY',
  'COMMERCIAL',
  'MIXED_USE',
  'STUDENT_HOUSING',
  'SENIOR_LIVING',
];

const PROPERTY_STATUSES = ['ACTIVE', 'INACTIVE', 'UNDER_CONSTRUCTION'];

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
      // Initialize with defaults for create mode
      setFormData({
        name: '',
        type: 'MULTIFAMILY',
        status: 'ACTIVE',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US',
        totalUnits: 1,
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
      setErrors({
        submit: error.response?.data?.message || 'Failed to create property',
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
      setErrors({
        submit: error.response?.data?.message || 'Failed to update property',
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

    // Prepare data for submission
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
      totalUnits: Number(formData.totalUnits),
    };

    // Add optional fields if provided
    if (formData.yearBuilt) {
      dataToSubmit.yearBuilt = Number(formData.yearBuilt);
    }
    if (formData.squareFeet) {
      dataToSubmit.squareFeet = Number(formData.squareFeet);
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
      <DialogContent>
        <DialogHeader onClose={() => onOpenChange(false)}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-6 h-6 text-primary" />
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
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h3>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Property Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Sunset Apartments"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Property Type *</Label>
                    <select
                      id="type"
                      value={formData.type || ''}
                      onChange={(e) => handleChange('type', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {PROPERTY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <select
                      id="status"
                      value={formData.status || ''}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {PROPERTY_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Address</h3>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="address1">Street Address *</Label>
                  <Input
                    id="address1"
                    value={formData.address1 || ''}
                    onChange={(e) => handleChange('address1', e.target.value)}
                    placeholder="123 Main Street"
                    className={errors.address1 ? 'border-red-500' : ''}
                  />
                  {errors.address1 && (
                    <p className="text-sm text-red-600 mt-1">{errors.address1}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="address2">Apt, Suite, etc. (Optional)</Label>
                  <Input
                    id="address2"
                    value={formData.address2 || ''}
                    onChange={(e) => handleChange('address2', e.target.value)}
                    placeholder="Suite 100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="San Francisco"
                      className={errors.city ? 'border-red-500' : ''}
                    />
                    {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state || ''}
                      onChange={(e) => handleChange('state', e.target.value)}
                      placeholder="CA"
                      maxLength={2}
                      className={errors.state ? 'border-red-500' : ''}
                    />
                    {errors.state && <p className="text-sm text-red-600 mt-1">{errors.state}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zipCode">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode || ''}
                      onChange={(e) => handleChange('zipCode', e.target.value)}
                      placeholder="94102"
                      className={errors.zipCode ? 'border-red-500' : ''}
                    />
                    {errors.zipCode && (
                      <p className="text-sm text-red-600 mt-1">{errors.zipCode}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country || 'US'}
                      onChange={(e) => handleChange('country', e.target.value)}
                      placeholder="US"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Property Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="totalUnits">Total Units *</Label>
                  <Input
                    id="totalUnits"
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

                <div>
                  <Label htmlFor="yearBuilt">Year Built</Label>
                  <Input
                    id="yearBuilt"
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

                <div>
                  <Label htmlFor="squareFeet">Square Feet</Label>
                  <Input
                    id="squareFeet"
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

            {/* Error Message */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
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
