import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  DollarSign,
  Wrench,
  FileText,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Send,
  MessageSquare,
  Phone,
  Mail,
  User,
  Plus,
  Download,
  Eye,
  Camera,
  X,
  History,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { format, formatDistanceToNow, addMonths, differenceInDays } from 'date-fns';
import api from '../services/api';

type TabType = 'overview' | 'payments' | 'maintenance' | 'documents' | 'messages';

interface PaymentHistory {
  id: string;
  date: Date;
  amount: number;
  type: string;
  status: 'paid' | 'pending' | 'overdue';
  method?: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'submitted' | 'in_progress' | 'scheduled' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  images?: string[];
}

const priorityConfig = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  medium: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  emergency: { label: 'Emergency', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const statusConfig = {
  submitted: {
    label: 'Submitted',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Wrench,
  },
  scheduled: {
    label: 'Scheduled',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: Calendar,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
  },
};

export default function TenantPortalPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'emergency',
  });

  // Fetch lease data (simulating tenant's lease)
  const { data: leases } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      const response = await api.get('/leases');
      return response.data.data;
    },
  });

  // Get tenant's lease (first active lease for demo)
  const tenantLease = useMemo(() => {
    const activeLease = leases?.find((l: any) => l.status === 'ACTIVE');
    return activeLease;
  }, [leases]);

  // Fetch work orders for this tenant's unit
  const { data: workOrders } = useQuery({
    queryKey: ['workOrders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
      return response.data.data;
    },
  });

  // Generate payment history
  const paymentHistory: PaymentHistory[] = useMemo(() => {
    if (!tenantLease) {
      return [];
    }

    const payments: PaymentHistory[] = [];
    const rentAmount = tenantLease.rentAmount || 1500;
    const startDate = new Date(tenantLease.startDate);

    for (let i = 0; i < 6; i++) {
      const paymentDate = addMonths(startDate, i);
      if (paymentDate <= new Date()) {
        payments.push({
          id: `pay-${i}`,
          date: paymentDate,
          amount: rentAmount,
          type: 'Rent',
          status: i === 5 && Math.random() > 0.7 ? 'pending' : 'paid',
          method: 'Auto-pay',
        });
      }
    }

    // Add current month if due
    const currentDue = new Date();
    currentDue.setDate(1);
    if (!payments.find((p) => format(p.date, 'yyyy-MM') === format(currentDue, 'yyyy-MM'))) {
      payments.push({
        id: 'pay-current',
        date: currentDue,
        amount: rentAmount,
        type: 'Rent',
        status: new Date().getDate() > 5 ? 'overdue' : 'pending',
      });
    }

    return payments.reverse();
  }, [tenantLease]);

  // Map work orders to maintenance requests
  const maintenanceRequests: MaintenanceRequest[] = useMemo(() => {
    if (!workOrders) {
      return [];
    }

    const requests = workOrders.slice(0, 5).map((wo: any) => ({
      id: wo.id,
      title: wo.title || 'Maintenance Request',
      description: wo.description || 'No description provided',
      priority: (wo.priority?.toLowerCase() || 'medium') as 'low' | 'medium' | 'high' | 'emergency',
      status:
        wo.status === 'COMPLETED'
          ? 'completed'
          : wo.status === 'IN_PROGRESS'
            ? 'in_progress'
            : wo.status === 'SCHEDULED'
              ? 'scheduled'
              : 'submitted',
      createdAt: new Date(wo.createdAt || Date.now()),
      updatedAt: new Date(wo.updatedAt || Date.now()),
    }));

    return requests;
  }, [workOrders]);

  // Lease stats
  const leaseStats = useMemo(() => {
    if (!tenantLease) {
      return null;
    }

    const startDate = new Date(tenantLease.startDate);
    const endDate = new Date(tenantLease.endDate);
    const today = new Date();
    const totalDays = differenceInDays(endDate, startDate);
    const daysElapsed = differenceInDays(today, startDate);
    const daysRemaining = differenceInDays(endDate, today);
    const progress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

    return {
      startDate,
      endDate,
      daysRemaining,
      progress,
      rentAmount: tenantLease.rentAmount || 1500,
      securityDeposit: tenantLease.securityDeposit || 1500,
    };
  }, [tenantLease]);

  const handleSubmitMaintenanceRequest = useCallback(() => {
    // TODO: Implement with real API
    alert('Maintenance request submitted successfully!');
    setShowMaintenanceModal(false);
    setMaintenanceForm({ title: '', description: '', priority: 'medium' });
  }, []);

  const handleMakePayment = useCallback(() => {
    // TODO: Implement with real payment processor
    alert('Payment processed successfully!');
    setShowPaymentModal(false);
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
  ];

  const pendingPayment = paymentHistory.find(
    (p) => p.status === 'pending' || p.status === 'overdue',
  );
  const openMaintenanceRequests = maintenanceRequests.filter(
    (r) => r.status !== 'completed',
  ).length;

  return (
    <div className="space-y-6">
      {/* Preview Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Eye className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-amber-800">Tenant Portal Preview</p>
            <p className="text-sm text-amber-600">
              This is a preview of what your tenants see. Tenants log in at a separate URL.
            </p>
          </div>
        </div>
        <a
          href="/tenant/login"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
        >
          Open Tenant Portal →
        </a>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <User className="w-6 h-6" />
              </div>
              Welcome, {tenantLease?.tenant?.firstName || 'Tenant'}!
            </h1>
            <p className="text-white/80 mt-1">
              {tenantLease?.unit?.property?.name || 'Your Property'} - Unit{' '}
              {tenantLease?.unit?.unitNumber || '101'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => setShowMaintenanceModal(true)}
            >
              <Wrench className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
            <Button
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => setShowPaymentModal(true)}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Rent
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              Monthly Rent
            </div>
            <p className="text-2xl font-bold">
              ${leaseStats?.rentAmount?.toLocaleString() || '1,500'}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              Days Remaining
            </div>
            <p className="text-2xl font-bold">{leaseStats?.daysRemaining || 180}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Wrench className="w-4 h-4" />
              Open Requests
            </div>
            <p className="text-2xl font-bold">{openMaintenanceRequests}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <AlertCircle className="w-4 h-4" />
              Balance Due
            </div>
            <p className="text-2xl font-bold">
              ${pendingPayment ? pendingPayment.amount.toLocaleString() : '0'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Alerts */}
              {pendingPayment && (
                <div
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    pendingPayment.status === 'overdue'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${pendingPayment.status === 'overdue' ? 'bg-red-100' : 'bg-yellow-100'}`}
                  >
                    <AlertTriangle
                      className={`w-5 h-5 ${pendingPayment.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'}`}
                    />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${pendingPayment.status === 'overdue' ? 'text-red-800' : 'text-yellow-800'}`}
                    >
                      {pendingPayment.status === 'overdue' ? 'Payment Overdue' : 'Payment Due'}
                    </p>
                    <p
                      className={`text-sm ${pendingPayment.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'}`}
                    >
                      ${pendingPayment.amount.toLocaleString()} -{' '}
                      {format(pendingPayment.date, 'MMMM yyyy')}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setShowPaymentModal(true)}>
                    Pay Now
                  </Button>
                </div>
              )}

              {/* Lease Progress */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Lease Progress
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Started: {leaseStats ? format(leaseStats.startDate, 'MMM d, yyyy') : 'N/A'}
                    </span>
                    <span className="text-gray-500">
                      Ends: {leaseStats ? format(leaseStats.endDate, 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all"
                      style={{ width: `${leaseStats?.progress || 0}%` }}
                    />
                  </div>
                  <p className="text-center text-sm text-gray-600">
                    {leaseStats?.daysRemaining || 0} days remaining (
                    {(leaseStats?.progress || 0).toFixed(0)}% complete)
                  </p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Payments */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-green-600" />
                    Recent Payments
                  </h3>
                  <div className="space-y-3">
                    {paymentHistory.slice(0, 3).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              payment.status === 'paid'
                                ? 'bg-green-100'
                                : payment.status === 'overdue'
                                  ? 'bg-red-100'
                                  : 'bg-yellow-100'
                            }`}
                          >
                            <DollarSign
                              className={`w-4 h-4 ${
                                payment.status === 'paid'
                                  ? 'text-green-600'
                                  : payment.status === 'overdue'
                                    ? 'text-red-600'
                                    : 'text-yellow-600'
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{payment.type}</p>
                            <p className="text-xs text-gray-500">
                              {format(payment.date, 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            ${payment.amount.toLocaleString()}
                          </p>
                          <p
                            className={`text-xs font-medium ${
                              payment.status === 'paid'
                                ? 'text-green-600'
                                : payment.status === 'overdue'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                            }`}
                          >
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Maintenance */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-orange-600" />
                    Maintenance Requests
                  </h3>
                  <div className="space-y-3">
                    {maintenanceRequests.slice(0, 3).map((request) => {
                      const statusConf = statusConfig[request.status];
                      const StatusIcon = statusConf.icon;
                      return (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${statusConf.bgColor}`}>
                              <StatusIcon className={`w-4 h-4 ${statusConf.color}`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 truncate max-w-[180px]">
                                {request.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${statusConf.bgColor} ${statusConf.color}`}
                          >
                            {statusConf.label}
                          </span>
                        </div>
                      );
                    })}
                    {maintenanceRequests.length === 0 && (
                      <div className="text-center py-6 text-gray-500">
                        <Wrench className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>No maintenance requests</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Property Manager Contact */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-600" />
                  Property Manager
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                      PM
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Property Manager</p>
                      <p className="text-sm text-gray-500">Available 9am - 5pm</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Phone className="w-4 h-4" />
                      (555) 123-4567
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Payment History</h3>
                <Button onClick={() => setShowPaymentModal(true)} className="gap-2">
                  <CreditCard className="w-4 h-4" />
                  Make Payment
                </Button>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Total Paid (YTD)</p>
                    <p className="text-2xl font-bold text-green-600">
                      $
                      {paymentHistory
                        .filter((p) => p.status === 'paid')
                        .reduce((sum, p) => sum + p.amount, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Current Balance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${pendingPayment?.amount.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Next Due Date</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {pendingPayment ? format(pendingPayment.date, 'MMM d') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Method
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {format(payment.date, 'MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{payment.type}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ${payment.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{payment.method || '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : payment.status === 'overdue'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {payment.status === 'paid' ? (
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => setShowPaymentModal(true)}>
                              Pay
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Maintenance Requests</h3>
                <Button onClick={() => setShowMaintenanceModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Request
                </Button>
              </div>

              <div className="space-y-4">
                {maintenanceRequests.map((request) => {
                  const statusConf = statusConfig[request.status];
                  const priorityConf = priorityConfig[request.priority];
                  const StatusIcon = statusConf.icon;

                  return (
                    <div
                      key={request.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${statusConf.bgColor}`}>
                            <StatusIcon className={`w-6 h-6 ${statusConf.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-gray-900">{request.title}</h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConf.bgColor} ${priorityConf.color}`}
                              >
                                {priorityConf.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span>
                                Submitted{' '}
                                {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                              </span>
                              <span>
                                Updated{' '}
                                {formatDistanceToNow(request.updatedAt, { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${statusConf.bgColor} ${statusConf.color}`}
                        >
                          {statusConf.label}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {maintenanceRequests.length === 0 && (
                  <div className="text-center py-12">
                    <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      No maintenance requests
                    </h3>
                    <p className="text-gray-500 mb-4">Everything is running smoothly!</p>
                    <Button onClick={() => setShowMaintenanceModal(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Submit a Request
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900">Your Documents</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Lease Agreement', date: tenantLease?.startDate, type: 'PDF' },
                  { name: 'Move-In Checklist', date: tenantLease?.startDate, type: 'PDF' },
                  { name: "Renter's Insurance", date: new Date(), type: 'PDF' },
                  { name: 'Community Guidelines', date: new Date(), type: 'PDF' },
                ].map((doc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-500">
                          {doc.date ? format(new Date(doc.date), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Messages</h3>
                <Button className="gap-2">
                  <Send className="w-4 h-4" />
                  New Message
                </Button>
              </div>

              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No messages</h3>
                <p className="text-gray-500">Start a conversation with your property manager</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Request Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Submit Maintenance Request</h2>
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title</label>
                <input
                  type="text"
                  value={maintenanceForm.title}
                  onChange={(e) =>
                    setMaintenanceForm({ ...maintenanceForm, title: e.target.value })
                  }
                  placeholder="e.g., Leaky faucet in bathroom"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={maintenanceForm.description}
                  onChange={(e) =>
                    setMaintenanceForm({ ...maintenanceForm, description: e.target.value })
                  }
                  rows={4}
                  placeholder="Please describe the issue in detail..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={maintenanceForm.priority}
                  onChange={(e) =>
                    setMaintenanceForm({ ...maintenanceForm, priority: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="low">Low - Not urgent</option>
                  <option value="medium">Medium - Should be fixed soon</option>
                  <option value="high">High - Needs quick attention</option>
                  <option value="emergency">Emergency - Immediate action needed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attach Photos
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <Button variant="outline" onClick={() => setShowMaintenanceModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitMaintenanceRequest} className="gap-2">
                <Send className="w-4 h-4" />
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Make a Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">Amount Due</p>
                <p className="text-3xl font-bold text-gray-900">
                  $
                  {pendingPayment?.amount.toLocaleString() ||
                    leaseStats?.rentAmount?.toLocaleString() ||
                    '1,500'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Due: {pendingPayment ? format(pendingPayment.date, 'MMMM d, yyyy') : 'N/A'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary">
                  <option>Bank Account (****4567)</option>
                  <option>Credit Card (****1234)</option>
                  <option>Add New Payment Method</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <input type="checkbox" id="autopay" className="rounded" />
                <label htmlFor="autopay">Enable auto-pay for future payments</label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleMakePayment} className="gap-2">
                <CreditCard className="w-4 h-4" />
                Pay $
                {pendingPayment?.amount.toLocaleString() ||
                  leaseStats?.rentAmount?.toLocaleString() ||
                  '1,500'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
