import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Building2,
  Mail,
  Phone,
  MapPin,
  Shield,
} from 'lucide-react';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface PendingVendor {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  type: string;
  licenseNumber?: string;
  insuranceExpiryDate?: string;
  createdAt: string;
}

export default function PendingVendorsSection() {
  const queryClient = useQueryClient();
  const [selectedVendor, setSelectedVendor] = useState<PendingVendor | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: pendingVendors, isLoading } = useQuery({
    queryKey: ['vendors', 'pending'],
    queryFn: async () => {
      const response = await api.get('/vendors/pending');
      return response.data.data as PendingVendor[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ vendorId, notes }: { vendorId: string; notes?: string }) => {
      const response = await api.post(`/vendors/${vendorId}/approve`, { notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors', 'pending'] });
      handleCloseModal();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({
      vendorId,
      reason,
      notes,
    }: {
      vendorId: string;
      reason: string;
      notes?: string;
    }) => {
      const response = await api.post(`/vendors/${vendorId}/reject`, { reason, notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors', 'pending'] });
      handleCloseModal();
    },
  });

  const handleOpenApproveModal = (vendor: PendingVendor) => {
    setSelectedVendor(vendor);
    setActionType('approve');
    setNotes('');
  };

  const handleOpenRejectModal = (vendor: PendingVendor) => {
    setSelectedVendor(vendor);
    setActionType('reject');
    setNotes('');
    setRejectionReason('');
  };

  const handleCloseModal = () => {
    setSelectedVendor(null);
    setActionType(null);
    setNotes('');
    setRejectionReason('');
  };

  const handleApprove = () => {
    if (!selectedVendor) {
      return;
    }
    approveMutation.mutate({ vendorId: selectedVendor.id, notes });
  };

  const handleReject = () => {
    if (!selectedVendor || !rejectionReason.trim()) {
      return;
    }
    rejectMutation.mutate({
      vendorId: selectedVendor.id,
      reason: rejectionReason,
      notes,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Pending Vendor Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Loading pending vendors...</p>
        </CardContent>
      </Card>
    );
  }

  if (!pendingVendors || pendingVendors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Pending Vendor Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800">
              No pending vendor applications. All vendors have been reviewed!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Pending Vendor Approvals
            </div>
            <span className="text-sm font-normal text-gray-500">
              {pendingVendors.length} pending
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="p-4 border border-amber-200 bg-amber-50 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                          {vendor.companyName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Submitted{' '}
                          {new Date(vendor.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                        {vendor.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {vendor.contactName && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <FileText className="w-4 h-4" />
                          <span>{vendor.contactName}</span>
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {vendor.city && vendor.state && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {vendor.city}, {vendor.state}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Credentials */}
                    {(vendor.licenseNumber || vendor.insuranceExpiryDate) && (
                      <div className="flex flex-wrap gap-3 pt-2 border-t border-amber-200">
                        {vendor.licenseNumber && (
                          <div className="flex items-center gap-2 text-sm">
                            <Shield className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-700">
                              License: {vendor.licenseNumber}
                            </span>
                          </div>
                        )}
                        {vendor.insuranceExpiryDate && (
                          <div className="flex items-center gap-2 text-sm">
                            <Shield className="w-4 h-4 text-green-600" />
                            <span className="text-gray-700">
                              Insurance until{' '}
                              {new Date(vendor.insuranceExpiryDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenApproveModal(vendor)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenRejectModal(vendor)}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval/Rejection Modal */}
      <Dialog open={!!selectedVendor} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  Approve Vendor Application
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  Reject Vendor Application
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedVendor && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{selectedVendor.companyName}</p>
                <p className="text-sm text-gray-600">{selectedVendor.contactName}</p>
              </div>

              {actionType === 'reject' && (
                <div>
                  <Label htmlFor="rejectionReason">
                    Rejection Reason <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g., Incomplete insurance documentation"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This reason will be stored in the vendor record
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="notes">
                  {actionType === 'approve' ? 'Approval Notes' : 'Additional Notes'}{' '}
                  <span className="text-gray-400">(Optional)</span>
                </Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any internal notes about this decision..."
                  rows={3}
                  className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Internal notes for your records (not visible to vendor)
                </p>
              </div>

              {actionType === 'approve' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      Approving this vendor will change their status to ACTIVE and allow them to be
                      assigned to work orders.
                    </p>
                  </div>
                </div>
              )}

              {actionType === 'reject' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-800">
                      Rejecting this vendor will mark their application as REJECTED. Consider
                      contacting them with the reason.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            {actionType === 'approve' ? (
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve Vendor'}
              </Button>
            ) : (
              <Button
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Vendor'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
