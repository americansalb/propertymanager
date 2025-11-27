import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  FileText,
  TrendingUp,
  Building2,
  DollarSign,
  Wrench,
  Users,
  Calendar,
  FileSpreadsheet,
  Printer,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

type ReportType = 'overview' | 'financial' | 'maintenance' | 'occupancy' | 'vendor';
type TimeRange = '3m' | '6m' | '12m' | 'all';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');

  // Fetch all data
  const { data: workOrders } = useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
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

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await api.get('/vendors');
      return response.data.data;
    },
  });

  // Get date range based on selection
  const getDateRange = useCallback(() => {
    const end = new Date();
    let start: Date;
    switch (timeRange) {
      case '3m':
        start = subMonths(end, 3);
        break;
      case '6m':
        start = subMonths(end, 6);
        break;
      case '12m':
        start = subMonths(end, 12);
        break;
      default:
        start = subMonths(end, 24);
    }
    return { start, end };
  }, [timeRange]);

  // Portfolio Overview Stats
  const portfolioStats = useMemo(() => {
    const totalProperties = properties?.length || 0;
    const totalUnits =
      properties?.reduce((sum: number, p: any) => sum + (p.units?.length || 0), 0) || 0;
    const activeLeases = leases?.filter((l: any) => l.status === 'ACTIVE').length || 0;
    const totalRent =
      leases
        ?.filter((l: any) => l.status === 'ACTIVE')
        .reduce((sum: number, l: any) => sum + (l.monthlyRent || 0), 0) || 0;
    const openWorkOrders = workOrders?.filter((wo: any) => wo.status !== 'COMPLETED').length || 0;
    const completedWorkOrders =
      workOrders?.filter((wo: any) => wo.status === 'COMPLETED').length || 0;
    const occupancyRate = totalUnits > 0 ? (activeLeases / totalUnits) * 100 : 0;

    return {
      totalProperties,
      totalUnits,
      activeLeases,
      totalRent,
      openWorkOrders,
      completedWorkOrders,
      occupancyRate,
    };
  }, [properties, leases, workOrders]);

  // Work Order Status Distribution
  const workOrderStatusData = useMemo(() => {
    if (!workOrders) return [];

    const statusCounts: Record<string, number> = {};
    workOrders.forEach((wo: any) => {
      statusCounts[wo.status] = (statusCounts[wo.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count,
    }));
  }, [workOrders]);

  // Work Order Priority Distribution
  const workOrderPriorityData = useMemo(() => {
    if (!workOrders) return [];

    const priorityCounts: Record<string, number> = {};
    workOrders.forEach((wo: any) => {
      priorityCounts[wo.priority] = (priorityCounts[wo.priority] || 0) + 1;
    });

    return Object.entries(priorityCounts).map(([priority, count]) => ({
      name: priority,
      value: count,
    }));
  }, [workOrders]);

  // Monthly Work Order Trend
  const monthlyWorkOrderTrend = useMemo(() => {
    if (!workOrders) return [];

    const { start, end } = getDateRange();
    const months = eachMonthOfInterval({ start, end });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const created = workOrders.filter((wo: any) => {
        const createdAt = new Date(wo.createdAt);
        return createdAt >= monthStart && createdAt <= monthEnd;
      }).length;

      const completed = workOrders.filter((wo: any) => {
        if (wo.status !== 'COMPLETED') return false;
        const updatedAt = new Date(wo.updatedAt);
        return updatedAt >= monthStart && updatedAt <= monthEnd;
      }).length;

      return {
        month: format(month, 'MMM yy'),
        created,
        completed,
      };
    });
  }, [workOrders, getDateRange]);

  // Property Performance Data
  const propertyPerformanceData = useMemo(() => {
    if (!properties || !workOrders || !leases) return [];

    return properties.slice(0, 10).map((property: any) => {
      const propertyWorkOrders = workOrders.filter((wo: any) => wo.propertyId === property.id);
      const propertyLeases = leases.filter(
        (l: any) => l.unit?.propertyId === property.id && l.status === 'ACTIVE',
      );
      const revenue = propertyLeases.reduce((sum: number, l: any) => sum + (l.monthlyRent || 0), 0);

      return {
        name: property.name?.length > 15 ? property.name.substring(0, 15) + '...' : property.name,
        workOrders: propertyWorkOrders.length,
        revenue: revenue,
        leases: propertyLeases.length,
      };
    });
  }, [properties, workOrders, leases]);

  // Vendor Performance Data
  const vendorPerformanceData = useMemo(() => {
    if (!vendors || !workOrders) return [];

    return vendors.slice(0, 8).map((vendor: any) => {
      const vendorWorkOrders = workOrders.filter((wo: any) => wo.vendorId === vendor.id);
      const completed = vendorWorkOrders.filter((wo: any) => wo.status === 'COMPLETED').length;
      const total = vendorWorkOrders.length;

      return {
        name:
          vendor.companyName?.length > 12
            ? vendor.companyName.substring(0, 12) + '...'
            : vendor.companyName,
        assigned: total,
        completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }, [vendors, workOrders]);

  // Revenue by Month
  const revenueByMonth = useMemo(() => {
    if (!leases) return [];

    const { start, end } = getDateRange();
    const months = eachMonthOfInterval({ start, end });

    return months.map((month) => {
      // Estimate revenue for each month (simplified)
      const activeLeases = leases.filter((l: any) => {
        const leaseStart = new Date(l.startDate);
        const leaseEnd = new Date(l.endDate);
        return l.status === 'ACTIVE' && leaseStart <= month && leaseEnd >= month;
      });

      const revenue = activeLeases.reduce((sum: number, l: any) => sum + (l.monthlyRent || 0), 0);

      return {
        month: format(month, 'MMM yy'),
        revenue,
      };
    });
  }, [leases, getDateRange]);

  // Export handlers
  const handleExportCSV = () => {
    let csvContent = '';
    let filename = '';

    if (activeReport === 'overview') {
      csvContent = 'Metric,Value\n';
      csvContent += `Total Properties,${portfolioStats.totalProperties}\n`;
      csvContent += `Total Units,${portfolioStats.totalUnits}\n`;
      csvContent += `Active Leases,${portfolioStats.activeLeases}\n`;
      csvContent += `Monthly Revenue,$${portfolioStats.totalRent.toLocaleString()}\n`;
      csvContent += `Open Work Orders,${portfolioStats.openWorkOrders}\n`;
      csvContent += `Occupancy Rate,${portfolioStats.occupancyRate.toFixed(1)}%\n`;
      filename = 'portfolio-overview.csv';
    } else if (activeReport === 'maintenance') {
      csvContent = 'Month,Created,Completed\n';
      monthlyWorkOrderTrend.forEach((row) => {
        csvContent += `${row.month},${row.created},${row.completed}\n`;
      });
      filename = 'maintenance-report.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const reportTypes: {
    id: ReportType;
    title: string;
    icon: React.ComponentType<any>;
    description: string;
  }[] = [
    {
      id: 'overview',
      title: 'Portfolio Overview',
      icon: BarChart3,
      description: 'High-level portfolio metrics',
    },
    {
      id: 'financial',
      title: 'Financial Report',
      icon: DollarSign,
      description: 'Revenue and rent analysis',
    },
    {
      id: 'maintenance',
      title: 'Maintenance Report',
      icon: Wrench,
      description: 'Work order analytics',
    },
    {
      id: 'occupancy',
      title: 'Occupancy Report',
      icon: Building2,
      description: 'Unit and lease analytics',
    },
    {
      id: 'vendor',
      title: 'Vendor Performance',
      icon: Users,
      description: 'Vendor completion metrics',
    },
  ];

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '3m', label: '3 Months' },
    { value: '6m', label: '6 Months' },
    { value: '12m', label: '12 Months' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            Reports & Analytics
          </h1>
          <p className="text-gray-500 mt-1">Comprehensive insights across your portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {reportTypes.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveReport(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeReport === id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {title}
            </button>
          ))}
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Time Range:</span>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {timeRanges.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  timeRange === value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
        </p>
      </div>

      {/* Overview Report */}
      {activeReport === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Properties</p>
                  <p className="text-3xl font-bold mt-1">{portfolioStats.totalProperties}</p>
                </div>
                <Building2 className="w-10 h-10 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Monthly Revenue</p>
                  <p className="text-3xl font-bold mt-1">
                    ${portfolioStats.totalRent.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Occupancy Rate</p>
                  <p className="text-3xl font-bold mt-1">
                    {portfolioStats.occupancyRate.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Open Work Orders</p>
                  <p className="text-3xl font-bold mt-1">{portfolioStats.openWorkOrders}</p>
                </div>
                <Wrench className="w-10 h-10 text-orange-200" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Work Order Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Order Status</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie
                    data={workOrderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {workOrderStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            {/* Property Performance */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Revenue</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={propertyPerformanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Financial Report */}
      {activeReport === 'financial' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Annual Revenue (Est.)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(portfolioStats.totalRent * 12).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg. Rent per Unit</p>
                  <p className="text-2xl font-bold text-gray-900">
                    $
                    {portfolioStats.activeLeases > 0
                      ? Math.round(
                          portfolioStats.totalRent / portfolioStats.activeLeases,
                        ).toLocaleString()
                      : 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Leases</p>
                  <p className="text-2xl font-bold text-gray-900">{portfolioStats.activeLeases}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Report */}
      {activeReport === 'maintenance' && (
        <div className="space-y-6">
          {/* Trend Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Order Trend</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyWorkOrderTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" name="Created" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie
                    data={workOrderPriorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {workOrderPriorityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.name === 'EMERGENCY'
                            ? '#EF4444'
                            : entry.name === 'HIGH'
                              ? '#F59E0B'
                              : entry.name === 'MEDIUM'
                                ? '#3B82F6'
                                : '#9CA3AF'
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            {/* Summary Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Completed</span>
                  </div>
                  <span className="text-xl font-bold">{portfolioStats.completedWorkOrders}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">In Progress</span>
                  </div>
                  <span className="text-xl font-bold">
                    {workOrders?.filter((wo: any) => wo.status === 'IN_PROGRESS').length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <span className="font-medium">Pending</span>
                  </div>
                  <span className="text-xl font-bold">
                    {workOrders?.filter((wo: any) => wo.status === 'SUBMITTED').length || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Occupancy Report */}
      {activeReport === 'occupancy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Units</p>
                  <p className="text-3xl font-bold text-gray-900">{portfolioStats.totalUnits}</p>
                </div>
                <Building2 className="w-10 h-10 text-gray-300" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Occupied Units</p>
                  <p className="text-3xl font-bold text-green-600">{portfolioStats.activeLeases}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-300" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Vacant Units</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {portfolioStats.totalUnits - portfolioStats.activeLeases}
                  </p>
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-300" />
              </div>
            </div>
          </div>

          {/* Property Occupancy Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leases by Property</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={propertyPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="leases" name="Active Leases" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Vendor Report */}
      {activeReport === 'vendor' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Performance</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={vendorPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="assigned" name="Assigned" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Vendor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {vendorPerformanceData.slice(0, 4).map((vendor, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-3">{vendor.name}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Assigned</span>
                    <span className="font-medium">{vendor.assigned}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Completed</span>
                    <span className="font-medium text-green-600">{vendor.completed}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Completion Rate</span>
                      <span
                        className={`font-bold ${
                          vendor.completionRate >= 80
                            ? 'text-green-600'
                            : vendor.completionRate >= 50
                              ? 'text-orange-600'
                              : 'text-red-600'
                        }`}
                      >
                        {vendor.completionRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
