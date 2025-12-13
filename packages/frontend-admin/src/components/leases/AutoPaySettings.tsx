import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface AutoPaySettingsProps {
  leaseId: string;
  autoPayEnabled: boolean;
  autoPayDay?: number | null;
  autoPayPaymentMethodId?: string | null;
  onUpdate?: () => void;
}

export default function AutoPaySettings({
  leaseId,
  autoPayEnabled,
  autoPayDay,
  autoPayPaymentMethodId,
  onUpdate,
}: AutoPaySettingsProps) {
  const queryClient = useQueryClient();
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(autoPayDay || 1);
  const [paymentMethodId, setPaymentMethodId] = useState<string>(autoPayPaymentMethodId || '');

  const enableMutation = useMutation({
    mutationFn: async (data: { autoPayDay: number; paymentMethodId: string }) => {
      const response = await api.post(`/leases/${leaseId}/autopay`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setShowEnableDialog(false);
      onUpdate?.();
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/leases/${leaseId}/autopay`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setShowDisableDialog(false);
      onUpdate?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { autoPayDay: number; paymentMethodId?: string }) => {
      const response = await api.put(`/leases/${leaseId}/autopay`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setShowEditDialog(false);
      onUpdate?.();
    },
  });

  const handleEnableAutoPay = () => {
    if (!paymentMethodId) {
      alert('Please enter a payment method ID');
      return;
    }
    enableMutation.mutate({
      autoPayDay: selectedDay,
      paymentMethodId,
    });
  };

  const handleUpdateAutoPay = () => {
    updateMutation.mutate({
      autoPayDay: selectedDay,
      paymentMethodId: paymentMethodId || undefined,
    });
  };

  const dayOptions = Array.from({ length: 28 }, (_, i) => i + 1);

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) {
      return 'th';
    }
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Auto-Pay Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {autoPayEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-800">Auto-Pay is Enabled</p>
                  <p className="text-sm text-green-600">
                    Payment will be processed on the {autoPayDay}
                    {getOrdinalSuffix(autoPayDay || 1)} of each month
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Day</p>
                  <p className="text-lg font-semibold flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {autoPayDay}
                    {getOrdinalSuffix(autoPayDay || 1)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Method</p>
                  <p className="text-lg font-semibold flex items-center gap-1">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    ****{autoPayPaymentMethodId?.slice(-4) || '••••'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDay(autoPayDay || 1);
                    setPaymentMethodId(autoPayPaymentMethodId || '');
                    setShowEditDialog(true);
                  }}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Edit Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => setShowDisableDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Disable Auto-Pay
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <XCircle className="w-6 h-6 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-700">Auto-Pay is Disabled</p>
                  <p className="text-sm text-gray-500">
                    Enable auto-pay to automatically process rent payments
                  </p>
                </div>
              </div>

              <Button onClick={() => setShowEnableDialog(true)} className="w-full">
                <CreditCard className="w-4 h-4 mr-2" />
                Enable Auto-Pay
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enable Auto-Pay Dialog */}
      <Dialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Auto-Pay</DialogTitle>
            <DialogDescription>
              Set up automatic rent payments for this lease. Payments will be processed on the
              selected day each month.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentDay">Payment Day</Label>
              <Select
                value={selectedDay.toString()}
                onValueChange={(v) => setSelectedDay(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                      {getOrdinalSuffix(day)} of each month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Choose a day between 1-28 to ensure consistent processing
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method ID</Label>
              <Input
                id="paymentMethod"
                placeholder="pm_xxxxxxxxxxxxxxxxxx"
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Enter the Stripe payment method ID from the tenant's saved card
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-medium">Important</p>
                <p>
                  The tenant will receive a notification 3 days before each auto-pay is processed.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnableDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEnableAutoPay}
              disabled={enableMutation.isPending || !paymentMethodId}
            >
              {enableMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enable Auto-Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Auto-Pay Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Auto-Pay</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable auto-pay for this lease? The tenant will need to make
              payments manually.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Warning</p>
                <p>
                  Disabling auto-pay means rent will no longer be automatically collected. Make sure
                  the tenant is aware of this change.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending}
            >
              {disableMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Disable Auto-Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Auto-Pay Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Auto-Pay Settings</DialogTitle>
            <DialogDescription>
              Update the payment day or payment method for auto-pay.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editPaymentDay">Payment Day</Label>
              <Select
                value={selectedDay.toString()}
                onValueChange={(v) => setSelectedDay(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                      {getOrdinalSuffix(day)} of each month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPaymentMethod">Payment Method ID (optional)</Label>
              <Input
                id="editPaymentMethod"
                placeholder="pm_xxxxxxxxxxxxxxxxxx"
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Leave blank to keep the current payment method
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAutoPay} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
