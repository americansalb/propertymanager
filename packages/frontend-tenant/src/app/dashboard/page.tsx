'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Home,
  DollarSign,
  Wrench,
  Calendar,
  MessageSquare,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Building2,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TenantLayout from '@/components/layouts/TenantLayout';
import { format } from 'date-fns';

interface DashboardData {
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  lease: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    autoPayEnabled: boolean;
    autoPayDay: number | null;
  } | null;
  unit: {
    id: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
  } | null;
  property: {
    id: string;
    name: string;
    address1: string;
    city: string;
    state: string;
    zipCode: string;
  } | null;
  balance: number;
  nextDue: {
    amount: number;
    dueDate: string;
    type: string;
  } | null;
  recentPayments: Array<{
    id: string;
    amount: number;
    date: string;
    status: string;
    method: string;
  }>;
  activeMaintenanceRequests: number;
  unreadMessages: number;
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant-dashboard'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/dashboard');
      return response.data.data as DashboardData;
    },
  });

  if (isLoading) {
    return (
      <TenantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </TenantLayout>
    );
  }

  if (error || !data) {
    return (
      <TenantLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load dashboard</h3>
          <p className="text-gray-500">Please try again later or contact support.</p>
        </div>
      </TenantLayout>
    );
  }

  // Show "no property assigned" view when tenant has no unit/property
  if (!data.property && !data.unit) {
    return (
      <TenantLayout>
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Welcome, {data.tenant.firstName}!
            </h1>
            <p className="text-gray-600">Your tenant portal account is active</p>
          </div>

          {/* No Property Assigned Card */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  No Property Assigned Yet
                </h2>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  Your account is set up, but you haven&apos;t been assigned to a property yet. Your
                  property manager will assign you to a unit soon.
                </p>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">
                      Contact your property manager if you have questions
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Name</p>
                  <p className="font-medium">
                    {data.tenant.firstName} {data.tenant.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="font-medium">{data.tenant.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions - Limited */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/profile">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                    <Home className="w-6 h-6" />
                    <span>Update Profile</span>
                  </Button>
                </Link>
                <Link href="/messages">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                    <MessageSquare className="w-6 h-6" />
                    <span>Contact Us</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </TenantLayout>
    );
  }

  const daysUntilDue = data.nextDue
    ? Math.ceil((new Date(data.nextDue.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back, {data.tenant.firstName}!
          </h1>
          {data.property && (
            <p className="text-gray-600">
              {data.property.name} - Unit {data.unit?.unitNumber}
            </p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Balance Due */}
          <Card className={data.balance > 0 ? 'border-red-200 bg-red-50/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Balance Due</CardTitle>
              <DollarSign
                className={`w-5 h-5 ${data.balance > 0 ? 'text-red-500' : 'text-green-500'}`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${data.balance > 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                ${data.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              {data.nextDue && daysUntilDue !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  {daysUntilDue > 0
                    ? `Due in ${daysUntilDue} days`
                    : daysUntilDue === 0
                      ? 'Due today'
                      : `${Math.abs(daysUntilDue)} days overdue`}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Monthly Rent */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Monthly Rent</CardTitle>
              <Calendar className="w-5 h-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${Number(data.lease?.monthlyRent || 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {data.lease?.autoPayEnabled ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    Auto-pay enabled
                  </span>
                ) : (
                  <Link href="/payments" className="text-primary hover:underline">
                    Set up auto-pay
                  </Link>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Maintenance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Requests</CardTitle>
              <Wrench className="w-5 h-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.activeMaintenanceRequests}</div>
              <p className="text-xs text-gray-500 mt-1">
                <Link href="/maintenance" className="text-primary hover:underline">
                  View all requests
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Unread Messages</CardTitle>
              <MessageSquare className="w-5 h-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.unreadMessages}</div>
              <p className="text-xs text-gray-500 mt-1">
                <Link href="/messages" className="text-primary hover:underline">
                  View messages
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/payments">
                <Button className="w-full h-auto py-4 flex-col gap-2">
                  <DollarSign className="w-6 h-6" />
                  <span>Pay Rent</span>
                </Button>
              </Link>
              <Link href="/maintenance/new">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Wrench className="w-6 h-6" />
                  <span>Request Service</span>
                </Button>
              </Link>
              <Link href="/lease">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Home className="w-6 h-6" />
                  <span>View Lease</span>
                </Button>
              </Link>
              <Link href="/messages">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <MessageSquare className="w-6 h-6" />
                  <span>Contact Us</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Payments</CardTitle>
            <Link href="/payments">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length > 0 ? (
              <div className="space-y-4">
                {data.recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          ${Number(payment.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(payment.date), 'MMM d, yyyy')} via {payment.method}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        PAYMENT_STATUS_COLORS[payment.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No payment history yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Info */}
        {data.property && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Property</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Property</p>
                  <p className="font-medium">{data.property.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Address</p>
                  <p className="font-medium">{data.property.address1}</p>
                  <p className="text-sm text-gray-600">
                    {data.property.city}, {data.property.state} {data.property.zipCode}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Unit Details</p>
                  <p className="font-medium">Unit {data.unit?.unitNumber}</p>
                  <p className="text-sm text-gray-600">
                    {data.unit?.bedrooms} bed / {data.unit?.bathrooms} bath
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TenantLayout>
  );
}
