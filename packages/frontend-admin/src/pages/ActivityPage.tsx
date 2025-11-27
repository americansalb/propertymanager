import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Wrench,
  Home,
  FileText,
  DollarSign,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Filter,
  RefreshCw,
  Calendar,
  Play,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../services/api';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

type ActivityType = 'work_order' | 'lease' | 'property' | 'vendor' | 'payment' | 'all';
type ActivityAction =
  | 'created'
  | 'updated'
  | 'completed'
  | 'assigned'
  | 'status_change'
  | 'overdue'
  | 'expiring';

interface Activity {
  id: string;
  type: ActivityType;
  action: ActivityAction;
  title: string;
  description: string;
  timestamp: Date;
  metadata: Record<string, any>;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Activity generation from real data
const generateActivitiesFromData = (
  workOrders: any[],
  leases: any[],
  _properties: any[],
  _vendors: any[],
): Activity[] => {
  const activities: Activity[] = [];

  // Work Order Activities
  workOrders?.forEach((wo: any) => {
    // Created activity
    activities.push({
      id: `wo-created-${wo.id}`,
      type: 'work_order',
      action: 'created',
      title: `Work Order Created: ${wo.title}`,
      description: `New ${wo.priority?.toLowerCase() || 'normal'} priority work order at ${wo.property?.name || 'Unknown Property'}`,
      timestamp: new Date(wo.createdAt),
      metadata: { workOrderId: wo.id, propertyId: wo.propertyId, priority: wo.priority },
      read: false,
      priority:
        wo.priority === 'EMERGENCY'
          ? 'critical'
          : wo.priority === 'HIGH'
            ? 'high'
            : wo.priority === 'MEDIUM'
              ? 'medium'
              : 'low',
    });

    // Status change activities
    if (wo.status === 'COMPLETED' && wo.updatedAt !== wo.createdAt) {
      activities.push({
        id: `wo-completed-${wo.id}`,
        type: 'work_order',
        action: 'completed',
        title: `Work Order Completed: ${wo.title}`,
        description: `Successfully completed at ${wo.property?.name || 'Unknown Property'}`,
        timestamp: new Date(wo.updatedAt),
        metadata: { workOrderId: wo.id },
        read: false,
        priority: 'low',
      });
    }

    if (wo.status === 'IN_PROGRESS' && wo.updatedAt !== wo.createdAt) {
      activities.push({
        id: `wo-started-${wo.id}`,
        type: 'work_order',
        action: 'status_change',
        title: `Work Order Started: ${wo.title}`,
        description: `Work has begun at ${wo.property?.name || 'Unknown Property'}`,
        timestamp: new Date(wo.updatedAt),
        metadata: { workOrderId: wo.id },
        read: false,
        priority: 'medium',
      });
    }

    // Vendor assignment
    if (wo.vendor) {
      activities.push({
        id: `wo-assigned-${wo.id}`,
        type: 'work_order',
        action: 'assigned',
        title: `Vendor Assigned: ${wo.title}`,
        description: `${wo.vendor.companyName} assigned to work order`,
        timestamp: new Date(wo.updatedAt),
        metadata: { workOrderId: wo.id, vendorId: wo.vendorId },
        read: false,
        priority: 'medium',
      });
    }

    // Overdue check
    if (wo.scheduledDate && new Date(wo.scheduledDate) < new Date() && wo.status !== 'COMPLETED') {
      activities.push({
        id: `wo-overdue-${wo.id}`,
        type: 'work_order',
        action: 'overdue',
        title: `Overdue: ${wo.title}`,
        description: `Work order is past scheduled date at ${wo.property?.name || 'Unknown Property'}`,
        timestamp: new Date(wo.scheduledDate),
        metadata: { workOrderId: wo.id },
        read: false,
        priority: 'high',
      });
    }
  });

  // Lease Activities
  leases?.forEach((lease: any) => {
    activities.push({
      id: `lease-created-${lease.id}`,
      type: 'lease',
      action: 'created',
      title: `Lease Created`,
      description: `New lease for ${lease.unit?.property?.name || 'Unknown'} - Unit ${lease.unit?.unitNumber || 'N/A'}`,
      timestamp: new Date(lease.createdAt),
      metadata: { leaseId: lease.id, monthlyRent: lease.monthlyRent },
      read: false,
      priority: 'medium',
    });

    // Expiring soon check (within 30 days)
    const endDate = new Date(lease.endDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (endDate <= thirtyDaysFromNow && endDate > new Date() && lease.status === 'ACTIVE') {
      activities.push({
        id: `lease-expiring-${lease.id}`,
        type: 'lease',
        action: 'expiring',
        title: `Lease Expiring Soon`,
        description: `Lease at ${lease.unit?.property?.name || 'Unknown'} expires ${format(endDate, 'MMM d, yyyy')}`,
        timestamp: endDate,
        metadata: { leaseId: lease.id },
        read: false,
        priority: 'high',
      });
    }
  });

  // Sort by timestamp descending
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Get icon for activity type
const getActivityIcon = (type: ActivityType, action: ActivityAction) => {
  if (action === 'completed') return CheckCircle;
  if (action === 'overdue' || action === 'expiring') return AlertCircle;
  if (action === 'assigned') return UserCheck;
  if (action === 'status_change') return Play;

  switch (type) {
    case 'work_order':
      return Wrench;
    case 'lease':
      return FileText;
    case 'property':
      return Home;
    case 'vendor':
      return Users;
    case 'payment':
      return DollarSign;
    default:
      return Bell;
  }
};

// Get color scheme for activity
const getActivityColors = (priority: Activity['priority'], action: ActivityAction) => {
  if (action === 'completed') {
    return {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600 bg-green-100',
      dot: 'bg-green-500',
    };
  }
  if (action === 'overdue') {
    return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600 bg-red-100',
      dot: 'bg-red-500',
    };
  }
  if (action === 'expiring') {
    return {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-600 bg-orange-100',
      dot: 'bg-orange-500',
    };
  }

  switch (priority) {
    case 'critical':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600 bg-red-100',
        dot: 'bg-red-500',
      };
    case 'high':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: 'text-orange-600 bg-orange-100',
        dot: 'bg-orange-500',
      };
    case 'medium':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600 bg-blue-100',
        dot: 'bg-blue-500',
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        icon: 'text-gray-600 bg-gray-100',
        dot: 'bg-gray-400',
      };
  }
};

// Group activities by date
const groupActivitiesByDate = (activities: Activity[]) => {
  const groups: { [key: string]: Activity[] } = {};

  activities.forEach((activity) => {
    let dateKey: string;
    if (isToday(activity.timestamp)) {
      dateKey = 'Today';
    } else if (isYesterday(activity.timestamp)) {
      dateKey = 'Yesterday';
    } else {
      dateKey = format(activity.timestamp, 'EEEE, MMMM d');
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
  });

  return groups;
};

export default function ActivityPage() {
  const [typeFilter, setTypeFilter] = useState<ActivityType>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [readActivities, setReadActivities] = useState<Set<string>>(new Set());

  // Fetch all data
  const { data: workOrders, refetch: refetchWorkOrders } = useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
      return response.data.data;
    },
  });

  const { data: leases, refetch: refetchLeases } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      const response = await api.get('/leases');
      return response.data.data;
    },
  });

  const { data: properties, refetch: refetchProperties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
  });

  const { data: vendors, refetch: refetchVendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await api.get('/vendors');
      return response.data.data;
    },
  });

  // Generate activities from real data
  const activities = useMemo(() => {
    const generated = generateActivitiesFromData(
      workOrders || [],
      leases || [],
      properties || [],
      vendors || [],
    );

    // Apply read state
    return generated.map((a) => ({
      ...a,
      read: readActivities.has(a.id),
    }));
  }, [workOrders, leases, properties, vendors, readActivities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (typeFilter !== 'all' && activity.type !== typeFilter) return false;
      if (showUnreadOnly && activity.read) return false;
      return true;
    });
  }, [activities, typeFilter, showUnreadOnly]);

  // Group by date
  const groupedActivities = useMemo(() => {
    return groupActivitiesByDate(filteredActivities);
  }, [filteredActivities]);

  // Stats
  const stats = useMemo(() => {
    const unread = activities.filter((a) => !a.read).length;
    const critical = activities.filter((a) => a.priority === 'critical' && !a.read).length;
    const overdue = activities.filter((a) => a.action === 'overdue').length;
    const todayCount = activities.filter((a) => isToday(a.timestamp)).length;

    return { unread, critical, overdue, todayCount };
  }, [activities]);

  const handleRefresh = () => {
    refetchWorkOrders();
    refetchLeases();
    refetchProperties();
    refetchVendors();
  };

  const markAsRead = (id: string) => {
    setReadActivities((prev) => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    const allIds = activities.map((a) => a.id);
    setReadActivities(new Set(allIds));
  };

  const filterTypes: { value: ActivityType; label: string; icon: React.ComponentType<any> }[] = [
    { value: 'all', label: 'All Activity', icon: Bell },
    { value: 'work_order', label: 'Work Orders', icon: Wrench },
    { value: 'lease', label: 'Leases', icon: FileText },
    { value: 'property', label: 'Properties', icon: Home },
    { value: 'vendor', label: 'Vendors', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <Bell className="w-6 h-6 text-white" />
            </div>
            Activity Log
          </h1>
          <p className="text-gray-500 mt-1">Track all changes and updates across your portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="gap-2"
            disabled={stats.unread === 0}
          >
            <CheckCircle className="w-4 h-4" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.unread}</p>
              <p className="text-sm text-gray-500">Unread</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.critical}</p>
              <p className="text-sm text-gray-500">Critical</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
              <p className="text-sm text-gray-500">Overdue Items</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.todayCount}</p>
              <p className="text-sm text-gray-500">Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterTypes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  typeFilter === value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="sm:ml-auto">
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showUnreadOnly
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showUnreadOnly ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showUnreadOnly ? 'Showing Unread' : 'Show Unread Only'}
            </button>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {Object.keys(groupedActivities).length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
            <p className="text-gray-500">
              Activity from your properties, work orders, and leases will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Object.entries(groupedActivities).map(([date, dayActivities]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {date}
                    <span className="text-gray-400 font-normal">
                      ({dayActivities.length} {dayActivities.length === 1 ? 'event' : 'events'})
                    </span>
                  </h3>
                </div>

                {/* Activities */}
                <div className="divide-y divide-gray-50">
                  {dayActivities.map((activity) => {
                    const Icon = getActivityIcon(activity.type, activity.action);
                    const colors = getActivityColors(activity.priority, activity.action);

                    return (
                      <div
                        key={activity.id}
                        onClick={() => markAsRead(activity.id)}
                        className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-all ${
                          !activity.read ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div
                            className={`p-2.5 rounded-xl flex-shrink-0 ${colors.icon} shadow-sm`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4
                                  className={`font-medium ${!activity.read ? 'text-gray-900' : 'text-gray-700'}`}
                                >
                                  {activity.title}
                                  {!activity.read && (
                                    <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full" />
                                  )}
                                </h4>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {activity.description}
                                </p>
                              </div>

                              {/* Priority Badge */}
                              {activity.priority !== 'low' && (
                                <span
                                  className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                                    activity.priority === 'critical'
                                      ? 'bg-red-100 text-red-700'
                                      : activity.priority === 'high'
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {activity.priority.toUpperCase()}
                                </span>
                              )}
                            </div>

                            {/* Timestamp */}
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                              <span className="mx-1">•</span>
                              {format(activity.timestamp, 'h:mm a')}
                            </p>
                          </div>

                          {/* Arrow */}
                          <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Summary Footer */}
      <div className="text-center text-sm text-gray-500 py-4">
        Showing {filteredActivities.length} of {activities.length} activities
        {typeFilter !== 'all' && ` • Filtered by ${typeFilter.replace('_', ' ')}`}
      </div>
    </div>
  );
}
