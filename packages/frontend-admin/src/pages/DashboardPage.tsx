import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, DollarSign, Wrench, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency } from '../lib/utils';

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

  const totalUnits = properties?.reduce((sum: number, p: any) => sum + p.totalUnits, 0) || 0;
  const activeLeases = leases?.filter((l: any) => l.status === 'ACTIVE').length || 0;
  const occupancyRate = totalUnits > 0 ? ((activeLeases / totalUnits) * 100).toFixed(1) : '0';
  const openWorkOrders =
    workOrders?.filter((w: any) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED').length ||
    0;

  // Maintenance snapshot calculations
  const highPriorityOrders =
    workOrders?.filter(
      (w: any) =>
        (w.priority === 'EMERGENCY' || w.priority === 'HIGH') &&
        w.status !== 'COMPLETED' &&
        w.status !== 'CANCELLED',
    ).length || 0;

  // Completed in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentlyCompleted =
    workOrders?.filter((w: any) => {
      if (!w.completedDate) return false;
      return new Date(w.completedDate) >= sevenDaysAgo;
    }).length || 0;

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
      trend: '+2 this month',
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'Active Leases',
      value: activeLeases,
      icon: Users,
      trend: `${occupancyRate}% occupancy`,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(
        leases?.reduce(
          (sum: number, l: any) => sum + (l.status === 'ACTIVE' ? Number(l.monthlyRent) : 0),
          0,
        ) || 0,
      ),
      icon: DollarSign,
      trend: '+8% vs last month',
      color: 'text-emerald-600 bg-emerald-100',
    },
    {
      title: 'Open Work Orders',
      value: openWorkOrders,
      icon: Wrench,
      trend: `${highPriorityOrders} high priority`,
      color: 'text-orange-600 bg-orange-100',
    },
  ];

  const handleWorkOrderClick = () => {
    navigate('/work-orders');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's your portfolio overview.</p>
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
                  <TrendingUp className="w-3 h-3" />
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Maintenance Snapshot */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Maintenance Snapshot</CardTitle>
            <button
              onClick={handleWorkOrderClick}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </button>
          </CardHeader>
          <CardContent>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{openWorkOrders}</div>
                <div className="text-xs text-orange-700 font-medium mt-1">Open</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{highPriorityOrders}</div>
                <div className="text-xs text-red-700 font-medium mt-1">High Priority</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{recentlyCompleted}</div>
                <div className="text-xs text-green-700 font-medium mt-1">Last 7 Days</div>
              </div>
            </div>

            {/* Recent Work Orders List */}
            <div className="space-y-2">
              {activeWorkOrders.length > 0 ? (
                <>
                  <div className="text-xs font-medium text-gray-600 uppercase mb-3">
                    Recent Open Orders
                  </div>
                  {activeWorkOrders.map((order: any) => (
                    <div
                      key={order.id}
                      onClick={handleWorkOrderClick}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{order.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-500 truncate">{order.property?.name}</p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                              order.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-700'
                                : order.status === 'ASSIGNED'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {(order.priority === 'EMERGENCY' || order.priority === 'HIGH') && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
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
                  ))}
                </>
              ) : (
                <div className="text-center py-6">
                  <Wrench className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No open work orders</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Leases */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Leases</CardTitle>
          </CardHeader>
          <CardContent>
            {leases?.slice(0, 5).map((lease: any) => (
              <div
                key={lease.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
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
                    className={`text-xs px-2 py-1 rounded-full ${
                      lease.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : lease.status === 'EXPIRED'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {lease.status}
                  </span>
                </div>
              </div>
            ))}
            {(!leases || leases.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-8">No leases yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
