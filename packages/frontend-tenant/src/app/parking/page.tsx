'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Loader2, AlertCircle, Plus, Calendar, Copy, Check, X } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import TenantLayout from '@/components/layouts/TenantLayout';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ParkingPass {
  id: string;
  status: string;
  guestName: string;
  guestVehicleMake: string | null;
  guestVehicleModel: string | null;
  guestVehicleColor: string | null;
  guestLicensePlate: string | null;
  validFrom: string;
  validUntil: string;
  passCode: string;
  parkingSpot: string | null;
  notes: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700' },
  EXPIRED: { label: 'Expired', color: 'bg-gray-100 text-gray-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export default function ParkingPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [guestName, setGuestName] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['parking-passes'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/parking-passes');
      return response.data.data as ParkingPass[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/tenant-portal/parking-passes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parking-passes'] });
      setShowCreate(false);
      resetForm();
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'Failed to create parking pass. Please try again.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (passId: string) => {
      await api.delete(`/tenant-portal/parking-passes/${passId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parking-passes'] });
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'Failed to cancel parking pass. Please try again.');
    },
  });

  const resetForm = () => {
    setGuestName('');
    setVehicleMake('');
    setVehicleModel('');
    setVehicleColor('');
    setLicensePlate('');
    setValidFrom('');
    setValidUntil('');
    setNotes('');
  };

  const handleCreate = () => {
    createMutation.mutate({
      guestName,
      guestVehicleMake: vehicleMake || undefined,
      guestVehicleModel: vehicleModel || undefined,
      guestVehicleColor: vehicleColor || undefined,
      guestLicensePlate: licensePlate || undefined,
      validFrom,
      validUntil,
      notes: notes || undefined,
    });
  };

  const copyPassCode = (passCode: string, passId: string) => {
    navigator.clipboard.writeText(passCode);
    setCopiedId(passId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openCreateDialog = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    setValidFrom(today);
    setValidUntil(tomorrow);
    setShowCreate(true);
  };

  if (isLoading) {
    return (
      <TenantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </TenantLayout>
    );
  }

  if (error) {
    return (
      <TenantLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load parking passes</h3>
          <p className="text-gray-500">Please try again later.</p>
        </div>
      </TenantLayout>
    );
  }

  const passes = data || [];
  const activePasses = passes.filter(
    (p) => p.status === 'ACTIVE' && isAfter(new Date(p.validUntil), new Date()),
  );

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Guest Parking</h1>
            <p className="text-gray-600 mt-1">Create temporary parking passes for your guests</p>
          </div>
          <Button onClick={openCreateDialog} disabled={activePasses.length >= 3}>
            <Plus className="w-4 h-4 mr-2" />
            New Pass
          </Button>
        </div>

        {activePasses.length >= 3 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              You have reached the maximum of 3 active guest passes. Cancel an existing pass to
              create a new one.
            </p>
          </div>
        )}

        {/* Passes List */}
        {passes.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Parking Passes</h3>
                <p className="text-gray-500 mb-4">
                  Create a guest parking pass for visitors to your building.
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Pass
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {passes.map((pass) => {
              const isExpired = isBefore(new Date(pass.validUntil), new Date());
              const displayStatus = isExpired && pass.status === 'ACTIVE' ? 'EXPIRED' : pass.status;
              const displayConfig = STATUS_LABELS[displayStatus];

              return (
                <Card key={pass.id} className={displayStatus !== 'ACTIVE' ? 'opacity-75' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Car className="w-6 h-6 text-blue-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-gray-900">{pass.guestName}</h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${displayConfig.color}`}
                              >
                                {displayConfig.label}
                              </span>
                            </div>

                            {pass.guestLicensePlate && (
                              <p className="text-sm text-gray-600 mt-1">
                                {[
                                  pass.guestVehicleColor,
                                  pass.guestVehicleMake,
                                  pass.guestVehicleModel,
                                ]
                                  .filter(Boolean)
                                  .join(' ')}{' '}
                                - <span className="font-mono">{pass.guestLicensePlate}</span>
                              </p>
                            )}

                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(pass.validFrom), 'MMM d')} -{' '}
                                {format(new Date(pass.validUntil), 'MMM d, yyyy')}
                              </span>
                            </div>

                            {pass.parkingSpot && (
                              <p className="text-sm text-gray-600 mt-1">
                                Spot: <span className="font-medium">{pass.parkingSpot}</span>
                              </p>
                            )}

                            <div className="mt-3 bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">Pass Code</p>
                              <div className="flex items-center gap-2">
                                <code className="text-lg font-mono font-bold text-gray-900">
                                  {pass.passCode.slice(-8).toUpperCase()}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    copyPassCode(pass.passCode.slice(-8).toUpperCase(), pass.id)
                                  }
                                  className="h-8"
                                >
                                  {copiedId === pass.id ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {displayStatus === 'ACTIVE' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => cancelMutation.mutate(pass.id)}
                              disabled={cancelMutation.isPending}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Create Guest Parking Pass
              </DialogTitle>
              <DialogDescription>Create a temporary parking pass for your guest</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="guestName">Guest Name *</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleMake">Vehicle Make</Label>
                  <Input
                    id="vehicleMake"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder="Toyota"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleModel">Vehicle Model</Label>
                  <Input
                    id="vehicleModel"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Camry"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleColor">Color</Label>
                  <Input
                    id="vehicleColor"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder="Silver"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">License Plate</Label>
                  <Input
                    id="licensePlate"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="ABC-1234"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validFrom">Valid From *</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valid Until *</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    min={validFrom || format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !guestName || !validFrom || !validUntil}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create Pass
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TenantLayout>
  );
}
