import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { format, formatDistanceToNow } from 'date-fns';
import api from '../services/api';

type NotificationType =
  | 'all'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REMINDER'
  | 'AUTOPAY_UPCOMING'
  | 'AUTOPAY_PROCESSED'
  | 'AUTOPAY_FAILED'
  | 'LEASE_EXPIRING'
  | 'LEASE_EXPIRED'
  | 'LATE_FEE_APPLIED'
  | 'WORK_ORDER_UPDATE';

type FilterStatus = 'all' | 'unread' | 'read';

interface BackendNotification {
  id: string;
  type: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  channel: string;
  recipientEmail: string | null;
  recipientUserId: string | null;
  subject: string;
  body: string;
  htmlBody: string | null;
  referenceType: string | null;
  referenceId: string | null;
  organizationId: string;
  sentAt: string | null;
  readAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

const typeConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  all: { label: 'All', icon: Bell, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  PAYMENT_RECEIVED: {
    label: 'Payment Received',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  PAYMENT_FAILED: {
    label: 'Payment Failed',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  PAYMENT_REMINDER: {
    label: 'Payment Reminder',
    icon: DollarSign,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  AUTOPAY_UPCOMING: {
    label: 'Auto-Pay Upcoming',
    icon: DollarSign,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  AUTOPAY_PROCESSED: {
    label: 'Auto-Pay Processed',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  AUTOPAY_FAILED: {
    label: 'Auto-Pay Failed',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  LEASE_EXPIRING: {
    label: 'Lease Expiring',
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  LEASE_EXPIRED: {
    label: 'Lease Expired',
    icon: FileText,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  LATE_FEE_APPLIED: {
    label: 'Late Fee Applied',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  WORK_ORDER_UPDATE: {
    label: 'Work Order Update',
    icon: Wrench,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  SENT: { label: 'Sent', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  FAILED: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
  READ: { label: 'Read', color: 'text-green-600', bgColor: 'bg-green-100' },
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<NotificationType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // Fetch notifications from backend
  const { data: notificationsResponse, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications?limit=100');
      return response.data;
    },
  });

  // Fetch notification stats
  const { data: statsResponse } = useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: async () => {
      const response = await api.get('/notifications/stats');
      return response.data;
    },
  });

  // Fetch unread count
  const { data: unreadResponse } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await api.get('/notifications/unread-count');
      return response.data;
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/notifications/${id}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications: BackendNotification[] = notificationsResponse?.data || [];
  const stats = statsResponse?.data || { total: 0, pending: 0, sent: 0, failed: 0, read: 0 };
  const unreadCount = unreadResponse?.data?.count || 0;

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((n) => n.type === filterType);
    }

    // Filter by status
    if (filterStatus === 'unread') {
      filtered = filtered.filter((n) => n.status !== 'READ' && !n.readAt);
    } else if (filterStatus === 'read') {
      filtered = filtered.filter((n) => n.status === 'READ' || n.readAt);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) => n.subject.toLowerCase().includes(query) || n.body.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [notifications, filterType, filterStatus, searchQuery]);

  // Handlers
  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsReadMutation.mutate(id);
    },
    [markAsReadMutation],
  );

  const handleMarkAllAsRead = useCallback(() => {
    const unreadIds = notifications.filter((n) => n.status !== 'READ' && !n.readAt).map((n) => n.id);
    unreadIds.forEach((id) => markAsReadMutation.mutate(id));
  }, [notifications, markAsReadMutation]);

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
    selectedNotifications.forEach((id) => markAsReadMutation.mutate(id));
    setSelectedNotifications(new Set());
  }, [selectedNotifications, markAsReadMutation]);

  const isRead = (notification: BackendNotification) =>
    notification.status === 'READ' || notification.readAt !== null;

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
          {unreadCount > 0 && (
            <Button size="sm" className="gap-2" onClick={handleMarkAllAsRead}>
              <CheckCheck className="w-4 h-4" />
              Mark All Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sent</p>
              <p className="text-xl font-bold text-gray-900">{stats.sent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-xl font-bold text-gray-900">{stats.failed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <BellOff className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Read</p>
              <p className="text-xl font-bold text-gray-900">{stats.read}</p>
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
              <option value="all">All Types</option>
              <option value="PAYMENT_RECEIVED">Payment Received</option>
              <option value="PAYMENT_FAILED">Payment Failed</option>
              <option value="PAYMENT_REMINDER">Payment Reminder</option>
              <option value="LEASE_EXPIRING">Lease Expiring</option>
              <option value="WORK_ORDER_UPDATE">Work Order Update</option>
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
              const config = typeConfig[notification.type] || typeConfig.all;
              const notifStatusConfig = statusConfig[notification.status] || statusConfig.PENDING;
              const Icon = config.icon;
              const read = isRead(notification);

              return (
                <div
                  key={notification.id}
                  className={`px-4 py-4 hover:bg-gray-50 transition-colors ${
                    !read ? 'bg-blue-50/30' : ''
                  }`}
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
                            <h3 className={`font-medium ${!read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.subject}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${notifStatusConfig.bgColor} ${notifStatusConfig.color}`}
                            >
                              {notifStatusConfig.label}
                            </span>
                            {!read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                          {notification.recipientEmail && (
                            <p className="text-xs text-gray-400 mt-1">
                              To: {notification.recipientEmail}
                            </p>
                          )}
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
                            {notification.referenceType && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                {notification.referenceType}
                              </span>
                            )}
                          </div>
                          {notification.errorMessage && (
                            <p className="text-xs text-red-500 mt-1">
                              Error: {notification.errorMessage}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
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
