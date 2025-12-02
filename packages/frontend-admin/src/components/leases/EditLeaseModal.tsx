import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, X, AlertTriangle, Lock } from 'lucide-react';
import api from '../../services/api';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isPrimary: boolean;
}

interface Lease {
  id: string;
  type: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'CANCELLED';
  startDate: string;
  endDate?: string;
  moveInDate?: string;
  monthlyRent: number;
  securityDeposit: number;
  terms?: Record<string, unknown>;
  documentUrl?: string;
  unit: {
    id: string;
    unitNumber: string;
    property: {
      id: string;
      name: string;
      address1: string;
      city: string;
      state: string;
    };
  };
  tenants: Tenant[];
}

interface EditLeaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: Lease | null;
}

const LEASE_TYPES = [
  { value: 'FIXED_TERM', label: 'Fixed Term' },
  { value: 'MONTH_TO_MONTH', label: 'Month-to-Month' },
];

export default function EditLeaseModal({ open, onOpenChange, lease }: EditLeaseModalProps) {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    type: 'FIXED_TERM',
    startDate: '',
    endDate: '',
    moveInDate: '',
    monthlyRent: '',
    securityDeposit: '',
    documentUrl: '',
  });

  const isTerminated = lease?.status === 'TERMINATED';
  const isCancelled = lease?.status === 'CANCELLED';
  const isExpired = lease?.status === 'EXPIRED';
  const isReadOnly = isTerminated || isCancelled || isExpired;
  const isActive = lease?.status === 'ACTIVE';

  // Populate form when lease changes
  useEffect(() => {
    if (lease && open) {
      setFormData({
        type: lease.type,
        startDate: lease.startDate ? lease.startDate.split('T')[0] : '',
        endDate: lease.endDate ? lease.endDate.split('T')[0] : '',
        moveInDate: lease.moveInDate ? lease.moveInDate.split('T')[0] : '',
        monthlyRent: lease.monthlyRent.toString(),
        securityDeposit: lease.securityDeposit.toString(),
        documentUrl: lease.documentUrl || '',
      });
      setErrors({});
    }
  }, [lease, open]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/leases/${lease!.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['lease', lease?.id] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update lease';
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (formData.type === 'FIXED_TERM' && !formData.endDate) {
      newErrors.endDate = 'End date is required for fixed-term leases';
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    const data: any = {
      monthlyRent: parseFloat(formData.monthlyRent),
      securityDeposit: parseFloat(formData.securityDeposit || '0'),
    };

    // Only include fields that can be edited based on lease status
    if (!isActive) {
      // DRAFT leases can change type and start date
      data.type = formData.type;
      data.startDate = formData.startDate;
    }

    // End date and move-in date can be updated for both DRAFT and ACTIVE
    if (formData.endDate) {
      data.endDate = formData.endDate;
    }
    if (formData.moveInDate) {
      data.moveInDate = formData.moveInDate;
    }
    if (formData.documentUrl) {
      data.documentUrl = formData.documentUrl;
    }

    updateMutation.mutate(data);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!lease) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <FileText className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg">Edit Lease</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                {lease.unit.property.name} - Unit {lease.unit.unitNumber}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                lease.status === 'ACTIVE'
                  ? 'bg-green-500/20 text-green-300'
                  : lease.status === 'DRAFT'
                    ? 'bg-gray-500/20 text-gray-300'
                    : lease.status === 'TERMINATED'
                      ? 'bg-red-500/20 text-red-300'
                      : lease.status === 'CANCELLED'
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'bg-yellow-500/20 text-yellow-300'
              }`}
            >
              {lease.status}
            </span>
            <button
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Read-only warning */}
        {isReadOnly && (
          <div className="mx-6 mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">This lease cannot be edited</p>
              <p className="text-sm text-yellow-600 mt-1">
                {isTerminated && 'Terminated leases are locked and cannot be modified.'}
                {isCancelled && 'Cancelled leases are locked and cannot be modified.'}
                {isExpired && 'Expired leases are locked and cannot be modified.'}
              </p>
            </div>
          </div>
        )}

        {/* Active lease restrictions notice */}
        {isActive && !isReadOnly && (
          <div className="mx-6 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Limited editing available</p>
              <p className="text-sm text-blue-600 mt-1">
                Active leases have restrictions. Start date and lease type cannot be changed.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Unit Information (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              Property & Unit (Cannot be changed)
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Property</p>
                <p className="font-medium">{lease.unit.property.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Unit</p>
                <p className="font-medium">Unit {lease.unit.unitNumber}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Address</p>
                <p className="font-medium">
                  {lease.unit.property.address1}, {lease.unit.property.city},{' '}
                  {lease.unit.property.state}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Lease Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lease Type {isActive && <Lock className="w-3 h-3 inline text-gray-400 ml-1" />}
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full h-10 border rounded-md px-3 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={isReadOnly || isActive}
              >
                {LEASE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date * {isActive && <Lock className="w-3 h-3 inline text-gray-400 ml-1" />}
              </label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className={`${errors.startDate ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:cursor-not-allowed`}
                disabled={isReadOnly || isActive}
              />
              {errors.startDate && <p className="text-sm text-red-600 mt-1">{errors.startDate}</p>}
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date {formData.type === 'FIXED_TERM' ? '*' : ''}
              </label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className={`${errors.endDate ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:cursor-not-allowed`}
                disabled={isReadOnly}
              />
              {errors.endDate && <p className="text-sm text-red-600 mt-1">{errors.endDate}</p>}
            </div>

            {/* Move-in Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Move-in Date</label>
              <Input
                type="date"
                value={formData.moveInDate}
                onChange={(e) => handleChange('moveInDate', e.target.value)}
                className="disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={isReadOnly}
              />
            </div>

            {/* Monthly Rent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthlyRent}
                  onChange={(e) => handleChange('monthlyRent', e.target.value)}
                  className={`pl-7 ${errors.monthlyRent ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:cursor-not-allowed`}
                  placeholder="0.00"
                  disabled={isReadOnly}
                />
              </div>
              {errors.monthlyRent && (
                <p className="text-sm text-red-600 mt-1">{errors.monthlyRent}</p>
              )}
            </div>

            {/* Security Deposit */}
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
                  onChange={(e) => handleChange('securityDeposit', e.target.value)}
                  className={`pl-7 ${errors.securityDeposit ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:cursor-not-allowed`}
                  placeholder="0.00"
                  disabled={isReadOnly}
                />
              </div>
              {errors.securityDeposit && (
                <p className="text-sm text-red-600 mt-1">{errors.securityDeposit}</p>
              )}
            </div>
          </div>

          {/* Document URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document URL</label>
            <Input
              type="url"
              value={formData.documentUrl}
              onChange={(e) => handleChange('documentUrl', e.target.value)}
              placeholder="https://example.com/lease-document.pdf"
              className="disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isReadOnly}
            />
            <p className="text-xs text-gray-500 mt-1">Link to signed lease document (optional)</p>
          </div>

          {/* Tenants Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Tenants on Lease</h4>
            <div className="space-y-2">
              {lease.tenants.length > 0 ? (
                lease.tenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center gap-2 text-sm">
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
                ))
              ) : (
                <p className="text-sm text-gray-500">No tenants on this lease</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">Manage tenants from the lease detail page</p>
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
              {isReadOnly ? 'Close' : 'Cancel'}
            </Button>
            {!isReadOnly && (
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
