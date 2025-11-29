import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  AlertTriangle,
  Info,
  DollarSign,
  Wrench,
  FileText,
  Users,
  Home,
  Clock,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { format, formatDistanceToNow, subDays, subHours } from 'date-fns';
import api from '../services/api';

type NotificationType =
  | 'all'
  | 'work_order'
  | 'lease'
  | 'payment'
  | 'maintenance'
  | 'alert'
  | 'info'
  | 'vendor'
  | 'property';
type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
type FilterStatus = 'all' | 'unread' | 'read';

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  archived: boolean;
  createdAt: Date;
  link?: string;
  metadata?: Record<string, any>;
}

const typeConfig: Record<
  NotificationType,
  { label: string; icon: React.ComponentType<any>; color: string; bgColor: string }
> = {
  all: { label: 'All', icon: Bell, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  work_order: {
    label: 'Work Orders',
    icon: Wrench,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  lease: { label: 'Leases', icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  payment: {
    label: 'Payments',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  maintenance: {
    label: 'Maintenance',
    icon: Wrench,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  alert: { label: 'Alerts', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
  info: { label: 'Info', icon: Info, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  vendor: { label: 'Vendors', icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  property: {
    label: 'Properties',
    icon: Home,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
};

const priorityConfig: Record<
  NotificationPriority,
  { label: string; color: string; bgColor: string }
> = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  medium: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  critical: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100' },
};

// Generate comprehensive notifications
const generateNotifications = (
  workOrders: any[],
  leases: any[],
  properties: any[],
  vendors: any[],
): Notification[] => {
  const notifications: Notification[] = [];
  let id = 1;

  // Critical work orders
  workOrders
    ?.filter((wo) => wo.priority === 'CRITICAL')
    .forEach((wo) => {
      notifications.push({
        id: `n-${id++}`,
        type: 'work_order',
        priority: 'critical',
        title: 'CRITICAL: Immediate Attention Required',
        message: `${wo.title} at ${wo.property?.name || 'property'} needs immediate attention`,
        read: false,
        archived: false,
        createdAt: new Date(wo.createdAt || subHours(new Date(), Math.random() * 6)),
        link: '/work-orders',
        metadata: { workOrderId: wo.id },
      });
    });

  // High priority work orders
  workOrders
    ?.filter((wo) => wo.priority === 'HIGH')
    .slice(0, 3)
    .forEach((wo) => {
      notifications.push({
        id: `n-${id++}`,
        type: 'work_order',
        priority: 'high',
        title: 'High Priority Work Order',
        message: `${wo.title} requires attention at ${wo.property?.name || 'property'}`,
        read: Math.random() > 0.6,
        archived: false,
        createdAt: new Date(wo.createdAt || subHours(new Date(), Math.random() * 24)),
        link: '/work-orders',
        metadata: { workOrderId: wo.id },
      });
    });

  // Completed work orders
  workOrders
    ?.filter((wo) => wo.status === 'COMPLETED')
    .slice(0, 4)
    .forEach((wo) => {
      notifications.push({
        id: `n-${id++}`,
        type: 'work_order',
        priority: 'low',
        title: 'Work Order Completed',
        message: `${wo.title} has been completed by ${wo.vendor?.companyName || 'the assigned vendor'}`,
        read: Math.random() > 0.3,
        archived: Math.random() > 0.8,
        createdAt: new Date(wo.updatedAt || subDays(new Date(), Math.random() * 3)),
        link: '/work-orders',
        metadata: { workOrderId: wo.id },
      });
    });

  // Lease expiration warnings
  leases?.forEach((lease) => {
    const endDate = new Date(lease.endDate);
    const daysUntil = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const tenantName =
      `${lease.tenant?.firstName || ''} ${lease.tenant?.lastName || 'Tenant'}`.trim();

    if (daysUntil > 0 && daysUntil <= 7) {
      notifications.push({
        id: `n-${id++}`,
        type: 'lease',
        priority: 'critical',
        title: 'Lease Expiring This Week',
        message: `${tenantName}'s lease expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}. Take action now.`,
        read: false,
        archived: false,
        createdAt: subHours(new Date(), Math.random() * 12),
        link: '/leases',
        metadata: { leaseId: lease.id },
      });
    } else if (daysUntil > 7 && daysUntil <= 30) {
      notifications.push({
        id: `n-${id++}`,
        type: 'lease',
        priority: 'high',
        title: 'Lease Expiring Soon',
        message: `${tenantName}'s lease expires in ${daysUntil} days. Consider renewal options.`,
        read: Math.random() > 0.5,
        archived: false,
        createdAt: subDays(new Date(), Math.random() * 5),
        link: '/leases',
        metadata: { leaseId: lease.id },
      });
    }
  });

  // Payment notifications
  notifications.push({
    id: `n-${id++}`,
    type: 'payment',
    priority: 'medium',
    title: 'Rent Payments Received',
    message: `12 rent payments totaling $18,500 have been processed today`,
    read: Math.random() > 0.5,
    archived: false,
    createdAt: subHours(new Date(), 2),
    link: '/financial',
  });

  notifications.push({
    id: `n-${id++}`,
    type: 'alert',
    priority: 'high',
    title: 'Overdue Payments Alert',
    message: `3 tenants have overdue rent payments totaling $4,500`,
    read: false,
    archived: false,
    createdAt: subHours(new Date(), 8),
    link: '/financial',
  });

  // Vendor notifications
  vendors?.slice(0, 2).forEach((vendor) => {
    notifications.push({
      id: `n-${id++}`,
      type: 'vendor',
      priority: 'low',
      title: 'Vendor Profile Updated',
      message: `${vendor.companyName} has updated their service offerings and availability`,
      read: true,
      archived: false,
      createdAt: subDays(new Date(), Math.random() * 7),
      link: '/vendors',
      metadata: { vendorId: vendor.id },
    });
  });

  // Property notifications
  properties?.slice(0, 2).forEach((property) => {
    notifications.push({
      id: `n-${id++}`,
      type: 'property',
      priority: 'medium',
      title: 'Property Inspection Due',
      message: `Annual inspection is due for ${property.name}`,
      read: Math.random() > 0.5,
      archived: false,
      createdAt: subDays(new Date(), Math.random() * 10),
      link: '/properties',
      metadata: { propertyId: property.id },
    });
  });

  // System notifications
  notifications.push({
    id: `n-${id++}`,
    type: 'info',
    priority: 'low',
    title: 'Weekly Summary Ready',
    message: 'Your weekly property management summary is ready to view',
    read: true,
    archived: false,
    createdAt: subDays(new Date(), 1),
    link: '/reports',
  });

  notifications.push({
    id: `n-${id++}`,
    type: 'info',
    priority: 'low',
    title: 'System Update Complete',
    message: 'PropertyMaster has been updated with new features and improvements',
    read: true,
    archived: true,
    createdAt: subDays(new Date(), 14),
    link: '/settings',
  });

  // Sort: unread first, then by date
  notifications.sort((a, b) => {
    if (a.read !== b.read) {
      return a.read ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return notifications;
};

export default function NotificationsPage() {
  const [filterType, setFilterType] = useState<NotificationType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // Fetch data
  const { data: workOrders, isLoading: loadingWO } = useQuery({
    queryKey: ['workOrders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
      return response.data.data;
    },
  });

  const { data: leases, isLoading: loadingLeases } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      const response = await api.get('/leases');
      return response.data.data;
    },
  });

  const { data: properties, isLoading: loadingProps } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
  });

  const { data: vendors, isLoading: loadingVendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await api.get('/vendors');
      return response.data.data;
    },
  });

  const isLoading = loadingWO || loadingLeases || loadingProps || loadingVendors;

  // Generate and filter notifications
  const allNotifications = useMemo(
    () => generateNotifications(workOrders || [], leases || [], properties || [], vendors || []),
    [workOrders, leases, properties, vendors],
  );

  const filteredNotifications = useMemo(() => {
    let filtered = allNotifications;

    // Filter archived
    if (!showArchived) {
      filtered = filtered.filter((n) => !n.archived);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((n) => n.type === filterType);
    }

    // Filter by status
    if (filterStatus === 'unread') {
      filtered = filtered.filter((n) => !n.read);
    } else if (filterStatus === 'read') {
      filtered = filtered.filter((n) => n.read);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) => n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [allNotifications, filterType, filterStatus, searchQuery, showArchived]);

  // Stats
  const stats = useMemo(() => {
    const unread = allNotifications.filter((n) => !n.read && !n.archived).length;
    const critical = allNotifications.filter((n) => n.priority === 'critical' && !n.read).length;
    const archived = allNotifications.filter((n) => n.archived).length;
    return { total: allNotifications.length, unread, critical, archived };
  }, [allNotifications]);

  // Handlers
  const handleMarkAsRead = useCallback((_id: string) => {
    // TODO: Implement with real API
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    // TODO: Implement with real API
  }, []);

  const handleArchive = useCallback((_id: string) => {
    // TODO: Implement with real API
  }, []);

  const handleDelete = useCallback((_id: string) => {
    // TODO: Implement with real API
  }, []);

  const handleSelectNotification = (id: string) => {
    setSelectedNotifications((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const handleBulkMarkAsRead = useCallback(() => {
    // TODO: Implement with real API
    setSelectedNotifications(new Set());
  }, []);

  const handleBulkArchive = useCallback(() => {
    // TODO: Implement with real API
    setSelectedNotifications(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    // TODO: Implement with real API
    setSelectedNotifications(new Set());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-lg">
              <Bell className="w-6 h-6 text-white" />
            </div>
            Notifications
          </h1>
          <p className="text-gray-500 mt-1">Stay updated on your properties and operations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
          {stats.unread > 0 && (
            <Button size="sm" className="gap-2" onClick={handleMarkAllAsRead}>
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BellOff className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Unread</p>
              <p className="text-xl font-bold text-gray-900">{stats.unread}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Critical</p>
              <p className="text-xl font-bold text-gray-900">{stats.critical}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Archive className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Archived</p>
              <p className="text-xl font-bold text-gray-900">{stats.archived}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as NotificationType)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            >
              {Object.entries(typeConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'unread', 'read'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedNotifications.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={handleSelectAll} className="text-sm text-primary font-medium">
                {selectedNotifications.size === filteredNotifications.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
              <span className="text-sm text-gray-500">{selectedNotifications.size} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleBulkMarkAsRead}>
                <Check className="w-4 h-4" />
                Mark Read
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleBulkArchive}>
                <Archive className="w-4 h-4" />
                Archive
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 hover:text-red-700"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
            <p className="text-gray-500">
              {searchQuery
                ? 'No notifications match your search'
                : filterStatus === 'unread'
                  ? "You're all caught up!"
                  : 'No notifications to display'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => {
              const config = typeConfig[notification.type] || typeConfig.info;
              const priorityConf = priorityConfig[notification.priority];
              const Icon = config.icon;

              return (
                <div
                  key={notification.id}
                  className={`px-4 py-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/30' : ''
                  } ${notification.archived ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notification.id)}
                      onChange={() => handleSelectNotification(notification.id)}
                      className="mt-1 rounded border-gray-300"
                    />

                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className={`font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}
                            >
                              {notification.title}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConf.bgColor} ${priorityConf.color}`}
                            >
                              {priorityConf.label}
                            </span>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                            {notification.archived && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                                Archived
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                              })}
                            </div>
                            <span className="text-xs text-gray-400">
                              {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {!notification.archived && (
                            <button
                              onClick={() => handleArchive(notification.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
