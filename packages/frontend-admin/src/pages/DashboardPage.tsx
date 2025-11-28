import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  DollarSign,
  Wrench,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatCurrency } from '../lib/utils';
import ExpiringLeasesWidget from '../components/dashboard/ExpiringLeasesWidget';

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
  });

  const { data: leases } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      const response = await api.get('/leases');
      return response.data.data;
    },
  });

  const { data: workOrders } = useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
      return response.data.data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await api.get('/payments');
      return response.data.data;
    },
  });

  // Basic metrics
  const totalUnits =
    properties?.reduce((sum: number, p: any) => sum + (p.units?.length || 0), 0) || 0;
  const activeLeases = leases?.filter((l: any) => l.status === 'ACTIVE').length || 0;
  const occupancyRate = totalUnits > 0 ? ((activeLeases / totalUnits) * 100).toFixed(1) : '0';
  const openWorkOrders =
    workOrders?.filter((w: any) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED').length ||
    0;

  const highPriorityOrders =
    workOrders?.filter(
      (w: any) =>
        (w.priority === 'EMERGENCY' || w.priority === 'HIGH') &&
        w.status !== 'COMPLETED' &&
        w.status !== 'CANCELLED',
    ).length || 0;

  // Work order trend data (last 14 days)
  const workOrderTrend = useMemo(() => {
    if (!workOrders) {
      return [];
    }

    const data = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayLabel = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      const created = workOrders.filter((wo: any) => {
        const woDate = new Date(wo.createdAt).toISOString().split('T')[0];
        return woDate === dateStr;
      }).length;

      const completed = workOrders.filter((wo: any) => {
        if (!wo.updatedAt || wo.status !== 'COMPLETED') {
          return false;
        }
        const woDate = new Date(wo.updatedAt).toISOString().split('T')[0];
        return woDate === dateStr;
      }).length;

      data.push({
        date: dayLabel.split(',')[0], // Just show "Mon 15"
        created,
        completed,
      });
    }

    return data;
  }, [workOrders]);

  // Work order status distribution
  const statusDistribution = useMemo(() => {
    if (!workOrders) {
      return [];
    }

    const counts = {
      COMPLETED: 0,
      IN_PROGRESS: 0,
      SUBMITTED: 0,
      OTHER: 0,
    };

    workOrders.forEach((wo: any) => {
      if (wo.status === 'COMPLETED') {
        counts.COMPLETED++;
      } else if (wo.status === 'IN_PROGRESS') {
        counts.IN_PROGRESS++;
      } else if (wo.status === 'SUBMITTED') {
        counts.SUBMITTED++;
      } else {
        counts.OTHER++;
      }
    });

    return [
      { name: 'Completed', value: counts.COMPLETED, color: '#22c55e' },
      { name: 'In Progress', value: counts.IN_PROGRESS, color: '#3b82f6' },
      { name: 'Submitted', value: counts.SUBMITTED, color: '#f97316' },
      { name: 'Other', value: counts.OTHER, color: '#6b7280' },
    ].filter((d) => d.value > 0);
  }, [workOrders]);

  // Property performance data
  const propertyPerformance = useMemo(() => {
    if (!properties || !leases || !workOrders) {
      return [];
    }

    return properties.slice(0, 5).map((property: any) => {
      const units = property.units || [];
      const occupiedUnits = units.filter(
        (u: any) => u.status === 'OCCUPIED' || u.status === 'VACANT_RENTED',
      ).length;
      const occupancy = units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0;

      const propertyWorkOrders = workOrders.filter((wo: any) => wo.propertyId === property.id);
      const openWOs = propertyWorkOrders.filter(
        (wo: any) => wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED',
      ).length;

      return {
        name: property.name.length > 15 ? `${property.name.substring(0, 15)}...` : property.name,
        fullName: property.name,
        occupancy,
        openWorkOrders: openWOs,
        units: units.length,
      };
    });
  }, [properties, leases, workOrders]);

  // Monthly revenue calculation
  const monthlyRevenue =
    leases?.reduce(
      (sum: number, l: any) => sum + (l.status === 'ACTIVE' ? Number(l.monthlyRent) : 0),
      0,
    ) || 0;

  // Revenue collection this month
  const currentMonthCollection = useMemo(() => {
    if (!payments) {
      return 0;
    }
    const now = new Date();
    return payments
      .filter((p: any) => {
        const paymentDate = new Date(p.paymentDate);
        return (
          paymentDate.getMonth() === now.getMonth() &&
          paymentDate.getFullYear() === now.getFullYear() &&
          p.status === 'COMPLETED'
        );
      })
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  const collectionRate =
    monthlyRevenue > 0 ? Math.round((currentMonthCollection / monthlyRevenue) * 100) : 0;

  // Get 5 most recent non-completed work orders
  const activeWorkOrders =
    workOrders
      ?.filter((w: any) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED')
      ?.slice(0, 5) || [];

  const stats = [
    {
      title: 'Total Properties',
      value: properties?.length || 0,
      icon: Building2,
      trend: `${totalUnits} units`,
      color: 'text-blue-600 bg-blue-100',
      positive: true,
    },
    {
      title: 'Occupancy Rate',
      value: `${occupancyRate}%`,
      icon: Users,
      trend: `${activeLeases} active leases`,
      color: 'text-green-600 bg-green-100',
      positive: Number(occupancyRate) >= 90,
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(monthlyRevenue),
      icon: DollarSign,
      trend: `${collectionRate}% collected`,
      color: 'text-emerald-600 bg-emerald-100',
      positive: collectionRate >= 80,
    },
    {
      title: 'Open Work Orders',
      value: openWorkOrders,
      icon: Wrench,
      trend: `${highPriorityOrders} urgent`,
      color: 'text-orange-600 bg-orange-100',
      positive: openWorkOrders < 10,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Portfolio analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/work-orders')}>
            <Wrench className="w-4 h-4 mr-2" />
            Work Orders
          </Button>
          <Button onClick={() => navigate('/financial')}>
            <DollarSign className="w-4 h-4 mr-2" />
            Financial
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  {stat.positive ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Work Order Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Work Order Trend (14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workOrderTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={workOrderTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="created" name="Created" fill="#f97316" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No work order data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Work Order Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {statusDistribution.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-gray-600">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500">
                No work orders to display
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Property Performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Property Performance
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/properties')}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {propertyPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={propertyPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border">
                          <p className="font-medium">{data.fullName}</p>
                          <p className="text-sm text-gray-600">Occupancy: {data.occupancy}%</p>
                          <p className="text-sm text-gray-600">Units: {data.units}</p>
                          <p className="text-sm text-gray-600">
                            Open Work Orders: {data.openWorkOrders}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="occupancy" name="Occupancy %" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Add properties to see performance metrics
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Expiring Leases Widget */}
        <ExpiringLeasesWidget />

        {/* Active Work Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Urgent Work Orders
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/work-orders')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeWorkOrders.length > 0 ? (
                activeWorkOrders.map((order: any) => (
                  <div
                    key={order.id}
                    onClick={() => navigate('/work-orders')}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{order.title}</p>
                      <p className="text-xs text-gray-500">{order.property?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          order.priority === 'EMERGENCY'
                            ? 'bg-red-100 text-red-700'
                            : order.priority === 'HIGH'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {order.priority}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No urgent work orders</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Leases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Recent Leases
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/leases')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {leases && leases.length > 0 ? (
              <div className="space-y-2">
                {leases.slice(0, 5).map((lease: any) => (
                  <div
                    key={lease.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">Unit {lease.unit?.unitNumber}</p>
                      <p className="text-xs text-gray-500">{lease.unit?.property?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatCurrency(Number(lease.monthlyRent))}/mo
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          lease.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {lease.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No leases yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
