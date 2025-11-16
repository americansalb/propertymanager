import { useQuery } from '@tanstack/react-query';
import { Building2, Users, DollarSign, Wrench, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency } from '../lib/utils';

export default function DashboardPage() {
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
  const openWorkOrders = workOrders?.filter((w: any) => w.status !== 'COMPLETED').length || 0;

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
        leases?.reduce((sum: number, l: any) => sum + (l.status === 'ACTIVE' ? Number(l.monthlyRent) : 0), 0) || 0
      ),
      icon: DollarSign,
      trend: '+8% vs last month',
      color: 'text-emerald-600 bg-emerald-100',
    },
    {
      title: 'Open Work Orders',
      value: openWorkOrders,
      icon: Wrench,
      trend: '3 urgent',
      color: 'text-orange-600 bg-orange-100',
    },
  ];

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
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>Recent Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {workOrders?.slice(0, 5).map((order: any) => (
              <div key={order.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{order.title}</p>
                  <p className="text-xs text-gray-500">{order.property?.name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  order.priority === 'EMERGENCY' ? 'bg-red-100 text-red-700' :
                  order.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {order.priority}
                </span>
              </div>
            ))}
            {(!workOrders || workOrders.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-8">No work orders yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Leases</CardTitle>
          </CardHeader>
          <CardContent>
            {leases?.slice(0, 5).map((lease: any) => (
              <div key={lease.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">Unit {lease.unit?.unitNumber}</p>
                  <p className="text-xs text-gray-500">{lease.unit?.property?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{formatCurrency(Number(lease.monthlyRent))}/mo</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    lease.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    lease.status === 'EXPIRED' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
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
