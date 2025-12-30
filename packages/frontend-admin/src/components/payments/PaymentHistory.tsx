import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from 'lucide-react';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useState } from 'react';

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  status: string;
  checkNumber?: string;
  memo?: string;
  tenant: {
    firstName: string;
    lastName: string;
    lease: {
      unit: {
        unitNumber: string;
        property: {
          name: string;
        };
      };
    };
  };
  allocations: Array<{
    amount: number;
    charge: {
      type: string;
      description: string;
    };
  }>;
}

interface PaymentHistoryProps {
  leaseId?: string;
  tenantId?: string;
  limit?: number;
  showFilters?: boolean;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  COMPLETED: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  PENDING: { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  PROCESSING: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  FAILED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  REFUNDED: { icon: XCircle, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

const methodLabels: Record<string, string> = {
  ACH: 'Bank Transfer',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card',
  CHECK: 'Check',
  CASH: 'Cash',
  WIRE_TRANSFER: 'Wire Transfer',
  MONEY_ORDER: 'Money Order',
};

export default function PaymentHistory({
  leaseId,
  tenantId,
  limit = 10,
  showFilters = true,
}: PaymentHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ['payments', leaseId, tenantId],
    queryFn: async () => {
      let url = '/payments';
      const params = new URLSearchParams();
      if (leaseId) {
        params.append('leaseId', leaseId);
      }
      if (tenantId) {
        params.append('tenantId', tenantId);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.get(url);
      return response.data.data;
    },
  });

  const { data: leasePaymentHistory } = useQuery({
    queryKey: ['lease-payment-history', leaseId],
    queryFn: async () => {
      if (!leaseId) {
        return null;
      }
      const response = await api.get(`/payments/lease/${leaseId}/history`);
      return response.data.data;
    },
    enabled: !!leaseId,
  });

  const filteredPayments = payments?.filter((p) => {
    if (statusFilter === 'all') {
      return true;
    }
    return p.status === statusFilter;
  });

  const displayPayments = filteredPayments?.slice(0, limit);

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      const response = await api.get(`/payments/${paymentId}/receipt`);
      const receipt = response.data.data;

      // Create a printable receipt HTML
      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Receipt - ${receipt.receiptNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            .section { margin-bottom: 20px; }
            .section h3 { margin: 0 0 10px 0; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .row { display: flex; justify-content: space-between; padding: 5px 0; }
            .label { color: #666; }
            .value { font-weight: bold; }
            .amount { font-size: 24px; color: #22c55e; text-align: center; padding: 20px; background: #f0fdf4; border-radius: 8px; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${receipt.organization?.name || 'PropertyMaster'}</h1>
            <p>Payment Receipt</p>
            <p><strong>${receipt.receiptNumber}</strong></p>
          </div>

          <div class="amount">
            <div style="font-size: 14px; color: #666;">Amount Paid</div>
            <div>$${Number(receipt.amount).toFixed(2)}</div>
          </div>

          <div class="section">
            <h3>Payment Details</h3>
            <div class="row"><span class="label">Date:</span><span class="value">${new Date(receipt.paymentDate).toLocaleDateString()}</span></div>
            <div class="row"><span class="label">Method:</span><span class="value">${receipt.method}</span></div>
            <div class="row"><span class="label">Status:</span><span class="value">${receipt.status}</span></div>
            ${receipt.checkNumber ? `<div class="row"><span class="label">Check #:</span><span class="value">${receipt.checkNumber}</span></div>` : ''}
          </div>

          <div class="section">
            <h3>Tenant Information</h3>
            <div class="row"><span class="label">Name:</span><span class="value">${receipt.tenant?.firstName || ''} ${receipt.tenant?.lastName || ''}</span></div>
            <div class="row"><span class="label">Property:</span><span class="value">${receipt.property?.name || ''}</span></div>
            <div class="row"><span class="label">Unit:</span><span class="value">${receipt.unit?.unitNumber || ''}</span></div>
            <div class="row"><span class="label">Address:</span><span class="value">${receipt.property?.address || ''}, ${receipt.property?.city || ''}, ${receipt.property?.state || ''} ${receipt.property?.zipCode || ''}</span></div>
          </div>

          <div class="footer">
            <p>Thank you for your payment!</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      // Open in a new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
        printWindow.print();
      }
    } catch {
      alert('Failed to download receipt. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Payment History
        </CardTitle>
        {showFilters && (
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border rounded-lg px-2 py-1"
            >
              <option value="all">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Summary Stats (for lease view) */}
        {leasePaymentHistory?.summary && (
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(leasePaymentHistory.summary.totalPaid)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Refunded</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(leasePaymentHistory.summary.totalRefunded)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Net Paid</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(leasePaymentHistory.summary.netPaid)}
              </p>
            </div>
          </div>
        )}

        {/* Payment List */}
        {displayPayments && displayPayments.length > 0 ? (
          <div className="space-y-3">
            {displayPayments.map((payment) => {
              const statusInfo = statusConfig[payment.status] || statusConfig.PENDING;
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
                      <CreditCard className={`w-5 h-5 ${statusInfo.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">{formatCurrency(payment.amount)}</p>
                        <span
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {payment.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {methodLabels[payment.method] || payment.method}
                        {payment.checkNumber && ` #${payment.checkNumber}`}
                      </p>
                      {payment.allocations && payment.allocations.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          Applied to: {payment.allocations.map((a) => a.charge.type).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(payment.paymentDate)}
                      </p>
                      {!leaseId && (
                        <p className="text-xs text-gray-400">
                          {payment.tenant.lease.unit.property.name} - Unit{' '}
                          {payment.tenant.lease.unit.unitNumber}
                        </p>
                      )}
                    </div>
                    {payment.status === 'COMPLETED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReceipt(payment.id)}
                        title="Download Receipt"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No payments found</p>
            <p className="text-sm text-gray-400 mt-1">Payments will appear here once recorded</p>
          </div>
        )}

        {/* Show more link */}
        {filteredPayments && filteredPayments.length > limit && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              View All {filteredPayments.length} Payments
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
