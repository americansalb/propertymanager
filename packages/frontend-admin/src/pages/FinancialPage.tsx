import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  Building2,
  Percent,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatCurrency, formatDate } from '../lib/utils';

export default function FinancialPage() {
  const navigate = useNavigate();

  // Fetch financial dashboard data
  const { data: dashboard } = useQuery({
    queryKey: ['financial-dashboard'],
    queryFn: async () => {
      const response = await api.get('/financial/dashboard');
      return response.data.data;
    },
  });

  // Fetch properties for property performance table
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
  });

  // Fetch leases for rent calculations
  const { data: leases } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      const response = await api.get('/leases');
      return response.data.data;
    },
  });

  // Fetch payments for collection tracking
  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await api.get('/payments');
      return response.data.data;
    },
  });

  // Calculate portfolio summary metrics
  const portfolioSummary = useMemo(() => {
    if (!leases || !payments) {
      return {
        totalMonthlyRent: 0,
        collectionRate: 0,
        outstandingBalance: 0,
        activeLeaseCount: 0,
      };
    }

    // Total monthly rent from active leases
    const activeLeases = leases.filter((lease: any) => lease.status === 'ACTIVE');
    const totalMonthlyRent = activeLeases.reduce(
      (sum: number, lease: any) => sum + Number(lease.monthlyRent || 0),
      0,
    );

    // Collection rate: completed payments / expected payments
    // Calculate expected rent for current month based on active leases
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get payments from current month
    const currentMonthPayments = (payments || []).filter((payment: any) => {
      const paymentDate = new Date(payment.paymentDate);
      return (
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear &&
        payment.status === 'COMPLETED'
      );
    });

    const collectedAmount = currentMonthPayments.reduce(
      (sum: number, payment: any) => sum + Number(payment.amount || 0),
      0,
    );

    // Collection rate based on expected vs collected
    const collectionRate =
      totalMonthlyRent > 0
        ? Math.min(100, Math.round((collectedAmount / totalMonthlyRent) * 100))
        : 0;

    // Outstanding balance: expected - collected for current month
    const outstandingBalance = Math.max(0, totalMonthlyRent - collectedAmount);

    return {
      totalMonthlyRent,
      collectionRate,
      outstandingBalance,
      activeLeaseCount: activeLeases.length,
    };
  }, [leases, payments]);

  // Calculate property performance data
  const propertyPerformance = useMemo(() => {
    if (!properties || !leases || !payments) return [];

    return properties.map((property: any) => {
      const units = property.units || [];
      const totalUnits = units.length;

      // Count occupied units (OCCUPIED or VACANT_RENTED status)
      const occupiedUnits = units.filter(
        (unit: any) => unit.status === 'OCCUPIED' || unit.status === 'VACANT_RENTED',
      ).length;

      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

      // Get active leases for this property
      const propertyLeases = leases.filter(
        (lease: any) => lease.unit?.property?.id === property.id && lease.status === 'ACTIVE',
      );

      const monthlyRent = propertyLeases.reduce(
        (sum: number, lease: any) => sum + Number(lease.monthlyRent || 0),
        0,
      );

      // Find most recent payment for this property's tenants
      const propertyTenantIds = propertyLeases.flatMap((lease: any) =>
        (lease.tenants || []).map((t: any) => t.id),
      );

      const propertyPayments = (payments || []).filter((payment: any) =>
        propertyTenantIds.includes(payment.tenantId),
      );

      const sortedPayments = [...propertyPayments].sort(
        (a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
      );

      const lastPaymentDate = sortedPayments[0]?.paymentDate || null;

      return {
        id: property.id,
        name: property.name,
        address: `${property.city}, ${property.state}`,
        totalUnits,
        occupiedUnits,
        occupancyRate,
        monthlyRent,
        lastPaymentDate,
      };
    });
  }, [properties, leases, payments]);

  // Generate revenue trend data (last 6 months)
  const revenueTrendData = useMemo(() => {
    if (!payments) return [];

    const now = new Date();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIndex = month.getMonth();
      const year = month.getFullYear();

      const monthPayments = (payments || []).filter((payment: any) => {
        const paymentDate = new Date(payment.paymentDate);
        return (
          paymentDate.getMonth() === monthIndex &&
          paymentDate.getFullYear() === year &&
          payment.status === 'COMPLETED'
        );
      });

      const revenue = monthPayments.reduce(
        (sum: number, payment: any) => sum + Number(payment.amount || 0),
        0,
      );

      data.push({
        month: monthNames[monthIndex],
        revenue,
      });
    }

    return data;
  }, [payments]);

  const handleViewProperty = (propertyId: string) => {
    navigate(`/work-orders?propertyId=${propertyId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
        <p className="text-gray-500 mt-1">Property-level P&L and rent collection tracking</p>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Monthly Rent</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(portfolioSummary.totalMonthlyRent)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              From {portfolioSummary.activeLeaseCount} active leases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Collection Rate</CardTitle>
            <div
              className={`p-2 rounded-lg ${
                portfolioSummary.collectionRate >= 90
                  ? 'bg-green-100 text-green-600'
                  : portfolioSummary.collectionRate >= 70
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-red-100 text-red-600'
              }`}
            >
              <Percent className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                portfolioSummary.collectionRate >= 90
                  ? 'text-green-700'
                  : portfolioSummary.collectionRate >= 70
                    ? 'text-amber-700'
                    : 'text-red-700'
              }`}
            >
              {portfolioSummary.collectionRate}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Outstanding Balance</CardTitle>
            <div
              className={`p-2 rounded-lg ${
                portfolioSummary.outstandingBalance > 0
                  ? 'bg-red-100 text-red-600'
                  : 'bg-green-100 text-green-600'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                portfolioSummary.outstandingBalance > 0 ? 'text-red-700' : 'text-green-700'
              }`}
            >
              {formatCurrency(portfolioSummary.outstandingBalance)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Expected - Collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Net Operating Income
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(dashboard?.netOperatingIncome || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">NOI</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Revenue Trend (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueTrendData.length > 0 && revenueTrendData.some((d) => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <PieChart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No payment data available yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Revenue trends will appear once payments are recorded
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Property Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {propertyPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Property
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                      Units
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                      Occupancy
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Monthly Rent
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                      Last Payment
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {propertyPerformance.map((property: any) => (
                    <tr
                      key={property.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{property.name}</p>
                          <p className="text-sm text-gray-500">{property.address}</p>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-gray-700">
                          {property.occupiedUnits}/{property.totalUnits}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            property.occupancyRate >= 90
                              ? 'bg-green-100 text-green-700'
                              : property.occupancyRate >= 70
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {property.occupancyRate}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(property.monthlyRent)}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        {property.lastPaymentDate ? (
                          <span className="text-sm text-gray-600">
                            {formatDate(property.lastPaymentDate)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">No payments</span>
                        )}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProperty(property.id)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No properties found</p>
              <p className="text-sm text-gray-400 mt-1">
                Add properties to see performance metrics
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Original Chart of Accounts - moved to bottom */}
      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartOfAccountsSection />
        </CardContent>
      </Card>
    </div>
  );
}

// Separate component for chart of accounts to keep the main component cleaner
function ChartOfAccountsSection() {
  const {
    data: chartOfAccounts,
    isLoading: isLoadingAccounts,
    isError: isErrorAccounts,
    error: accountsError,
  } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const response = await api.get('/financial/chart-of-accounts');
      return response.data.data;
    },
  });

  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-sm text-gray-500">Loading chart of accounts...</p>
        </div>
      </div>
    );
  }

  if (isErrorAccounts) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600">
          Failed to load chart of accounts: {(accountsError as any)?.message || 'Unknown error'}
        </p>
      </div>
    );
  }

  if (!chartOfAccounts || chartOfAccounts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No accounts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((type) => {
        const accounts = chartOfAccounts.filter((a: any) => a.type === type);
        if (accounts.length === 0) return null;

        return (
          <div key={type}>
            <h3 className="font-semibold text-sm text-gray-700 mb-2">
              {type.charAt(0) + type.slice(1).toLowerCase()}s
            </h3>
            <div className="space-y-1">
              {accounts.map((account: any) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-500 w-16">
                      {account.accountNumber}
                    </span>
                    <span className="text-sm font-medium">{account.name}</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                    {account.subType.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
