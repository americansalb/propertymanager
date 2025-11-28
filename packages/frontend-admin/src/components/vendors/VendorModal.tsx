import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Loader2, X } from 'lucide-react';
import api from '../../services/api';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface Vendor {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  type: string;
  status: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  taxId?: string;
  paymentTerms?: string;
  licenseNumber?: string;
  notes?: string;
}

interface VendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor | null;
}

const VENDOR_TYPES = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'LANDSCAPING', label: 'Landscaping' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'GENERAL_CONTRACTOR', label: 'General Contractor' },
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'UTILITY', label: 'Utility' },
  { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services' },
  { value: 'OTHER', label: 'Other' },
];

const VENDOR_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export default function VendorModal({
  open,
  onOpenChange,
  vendor,
}: VendorModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    type: 'MAINTENANCE',
    status: 'ACTIVE',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    taxId: '',
    paymentTerms: '',
    licenseNumber: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!vendor;

  useEffect(() => {
    if (vendor) {
      setFormData({
        companyName: vendor.companyName || '',
        contactName: vendor.contactName || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        type: vendor.type || 'MAINTENANCE',
        status: vendor.status || 'ACTIVE',
        address1: vendor.address1 || '',
        address2: vendor.address2 || '',
        city: vendor.city || '',
        state: vendor.state || '',
        zipCode: vendor.zipCode || '',
        taxId: vendor.taxId || '',
        paymentTerms: vendor.paymentTerms || '',
        licenseNumber: vendor.licenseNumber || '',
        notes: vendor.notes || '',
      });
    } else {
      setFormData({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        type: 'MAINTENANCE',
        status: 'ACTIVE',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zipCode: '',
        taxId: '',
        paymentTerms: '',
        licenseNumber: '',
        notes: '',
      });
    }
    setErrors({});
  }, [vendor, open]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/vendors', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create vendor';
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/vendors/${vendor!.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update vendor';
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    if (!formData.type) {
      newErrors.type = 'Vendor type is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const submitData: any = {
      companyName: formData.companyName.trim(),
      type: formData.type,
      status: formData.status,
    };

    // Add optional fields if they have values
    if (formData.contactName.trim()) submitData.contactName = formData.contactName.trim();
    if (formData.email.trim()) submitData.email = formData.email.trim();
    if (formData.phone.trim()) submitData.phone = formData.phone.trim();
    if (formData.address1.trim()) submitData.address1 = formData.address1.trim();
    if (formData.address2.trim()) submitData.address2 = formData.address2.trim();
    if (formData.city.trim()) submitData.city = formData.city.trim();
    if (formData.state) submitData.state = formData.state;
    if (formData.zipCode.trim()) submitData.zipCode = formData.zipCode.trim();
    if (formData.taxId.trim()) submitData.taxId = formData.taxId.trim();
    if (formData.paymentTerms.trim()) submitData.paymentTerms = formData.paymentTerms.trim();
    if (formData.licenseNumber.trim()) submitData.licenseNumber = formData.licenseNumber.trim();
    if (formData.notes.trim()) submitData.notes = formData.notes.trim();

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
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Users className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg">
                {isEditing ? 'Edit Vendor' : 'Add New Vendor'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                {isEditing ? 'Update vendor information' : 'Enter vendor details below'}
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
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Enter company name"
                  className={errors.companyName ? 'border-red-500' : ''}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-600 mt-1">{errors.companyName}</p>
                )}
              </div>

              {/* Vendor Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full h-10 border rounded-md px-3 text-sm"
                >
                  {VENDOR_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.type && <p className="text-sm text-red-600 mt-1">{errors.type}</p>}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full h-10 border rounded-md px-3 text-sm"
                >
                  {VENDOR_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Contact Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <Input
                  value={formData.contactName}
                  onChange={(e) => handleChange('contactName', e.target.value)}
                  placeholder="Primary contact person"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@example.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* License Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <Input
                  value={formData.licenseNumber}
                  onChange={(e) => handleChange('licenseNumber', e.target.value)}
                  placeholder="Professional license #"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Address</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Address Line 1 */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <Input
                  value={formData.address1}
                  onChange={(e) => handleChange('address1', e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>

              {/* Address Line 2 */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <Input
                  value={formData.address2}
                  onChange={(e) => handleChange('address2', e.target.value)}
                  placeholder="Suite, Unit, etc."
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="City"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="w-full h-10 border rounded-md px-3 text-sm"
                >
                  <option value="">Select State</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              {/* ZIP Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <Input
                  value={formData.zipCode}
                  onChange={(e) => handleChange('zipCode', e.target.value)}
                  placeholder="12345"
                />
              </div>
            </div>
          </div>

          {/* Billing & Tax */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Billing & Tax</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Tax ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID / EIN
                </label>
                <Input
                  value={formData.taxId}
                  onChange={(e) => handleChange('taxId', e.target.value)}
                  placeholder="XX-XXXXXXX"
                />
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) => handleChange('paymentTerms', e.target.value)}
                  className="w-full h-10 border rounded-md px-3 text-sm"
                >
                  <option value="">Select Terms</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about this vendor..."
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm"
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
                'Add Vendor'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
