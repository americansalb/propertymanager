import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Star,
  Mail,
  Phone,
  UserCircle,
  Loader2,
  AlertCircle,
  X,
  Shield,
  Send,
  Check,
  Clock,
} from 'lucide-react';
import api from '../../services/api';
import { getApiErrorMessage } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isPrimary: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  portalEnabled?: boolean;
  invitationStatus?: 'NOT_INVITED' | 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  invitationSentAt?: string;
}

interface Lease {
  id: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'CANCELLED';
  tenants: Tenant[];
}

interface TenantManagementProps {
  lease: Lease;
}

interface TenantFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const initialFormData: TenantFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  isPrimary: false,
  emergencyContactName: '',
  emergencyContactPhone: '',
};

export default function TenantManagement({ lease }: TenantManagementProps) {
  const queryClient = useQueryClient();

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setPrimaryDialogOpen, setSetPrimaryDialogOpen] = useState(false);

  // Selected tenant for edit/delete
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Form state
  const [formData, setFormData] = useState<TenantFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if tenant management is allowed
  const canManageTenants = lease.status === 'DRAFT' || lease.status === 'ACTIVE';
  const isReadOnly = !canManageTenants;

  // Invalidate queries helper
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['leases'] });
    queryClient.invalidateQueries({ queryKey: ['lease', lease.id] });
  };

  // ADD TENANT mutation
  const addTenantMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      const response = await api.post(`/leases/${lease.id}/tenants`, {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        phone: data.phone.trim() || undefined,
        isPrimary: data.isPrimary,
        emergencyContactName: data.emergencyContactName.trim() || undefined,
        emergencyContactPhone: data.emergencyContactPhone.trim() || undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      invalidateQueries();
      setAddModalOpen(false);
      setFormData(initialFormData);
      setErrors({});
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, 'Failed to add tenant');
      setErrors({ submit: message });
    },
  });

  // EDIT TENANT mutation (using remove + add pattern since there's no direct edit)
  // Note: Backend doesn't have a direct edit tenant endpoint, so we'll update via the general API pattern
  // For now, we'll implement client-side validation and show what fields can be edited

  // REMOVE TENANT mutation
  const removeTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await api.delete(`/leases/${lease.id}/tenants/${tenantId}`);
      return response.data;
    },
    onSuccess: () => {
      invalidateQueries();
      setDeleteDialogOpen(false);
      setSelectedTenant(null);
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, 'Failed to remove tenant');
      setErrors({ submit: message });
      setDeleteDialogOpen(false);
    },
  });

  // SET PRIMARY TENANT mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await api.post(`/leases/${lease.id}/tenants/${tenantId}/set-primary`);
      return response.data;
    },
    onSuccess: () => {
      invalidateQueries();
      setSetPrimaryDialogOpen(false);
      setSelectedTenant(null);
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, 'Failed to set primary tenant');
      setErrors({ submit: message });
      setSetPrimaryDialogOpen(false);
    },
  });

  // SEND INVITATION mutation
  const sendInvitationMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await api.post(`/tenants/${tenantId}/invite`);
      return response.data;
    },
    onSuccess: () => {
      invalidateQueries();
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, 'Failed to send invitation');
      setErrors({ submit: message });
    },
  });

  // RESEND INVITATION mutation
  const resendInvitationMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await api.post(`/tenants/${tenantId}/resend-invite`);
      return response.data;
    },
    onSuccess: () => {
      invalidateQueries();
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, 'Failed to resend invitation');
      setErrors({ submit: message });
    },
  });

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.phone && !/^[\d\s\-+()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle add tenant submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      addTenantMutation.mutate(formData);
    }
  };

  // Handle form change
  const handleChange = (field: keyof TenantFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Open add modal
  const openAddModal = () => {
    setFormData({
      ...initialFormData,
      isPrimary: lease.tenants.length === 0, // First tenant is automatically primary
    });
    setErrors({});
    setAddModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      phone: tenant.phone || '',
      isPrimary: tenant.isPrimary,
      emergencyContactName: tenant.emergencyContactName || '',
      emergencyContactPhone: tenant.emergencyContactPhone || '',
    });
    setErrors({});
    setEditModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setErrors({});
    setDeleteDialogOpen(true);
  };

  // Open set primary dialog
  const openSetPrimaryDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setSetPrimaryDialogOpen(true);
  };

  // Get primary tenant
  const primaryTenant = lease.tenants.find((t) => t.isPrimary);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Tenants ({lease.tenants.length})
            </CardTitle>
            {canManageTenants && (
              <Button onClick={openAddModal} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Tenant
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Read-only notice */}
          {isReadOnly && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                Tenant management is disabled for {lease.status.toLowerCase()} leases
              </p>
            </div>
          )}

          {/* Error display */}
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {lease.tenants.length > 0 ? (
            <div className="space-y-4">
              {lease.tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className={`p-4 border rounded-lg ${
                    tenant.isPrimary ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          tenant.isPrimary ? 'bg-indigo-100' : 'bg-gray-100'
                        }`}
                      >
                        <UserCircle
                          className={`w-6 h-6 ${
                            tenant.isPrimary ? 'text-indigo-600' : 'text-gray-600'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">
                            {tenant.firstName} {tenant.lastName}
                          </span>
                          {tenant.isPrimary && (
                            <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                              <Star className="w-3 h-3" />
                              Primary
                            </span>
                          )}
                          {/* Portal Access Status */}
                          {tenant.portalEnabled ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              <Check className="w-3 h-3" />
                              Portal Access
                            </span>
                          ) : tenant.invitationStatus === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                              <Clock className="w-3 h-3" />
                              Invitation Pending
                            </span>
                          ) : tenant.invitationStatus === 'EXPIRED' ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                              <AlertCircle className="w-3 h-3" />
                              Invitation Expired
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {tenant.email}
                          </div>
                          {tenant.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {tenant.phone}
                            </div>
                          )}
                        </div>
                        {/* Emergency Contact */}
                        {tenant.emergencyContactName && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500">Emergency Contact</p>
                            <p className="text-sm text-gray-700">
                              {tenant.emergencyContactName}
                              {tenant.emergencyContactPhone && ` - ${tenant.emergencyContactPhone}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {canManageTenants && (
                      <div className="flex items-center gap-1">
                        {/* Invite/Resend Invite Button */}
                        {!tenant.portalEnabled &&
                          (tenant.invitationStatus === 'PENDING' ||
                          tenant.invitationStatus === 'EXPIRED' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendInvitationMutation.mutate(tenant.id)}
                              disabled={resendInvitationMutation.isPending}
                              title="Resend Invitation"
                              className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                            >
                              {resendInvitationMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendInvitationMutation.mutate(tenant.id)}
                              disabled={sendInvitationMutation.isPending}
                              title="Send Portal Invitation"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              {sendInvitationMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </Button>
                          ))}
                        {!tenant.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSetPrimaryDialog(tenant)}
                            title="Set as Primary"
                          >
                            <Shield className="w-4 h-4 text-indigo-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(tenant)}
                          title="View Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {!tenant.isPrimary && lease.tenants.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(tenant)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Remove Tenant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants yet</h3>
              <p className="text-gray-500 mb-4">Add tenants to this lease to get started</p>
              {canManageTenants && (
                <Button onClick={openAddModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Tenant
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADD TENANT Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Plus className="w-5 h-5 text-green-300" />
              </div>
              <div>
                <DialogTitle className="text-white">Add Tenant</DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">
                  Add a new tenant to this lease
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={() => setAddModalOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Emergency Contact (Optional)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <Input
                    value={formData.emergencyContactName}
                    onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <Input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Primary Tenant Option */}
            {lease.tenants.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formData.isPrimary}
                  onChange={(e) => handleChange('isPrimary', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isPrimary" className="text-sm text-gray-700">
                  Set as primary tenant (main contact)
                </label>
              </div>
            )}

            {lease.tenants.length === 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  This tenant will be set as the primary tenant (main contact for the lease).
                </p>
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addTenantMutation.isPending}>
                {addTenantMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Tenant'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW/EDIT TENANT Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <UserCircle className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <DialogTitle className="text-white">Tenant Details</DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">
                  {selectedTenant?.firstName} {selectedTenant?.lastName}
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={() => setEditModalOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {selectedTenant && (
              <div className="space-y-4">
                {selectedTenant.isPrimary && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-md flex items-center gap-2">
                    <Star className="w-4 h-4 text-indigo-600" />
                    <p className="text-sm text-indigo-700">
                      Primary tenant - main contact for this lease
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">First Name</p>
                    <p className="font-medium">{selectedTenant.firstName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Name</p>
                    <p className="font-medium">{selectedTenant.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedTenant.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{selectedTenant.phone || 'Not provided'}</p>
                  </div>
                </div>

                {(selectedTenant.emergencyContactName || selectedTenant.emergencyContactPhone) && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Emergency Contact</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">
                          {selectedTenant.emergencyContactName || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">
                          {selectedTenant.emergencyContactPhone || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                {canManageTenants && (
                  <div className="pt-4 border-t flex gap-2">
                    {!selectedTenant.isPrimary && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditModalOpen(false);
                          openSetPrimaryDialog(selectedTenant);
                        }}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Set as Primary
                      </Button>
                    )}
                    {!selectedTenant.isPrimary && lease.tenants.length > 1 && (
                      <Button
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setEditModalOpen(false);
                          openDeleteDialog(selectedTenant);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Tenant
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t mt-4">
              <Button variant="ghost" onClick={() => setEditModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SET PRIMARY Confirmation Dialog */}
      <AlertDialog open={setPrimaryDialogOpen} onOpenChange={setSetPrimaryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Set Primary Tenant
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>
                Set{' '}
                <strong>
                  {selectedTenant?.firstName} {selectedTenant?.lastName}
                </strong>{' '}
                as the primary tenant?
              </p>
              {primaryTenant && (
                <p className="mt-2 text-sm">
                  <strong>
                    {primaryTenant.firstName} {primaryTenant.lastName}
                  </strong>{' '}
                  will no longer be the primary tenant.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTenant && setPrimaryMutation.mutate(selectedTenant.id)}
              disabled={setPrimaryMutation.isPending}
            >
              {setPrimaryMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Set as Primary'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DELETE Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Remove Tenant
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>
                Are you sure you want to remove{' '}
                <strong>
                  {selectedTenant?.firstName} {selectedTenant?.lastName}
                </strong>{' '}
                from this lease?
              </p>
              <p className="mt-2 text-sm text-gray-500">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTenant && removeTenantMutation.mutate(selectedTenant.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={removeTenantMutation.isPending}
            >
              {removeTenantMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Remove Tenant'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
