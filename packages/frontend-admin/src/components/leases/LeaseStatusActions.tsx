import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlayCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Loader2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../ui/button';
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
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';

interface Lease {
  id: string;
  type: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'CANCELLED';
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  unit: {
    unitNumber: string;
    property: {
      name: string;
    };
  };
  tenants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    isPrimary: boolean;
  }>;
}

interface LeaseStatusActionsProps {
  lease: Lease;
  onActionComplete?: () => void;
}

export default function LeaseStatusActions({ lease, onActionComplete }: LeaseStatusActionsProps) {
  const queryClient = useQueryClient();

  // Dialog states
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form states for terminate modal
  const [terminateForm, setTerminateForm] = useState({
    reason: '',
    noticeDate: new Date().toISOString().split('T')[0],
    moveOutDate: '',
  });

  // Form states for renew modal
  const [renewForm, setRenewForm] = useState({
    startDate: '',
    endDate: '',
    monthlyRent: '',
  });
  const [renewErrors, setRenewErrors] = useState<Record<string, string>>({});

  // Invalidate queries helper
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['leases'] });
    queryClient.invalidateQueries({ queryKey: ['lease', lease.id] });
    queryClient.invalidateQueries({ queryKey: ['units'] });
  };

  // ACTIVATE mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/leases/${lease.id}/activate`);
      return response.data;
    },
    onSuccess: () => {
      invalidateQueries();
      setActivateDialogOpen(false);
      onActionComplete?.();
    },
  });

  // TERMINATE mutation
  const terminateMutation = useMutation({
    mutationFn: async (data: { reason?: string; noticeDate?: string; moveOutDate?: string }) => {
      const response = await api.post(`/leases/${lease.id}/terminate`, data);
      return response.data;
    },
    onSuccess: () => {
      invalidateQueries();
      setTerminateModalOpen(false);
      setTerminateForm({
        reason: '',
        noticeDate: new Date().toISOString().split('T')[0],
        moveOutDate: '',
      });
      onActionComplete?.();
    },
  });

  // RENEW mutation
  const renewMutation = useMutation({
    mutationFn: async (data: { startDate?: string; endDate?: string; monthlyRent?: number }) => {
      const response = await api.post(`/leases/${lease.id}/renew`, data);
      return response.data;
    },
    onSuccess: () => {
      invalidateQueries();
      setRenewModalOpen(false);
      setRenewForm({ startDate: '', endDate: '', monthlyRent: '' });
      onActionComplete?.();
    },
  });

  // CANCEL mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/leases/${lease.id}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      invalidateQueries();
      setCancelDialogOpen(false);
      onActionComplete?.();
    },
  });

  // DELETE mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/leases/${lease.id}`);
      return response.data;
    },
    onSuccess: () => {
      invalidateQueries();
      setDeleteDialogOpen(false);
      onActionComplete?.();
    },
  });

  // Open renew modal with defaults
  const openRenewModal = () => {
    const defaultStart = lease.endDate
      ? new Date(new Date(lease.endDate).getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      : new Date().toISOString().split('T')[0];

    const defaultEnd = new Date(defaultStart);
    defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);

    setRenewForm({
      startDate: defaultStart,
      endDate: defaultEnd.toISOString().split('T')[0],
      monthlyRent: lease.monthlyRent.toString(),
    });
    setRenewErrors({});
    setRenewModalOpen(true);
  };

  // Validate renew form
  const validateRenewForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (renewForm.startDate && renewForm.endDate && renewForm.startDate >= renewForm.endDate) {
      errors.endDate = 'End date must be after start date';
    }
    if (renewForm.monthlyRent && parseFloat(renewForm.monthlyRent) <= 0) {
      errors.monthlyRent = 'Monthly rent must be greater than 0';
    }

    setRenewErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle renew submit
  const handleRenewSubmit = () => {
    if (!validateRenewForm()) {
      return;
    }

    const data: any = {};
    if (renewForm.startDate) {
      data.startDate = renewForm.startDate;
    }
    if (renewForm.endDate) {
      data.endDate = renewForm.endDate;
    }
    if (renewForm.monthlyRent) {
      data.monthlyRent = parseFloat(renewForm.monthlyRent);
    }

    renewMutation.mutate(data);
  };

  // Check if lease can perform actions
  const canActivate = lease.status === 'DRAFT' && lease.tenants.length > 0;
  const canTerminate = lease.status === 'ACTIVE';
  const canRenew = lease.status === 'ACTIVE' || lease.status === 'EXPIRED';
  const canCancel = lease.status === 'DRAFT';
  const canDelete = lease.status === 'DRAFT' || lease.status === 'CANCELLED';

  // Get primary tenant name
  const primaryTenant = lease.tenants.find((t) => t.isPrimary);
  const tenantName = primaryTenant
    ? `${primaryTenant.firstName} ${primaryTenant.lastName}`
    : lease.tenants.length > 0
      ? `${lease.tenants[0].firstName} ${lease.tenants[0].lastName}`
      : 'No tenant';

  return (
    <>
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Activate - for DRAFT leases */}
        {canActivate && (
          <Button
            onClick={() => setActivateDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Activate Lease
          </Button>
        )}

        {/* Cannot activate warning */}
        {lease.status === 'DRAFT' && lease.tenants.length === 0 && (
          <Button disabled variant="outline" className="text-yellow-600">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Add tenants to activate
          </Button>
        )}

        {/* Terminate - for ACTIVE leases */}
        {canTerminate && (
          <Button
            onClick={() => setTerminateModalOpen(true)}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Terminate Lease
          </Button>
        )}

        {/* Renew - for ACTIVE or EXPIRED leases */}
        {canRenew && (
          <Button onClick={openRenewModal} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Renew Lease
          </Button>
        )}

        {/* Cancel - for DRAFT leases */}
        {canCancel && (
          <Button
            onClick={() => setCancelDialogOpen(true)}
            variant="outline"
            className="border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Cancel Draft
          </Button>
        )}

        {/* Delete - for DRAFT or CANCELLED leases */}
        {canDelete && (
          <Button
            onClick={() => setDeleteDialogOpen(true)}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        )}
      </div>

      {/* ACTIVATE Confirmation Dialog */}
      <AlertDialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-green-600" />
              Activate Lease
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to activate the lease for{' '}
                <strong>Unit {lease.unit.unitNumber}</strong> at{' '}
                <strong>{lease.unit.property.name}</strong>.
              </p>
              <p>
                Primary tenant: <strong>{tenantName}</strong>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This will mark the unit as occupied and the lease will become active.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => activateMutation.mutate()}
              className="bg-green-600 hover:bg-green-700"
              disabled={activateMutation.isPending}
            >
              {activateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Activate Lease'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* TERMINATE Modal */}
      <Dialog open={terminateModalOpen} onOpenChange={setTerminateModalOpen}>
        <DialogContent className="max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Terminate Lease</DialogTitle>
              <DialogDescription>
                Unit {lease.unit.unitNumber} - {lease.unit.property.name}
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-700">
                Terminating this lease will mark the unit status as "Notice" and the lease as
                terminated.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Termination Reason
              </label>
              <textarea
                value={terminateForm.reason}
                onChange={(e) => setTerminateForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm h-24 resize-none"
                placeholder="Enter reason for termination (e.g., Lease violation, Non-payment, Mutual agreement, etc.)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notice Date</label>
                <Input
                  type="date"
                  value={terminateForm.noticeDate}
                  onChange={(e) =>
                    setTerminateForm((prev) => ({ ...prev, noticeDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Move-out Date
                </label>
                <Input
                  type="date"
                  value={terminateForm.moveOutDate}
                  onChange={(e) =>
                    setTerminateForm((prev) => ({ ...prev, moveOutDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => setTerminateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  terminateMutation.mutate({
                    reason: terminateForm.reason || undefined,
                    noticeDate: terminateForm.noticeDate || undefined,
                    moveOutDate: terminateForm.moveOutDate || undefined,
                  })
                }
                className="bg-red-600 hover:bg-red-700"
                disabled={terminateMutation.isPending}
              >
                {terminateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Terminating...
                  </>
                ) : (
                  'Terminate Lease'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* RENEW Modal */}
      <Dialog open={renewModalOpen} onOpenChange={setRenewModalOpen}>
        <DialogContent className="max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Renew Lease</DialogTitle>
              <DialogDescription>
                Unit {lease.unit.unitNumber} - {lease.unit.property.name}
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                This will create a new lease based on the current one. The current lease will be
                marked as expired.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Start Date
                </label>
                <Input
                  type="date"
                  value={renewForm.startDate}
                  onChange={(e) => {
                    setRenewForm((prev) => ({ ...prev, startDate: e.target.value }));
                    setRenewErrors((prev) => ({ ...prev, startDate: '' }));
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New End Date</label>
                <Input
                  type="date"
                  value={renewForm.endDate}
                  onChange={(e) => {
                    setRenewForm((prev) => ({ ...prev, endDate: e.target.value }));
                    setRenewErrors((prev) => ({ ...prev, endDate: '' }));
                  }}
                  className={renewErrors.endDate ? 'border-red-500' : ''}
                />
                {renewErrors.endDate && (
                  <p className="text-xs text-red-600 mt-1">{renewErrors.endDate}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Monthly Rent
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={renewForm.monthlyRent}
                  onChange={(e) => {
                    setRenewForm((prev) => ({ ...prev, monthlyRent: e.target.value }));
                    setRenewErrors((prev) => ({ ...prev, monthlyRent: '' }));
                  }}
                  className={`pl-7 ${renewErrors.monthlyRent ? 'border-red-500' : ''}`}
                />
              </div>
              {renewErrors.monthlyRent && (
                <p className="text-xs text-red-600 mt-1">{renewErrors.monthlyRent}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Current rent: ${Number(lease.monthlyRent).toLocaleString()}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => setRenewModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenewSubmit} disabled={renewMutation.isPending}>
                {renewMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Create Renewal
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CANCEL Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-orange-600" />
              Cancel Draft Lease
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>
                Are you sure you want to cancel this draft lease for{' '}
                <strong>Unit {lease.unit.unitNumber}</strong>?
              </p>
              <p className="mt-2 text-sm text-gray-500">
                The lease will be marked as cancelled and the unit will be reverted to vacant
                status.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Draft</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate()}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Cancel Draft'
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
              Delete Lease
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>
                Are you sure you want to permanently delete this lease for{' '}
                <strong>Unit {lease.unit.unitNumber}</strong>?
              </p>
              <p className="mt-2 text-sm text-red-600 font-medium">
                This action cannot be undone. All tenant records associated with this lease will
                also be deleted.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete Permanently'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
