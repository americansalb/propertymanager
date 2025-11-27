import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Home, Loader2, X } from 'lucide-react';
import api from '../../services/api';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface Unit {
  id: string;
  unitNumber: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  marketRent: number;
  status: string;
  floor: number | null;
  features: string[];
}

interface UnitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
  propertyId: string;
  propertyName: string;
}

const UNIT_TYPES = [
  { value: 'STUDIO', label: 'Studio' },
  { value: 'ONE_BED', label: '1 Bedroom' },
  { value: 'TWO_BED', label: '2 Bedroom' },
  { value: 'THREE_BED', label: '3 Bedroom' },
  { value: 'FOUR_PLUS_BED', label: '4+ Bedroom' },
];

const UNIT_STATUSES = [
  { value: 'VACANT', label: 'Vacant' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'NOTICE', label: 'Notice' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
];

export default function UnitModal({
  open,
  onOpenChange,
  unit,
  propertyId,
  propertyName,
}: UnitModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    unitNumber: '',
    type: 'ONE_BED',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: '',
    marketRent: '',
    status: 'VACANT',
    floor: '',
    features: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!unit;

  useEffect(() => {
    if (unit) {
      setFormData({
        unitNumber: unit.unitNumber,
        type: unit.type,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        squareFeet: unit.squareFeet?.toString() || '',
        marketRent: unit.marketRent.toString(),
        status: unit.status,
        floor: unit.floor?.toString() || '',
        features: unit.features?.join(', ') || '',
      });
    } else {
      setFormData({
        unitNumber: '',
        type: 'ONE_BED',
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: '',
        marketRent: '',
        status: 'VACANT',
        floor: '',
        features: '',
      });
    }
    setErrors({});
  }, [unit, open]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/units', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create unit';
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/units/${unit!.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update unit';
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.unitNumber.trim()) {
      newErrors.unitNumber = 'Unit number is required';
    }
    if (!formData.marketRent || parseFloat(formData.marketRent) <= 0) {
      newErrors.marketRent = 'Market rent must be greater than 0';
    }
    if (formData.bedrooms < 0) {
      newErrors.bedrooms = 'Bedrooms cannot be negative';
    }
    if (formData.bathrooms < 0) {
      newErrors.bathrooms = 'Bathrooms cannot be negative';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const submitData: any = {
      propertyId,
      unitNumber: formData.unitNumber.trim(),
      type: formData.type,
      bedrooms: Number(formData.bedrooms),
      bathrooms: Number(formData.bathrooms),
      marketRent: parseFloat(formData.marketRent),
      status: formData.status,
    };

    if (formData.squareFeet) {
      submitData.squareFeet = parseInt(formData.squareFeet);
    }
    if (formData.floor) {
      submitData.floor = parseInt(formData.floor);
    }
    if (formData.features.trim()) {
      submitData.features = formData.features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
    }

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <Home className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg">
                {isEditing ? 'Edit Unit' : 'Add New Unit'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                {propertyName}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Unit Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number *</label>
              <Input
                value={formData.unitNumber}
                onChange={(e) => handleChange('unitNumber', e.target.value)}
                placeholder="e.g. 101, A1"
                className={errors.unitNumber ? 'border-red-500' : ''}
              />
              {errors.unitNumber && (
                <p className="text-sm text-red-600 mt-1">{errors.unitNumber}</p>
              )}
            </div>

            {/* Unit Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full h-10 border rounded-md px-3 text-sm"
              >
                {UNIT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
              <Input
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={(e) => handleChange('bedrooms', parseInt(e.target.value) || 0)}
                className={errors.bedrooms ? 'border-red-500' : ''}
              />
              {errors.bedrooms && <p className="text-sm text-red-600 mt-1">{errors.bedrooms}</p>}
            </div>

            {/* Bathrooms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => handleChange('bathrooms', parseFloat(e.target.value) || 0)}
                className={errors.bathrooms ? 'border-red-500' : ''}
              />
              {errors.bathrooms && <p className="text-sm text-red-600 mt-1">{errors.bathrooms}</p>}
            </div>

            {/* Square Feet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
              <Input
                type="number"
                min="0"
                value={formData.squareFeet}
                onChange={(e) => handleChange('squareFeet', e.target.value)}
                placeholder="Optional"
              />
            </div>

            {/* Market Rent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Market Rent *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.marketRent}
                  onChange={(e) => handleChange('marketRent', e.target.value)}
                  className={`pl-7 ${errors.marketRent ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                />
              </div>
              {errors.marketRent && (
                <p className="text-sm text-red-600 mt-1">{errors.marketRent}</p>
              )}
            </div>

            {/* Floor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
              <Input
                type="number"
                value={formData.floor}
                onChange={(e) => handleChange('floor', e.target.value)}
                placeholder="Optional"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full h-10 border rounded-md px-3 text-sm"
              >
                {UNIT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Features (comma-separated)
            </label>
            <Input
              value={formData.features}
              onChange={(e) => handleChange('features', e.target.value)}
              placeholder="e.g. Washer/Dryer, Balcony, Pet Friendly"
            />
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Saving...' : 'Creating...'}
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Unit'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
