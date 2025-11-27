import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  PieChart,
  Building2,
  Percent,
  AlertCircle,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatCurrency, formatDate } from '../lib/utils';

// --- Types ---

interface Lease {
  id: string;
  status: string;
  monthlyRent: number;
  unit?: {
    property?: {
      id: string;
    };
  };
  tenants?: Array<{ id: string }>;
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  status: string;
  tenantId: string;
}

interface Property {
  id: string;
  name: string;
  city: string;
  state: string;
  units?: Array<{
    status: string;
  }>;
}

interface ChartOfAccount {
  id: string;
  type: string;
  name: string;
}

interface DashboardData {
  netOperatingIncome: number;
}

// --- Components ---

function TrendBadge({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      <span>{Math.abs(value)}% {label}</span>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  colorClass,
  bgClass,
}: {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  colorClass: string;
  bgClass: string;
}) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden relative group">
      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
        <Icon className="w-24 h-24 -mr-4 -mt-4" />
      </div>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-4 relative z-10">
            <div className={`p-3 rounded-2xl inline-flex ${bgClass} ${colorClass} ring-1 ring-inset ring-black/5`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
            </div>
            <div className="flex items-center gap-3">
              {trend && <TrendBadge value={trend.value} label={trend.label} />}
              <p className="text-xs text-slate-400">{subtext}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl border border-slate-800">
        <p className="font-semibold mb-1 text-slate-300">{label}</p>
        <p className="font-medium text-white text-sm">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

function OccupancyBar({ rate }: { rate: number }) {
  let color = 'bg-emerald-500';
  if (rate < 90) color = 'bg-amber-500';
  if (rate < 70) color = 'bg-rose-500';

  return (
    <div className="w-full max-w-[100px] h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-500 ease-out`}
        style={{ width: `${rate}%` }}
      />
    </div>
  );
}

// --- Main Page ---

export default function FinancialPage() {
  const navigate = useNavigate();

  // Data Fetching
  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ['financial-dashboard'],
    queryFn: async () => {
      const response = await api.get('/financial/dashboard');
      return response.data.data;
    },
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
  });

  const { data: leases } = useQuery<Lease[]>({
    queryKey: ['leases'],
    queryFn: async () => {
      const response = await api.get('/leases');
      return response.data.data;
    },
  });

  const { data: payments } = useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await api.get('/payments');
      return response.data.data;
    },
  });

  // Calculations
  const portfolioSummary = useMemo(() => {
    if (!leases || !payments) {
      return {
        totalMonthlyRent: 0,
        collectionRate: 0,
        outstandingBalance: 0,
        activeLeaseCount: 0,
      };
    }

    const activeLeases = leases.filter((lease) => lease.status === 'ACTIVE');
    const totalMonthlyRent = activeLeases.reduce(
      (sum, lease) => sum + Number(lease.monthlyRent || 0),
      0,
    );

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthPayments = (payments || []).filter((payment) => {
      const paymentDate = new Date(payment.paymentDate);
      return (
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear &&
        payment.status === 'COMPLETED'
      );
    });

    const collectedAmount = currentMonthPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

    const collectionRate =
      totalMonthlyRent > 0
        ? Math.min(100, Math.round((collectedAmount / totalMonthlyRent) * 100))
        : 0;

    const outstandingBalance = Math.max(0, totalMonthlyRent - collectedAmount);

    return {
      totalMonthlyRent,
      collectionRate,
      outstandingBalance,
      activeLeaseCount: activeLeases.length,
    };
  }, [leases, payments]);

  const propertyPerformance = useMemo(() => {
    if (!properties || !leases || !payments) return [];

    return properties.map((property) => {
      const units = property.units || [];
      const totalUnits = units.length;
      const occupiedUnits = units.filter(
        (unit) => unit.status === 'OCCUPIED' || unit.status === 'VACANT_RENTED',
      ).length;
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

      const propertyLeases = leases.filter(
        (lease) => lease.unit?.property?.id === property.id && lease.status === 'ACTIVE',
      );

      const monthlyRent = propertyLeases.reduce(
        (sum, lease) => sum + Number(lease.monthlyRent || 0),
        0,
      );

      const propertyTenantIds = propertyLeases.flatMap((lease) =>
        (lease.tenants || []).map((t) => t.id),
      );

      const propertyPayments = (payments || []).filter((payment) =>
        propertyTenantIds.includes(payment.tenantId),
      );

      const sortedPayments = [...propertyPayments].sort(
        (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
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

  const revenueTrendData = useMemo(() => {
    if (!payments) return [];

    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIndex = month.getMonth();
      const year = month.getFullYear();

      const monthPayments = (payments || []).filter((payment) => {
        const paymentDate = new Date(payment.paymentDate);
        return (
          paymentDate.getMonth() === monthIndex &&
          paymentDate.getFullYear() === year &&
          payment.status === 'COMPLETED'
        );
      });

      const revenue = monthPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financial Dashboard</h1>
          <p className="text-slate-500 mt-1">Real-time financial performance and rent collection metrics.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-slate-600">
            <ExternalLink className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Monthly Rent"
          value={formatCurrency(portfolioSummary.totalMonthlyRent)}
          subtext={`${portfolioSummary.activeLeaseCount} active leases`}
          icon={Wallet}
          trend={{ value: 2.5, label: 'vs last month' }}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <StatCard
          title="Collection Rate"
          value={`${portfolioSummary.collectionRate}%`}
          subtext="Current month"
          icon={Percent}
          trend={{ value: 1.2, label: 'vs last month' }}
          colorClass={portfolioSummary.collectionRate >= 90 ? 'text-emerald-600' : 'text-amber-600'}
          bgClass={portfolioSummary.collectionRate >= 90 ? 'bg-emerald-50' : 'bg-amber-50'}
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(portfolioSummary.outstandingBalance)}
          subtext="Expected - Collected"
          icon={AlertCircle}
          colorClass={portfolioSummary.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}
          bgClass={portfolioSummary.outstandingBalance > 0 ? 'bg-rose-50' : 'bg-emerald-50'}
        />
        <StatCard
          title="Net Operating Income"
          value={formatCurrency(dashboard?.netOperatingIncome || 0)}
          subtext="YTD Performance"
          icon={TrendingUp}
          trend={{ value: 5.4, label: 'vs last year' }}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {revenueTrendData.length > 0 && revenueTrendData.some((d) => d.revenue > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <PieChart className="w-12 h-12 mb-3 opacity-20" />
                  <p>No revenue data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mini Chart of Accounts / Distribution */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Account Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartOfAccountsSection />
          </CardContent>
        </Card>
      </div>

      {/* Property Performance Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Property Performance
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              View All Properties
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {propertyPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Property</th>
                    <th className="text-center py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Occupancy</th>
                    <th className="text-right py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Rent</th>
                    <th className="text-right py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Payment</th>
                    <th className="text-right py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {propertyPerformance.map((property) => (
                    <tr
                      key={property.id}
                      onClick={() => handleViewProperty(property.id)}
                      className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                            {property.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                              {property.name}
                            </p>
                            <p className="text-xs text-slate-500">{property.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-medium text-slate-700">{property.occupancyRate}%</span>
                          <OccupancyBar rate={property.occupancyRate} />
                          <span className="text-xs text-slate-400">{property.occupiedUnits}/{property.totalUnits} units</span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-6">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(property.monthlyRent)}
                        </span>
                      </td>
                      <td className="text-right py-4 px-6">
                        {property.lastPaymentDate ? (
                          <span className="text-sm text-slate-600">
                            {formatDate(property.lastPaymentDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No payments</span>
                        )}
                      </td>
                      <td className="text-right py-4 px-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">No properties found</p>
              <p className="text-sm text-slate-400 mt-1">Add properties to see performance metrics</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChartOfAccountsSection() {
  const {
    data: chartOfAccounts,
    isLoading: isLoadingAccounts,
    isError: isErrorAccounts,
  } = useQuery<ChartOfAccount[]>({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const response = await api.get('/financial/chart-of-accounts');
      return response.data.data;
    },
  });

  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (isErrorAccounts) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-rose-600">Failed to load accounts</p>
      </div>
    );
  }

  if (!chartOfAccounts || chartOfAccounts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">No accounts yet.</p>
      </div>
    );
  }

  // Group by type and calculate mock totals for visualization
  const typeDistribution = ['REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY'].map(type => {
    const count = chartOfAccounts.filter((a) => a.type === type).length;
    return { type, count };
  });

  return (
    <div className="space-y-4">
      {typeDistribution.map(({ type, count }) => (
        <div key={type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${type === 'REVENUE' ? 'bg-emerald-500' :
                type === 'EXPENSE' ? 'bg-rose-500' :
                  type === 'ASSET' ? 'bg-blue-500' : 'bg-slate-500'
              }`} />
            <span className="text-sm font-medium text-slate-700 capitalize">{type.toLowerCase()}s</span>
          </div>
          <span className="text-xs font-semibold text-slate-500">{count} accounts</span>
        </div>
      ))}
      <div className="pt-4 mt-4 border-t border-slate-100">
        <Button variant="outline" size="sm" className="w-full text-xs">
          View Full Chart of Accounts
        </Button>
      </div>
    </div>
  );
}
