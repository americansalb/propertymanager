'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  CreditCard,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Settings,
  History,
  ChevronRight,
} from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import TenantLayout from '@/components/layouts/TenantLayout';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import HelcimPaymentForm from '@/components/payments/HelcimPaymentForm';

interface OutstandingCharge {
  id: string;
  type: string;
  description: string;
  amount: number;
  amountPaid: number;
  amountDue: number;
  dueDate: string;
  status: string;
  isOverdue: boolean;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: string;
  memo: string | null;
  allocations: Array<{
    amount: number;
    chargeType: string;
    chargeDescription: string;
  }>;
}

interface AutoPaySettings {
  enabled: boolean;
  day: number | null;
  hasPaymentMethod: boolean;
}

const CHARGE_TYPE_LABELS: Record<string, string> = {
  RENT: 'Rent',
  LATE_FEE: 'Late Fee',
  PET_FEE: 'Pet Fee',
  PARKING: 'Parking',
  AMENITY: 'Amenity Fee',
  UTILITY: 'Utility',
  NSF_FEE: 'NSF Fee',
  DAMAGE: 'Damage',
  OTHER: 'Other',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
};

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { tenant } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'pay' | 'history'>('pay');
  const [autoPayDialogOpen, setAutoPayDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCharges, setSelectedCharges] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const { data: outstandingData, isLoading: loadingCharges } = useQuery({
    queryKey: ['outstanding-charges'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/payments/outstanding');
      return response.data.data as { charges: OutstandingCharge[]; total: number };
    },
  });

  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ['payment-history'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/payments');
      return response.data.data as { payments: Payment[]; pagination: any };
    },
  });

  const { data: autoPaySettings } = useQuery({
    queryKey: ['autopay-settings'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/payments/autopay');
      return response.data.data as AutoPaySettings;
    },
  });

  const autoPayMutation = useMutation({
    mutationFn: async ({ enabled, day }: { enabled: boolean; day?: number }) => {
      await api.put('/tenant-portal/payments/autopay', { enabled, day });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autopay-settings'] });
      setAutoPayDialogOpen(false);
    },
  });

  const totalDue = outstandingData?.total || 0;
  const overdueCharges = outstandingData?.charges.filter((c) => c.isOverdue) || [];
  const upcomingCharges = outstandingData?.charges.filter((c) => !c.isOverdue) || [];

  const handleSelectCharge = (chargeId: string) => {
    setSelectedCharges((prev) =>
      prev.includes(chargeId) ? prev.filter((id) => id !== chargeId) : [...prev, chargeId],
    );
  };

  const handleSelectAll = () => {
    if (selectedCharges.length === outstandingData?.charges.length) {
      setSelectedCharges([]);
    } else {
      setSelectedCharges(outstandingData?.charges.map((c) => c.id) || []);
    }
  };

  const selectedTotal =
    outstandingData?.charges
      .filter((c) => selectedCharges.includes(c.id))
      .reduce((sum, c) => sum + c.amountDue, 0) || 0;

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-600">Manage your rent payments and view history</p>
          </div>
          <Button onClick={() => setAutoPayDialogOpen(true)} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Auto-Pay Settings
          </Button>
        </div>

        {/* Balance Card */}
        <Card
          className={
            totalDue > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-green-200 bg-green-50/50'
          }
        >
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`p-4 rounded-full ${totalDue > 0 ? 'bg-amber-100' : 'bg-green-100'}`}
                >
                  <DollarSign
                    className={`w-8 h-8 ${totalDue > 0 ? 'text-amber-600' : 'text-green-600'}`}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Balance Due</p>
                  <p
                    className={`text-3xl font-bold ${totalDue > 0 ? 'text-amber-700' : 'text-green-700'}`}
                  >
                    ${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              {totalDue > 0 && (
                <Button size="lg" onClick={() => setPaymentDialogOpen(true)}>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Make Payment
                </Button>
              )}
            </div>
            {autoPaySettings?.enabled && (
              <div className="mt-4 flex items-center gap-2 text-green-700 bg-green-100 px-3 py-2 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">
                  Auto-pay enabled - Charges on the {autoPaySettings.day || 1}st of each month
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pay')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pay'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Current Charges
              {totalDue > 0 && (
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">
                  {outstandingData?.charges.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="w-4 h-4" />
              Payment History
            </button>
          </nav>
        </div>

        {/* Current Charges Tab */}
        {activeTab === 'pay' && (
          <div className="space-y-6">
            {loadingCharges ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : totalDue === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    You&apos;re all caught up!
                  </h3>
                  <p className="text-gray-500">No outstanding charges at this time.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Overdue Charges */}
                {overdueCharges.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader className="bg-red-50/50 border-b border-red-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <CardTitle className="text-red-700">Overdue Charges</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {overdueCharges.map((charge) => (
                          <div
                            key={charge.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/30"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedCharges.includes(charge.id)}
                                onChange={() => handleSelectCharge(charge.id)}
                                className="w-5 h-5 rounded border-gray-300 text-primary"
                              />
                              <div>
                                <p className="font-medium">
                                  {CHARGE_TYPE_LABELS[charge.type] || charge.type}
                                </p>
                                <p className="text-sm text-gray-500">{charge.description}</p>
                                <p className="text-xs text-red-600">
                                  Was due {format(new Date(charge.dueDate), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-700">
                                $
                                {charge.amountDue.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Upcoming Charges */}
                {upcomingCharges.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <CardTitle>Upcoming Charges</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                          {selectedCharges.length === outstandingData?.charges.length
                            ? 'Deselect All'
                            : 'Select All'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {upcomingCharges.map((charge) => (
                          <div
                            key={charge.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedCharges.includes(charge.id)}
                                onChange={() => handleSelectCharge(charge.id)}
                                className="w-5 h-5 rounded border-gray-300 text-primary"
                              />
                              <div>
                                <p className="font-medium">
                                  {CHARGE_TYPE_LABELS[charge.type] || charge.type}
                                </p>
                                <p className="text-sm text-gray-500">{charge.description}</p>
                                <p className="text-xs text-gray-400">
                                  Due {format(new Date(charge.dueDate), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">
                                $
                                {charge.amountDue.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Selected Summary */}
                {selectedCharges.length > 0 && (
                  <Card className="sticky bottom-4 border-primary">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">
                            {selectedCharges.length} charge{selectedCharges.length > 1 ? 's' : ''}{' '}
                            selected
                          </p>
                          <p className="text-2xl font-bold">
                            ${selectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <Button size="lg" onClick={() => setPaymentDialogOpen(true)}>
                          Pay Selected
                          <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* Payment History Tab */}
        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>View all your past payments</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : paymentsData?.payments.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payment history</h3>
                  <p className="text-gray-500">Your payment history will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentsData?.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-gray-100">
                          <CreditCard className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            $
                            {Number(payment.amount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(payment.date), 'MMMM d, yyyy')} via {payment.method}
                          </p>
                          {payment.allocations.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              Applied to:{' '}
                              {payment.allocations
                                .map((a) => CHARGE_TYPE_LABELS[a.chargeType] || a.chargeType)
                                .join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          PAYMENT_STATUS_COLORS[payment.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Auto-Pay Dialog */}
        <Dialog open={autoPayDialogOpen} onOpenChange={setAutoPayDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Auto-Pay Settings</DialogTitle>
              <DialogDescription>
                Set up automatic payments to ensure you never miss a due date.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium">Auto-Pay</p>
                  <p className="text-sm text-gray-500">Automatically pay charges each month</p>
                </div>
                <button
                  onClick={() =>
                    autoPayMutation.mutate({
                      enabled: !autoPaySettings?.enabled,
                      day: autoPaySettings?.day || 1,
                    })
                  }
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    autoPaySettings?.enabled ? 'bg-primary' : 'bg-gray-200'
                  }`}
                  disabled={autoPayMutation.isPending}
                >
                  <span
                    className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      autoPaySettings?.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {autoPaySettings?.enabled && (
                <div className="space-y-2">
                  <Label htmlFor="autoPayDay">Payment Day</Label>
                  <select
                    id="autoPayDay"
                    value={autoPaySettings?.day || 1}
                    onChange={(e) =>
                      autoPayMutation.mutate({
                        enabled: true,
                        day: parseInt(e.target.value),
                      })
                    }
                    className="w-full border rounded-md px-3 py-2"
                    disabled={autoPayMutation.isPending}
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}
                        {day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each
                        month
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!autoPaySettings?.hasPaymentMethod && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    Add a payment method to enable auto-pay.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog
          open={paymentDialogOpen}
          onOpenChange={(open) => {
            setPaymentDialogOpen(open);
            if (!open) {
              setPaymentSuccess(false);
              setPaymentAmount('');
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Make a Payment</DialogTitle>
              <DialogDescription>
                Pay securely with your credit or debit card.
              </DialogDescription>
            </DialogHeader>
            {tenant && (
              <HelcimPaymentForm
                amount={
                  paymentAmount
                    ? parseFloat(paymentAmount)
                    : selectedTotal > 0
                      ? selectedTotal
                      : totalDue
                }
                chargeIds={
                  selectedCharges.length > 0
                    ? selectedCharges
                    : outstandingData?.charges.map((c) => c.id) || []
                }
                tenantId={tenant.id}
                onSuccess={(transactionId) => {
                  setPaymentSuccess(true);
                  queryClient.invalidateQueries({ queryKey: ['outstanding-charges'] });
                  queryClient.invalidateQueries({ queryKey: ['payment-history'] });
                  setTimeout(() => {
                    setPaymentDialogOpen(false);
                    setPaymentSuccess(false);
                    setSelectedCharges([]);
                    setPaymentAmount('');
                  }, 2000);
                }}
                onError={(error) => {
                  console.error('Payment error:', error);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TenantLayout>
  );
}
