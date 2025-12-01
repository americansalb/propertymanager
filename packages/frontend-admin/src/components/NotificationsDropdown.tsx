import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Info,
  DollarSign,
  Wrench,
  FileText,
  Clock,
  ChevronRight,
  Settings,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';

// Backend notification types from the API
interface BackendNotification {
  id: string;
  type:
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
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  channel: 'EMAIL' | 'SMS' | 'IN_APP';
  recipientEmail: string | null;
  recipientUserId: string | null;
  subject: string;
  body: string;
  referenceType: string | null;
  referenceId: string | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

// Map backend types to display config
const typeConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    displayType: string;
  }
> = {
  PAYMENT_RECEIVED: {
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    displayType: 'payment',
  },
  PAYMENT_FAILED: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    displayType: 'alert',
  },
  PAYMENT_REMINDER: {
    icon: DollarSign,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    displayType: 'payment',
  },
  AUTOPAY_UPCOMING: {
    icon: DollarSign,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    displayType: 'payment',
  },
  AUTOPAY_PROCESSED: {
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    displayType: 'payment',
  },
  AUTOPAY_FAILED: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    displayType: 'alert',
  },
  LEASE_EXPIRING: {
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    displayType: 'lease',
  },
  LEASE_EXPIRED: {
    icon: FileText,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    displayType: 'lease',
  },
  LATE_FEE_APPLIED: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    displayType: 'alert',
  },
  WORK_ORDER_UPDATE: {
    icon: Wrench,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    displayType: 'work_order',
  },
};

// Default config for unknown types
const defaultConfig = {
  icon: Info,
  color: 'text-gray-600',
  bgColor: 'bg-gray-100',
  displayType: 'info',
};

// Priority based on notification type
const getPriority = (type: string): string => {
  const criticalTypes = ['PAYMENT_FAILED', 'AUTOPAY_FAILED', 'LATE_FEE_APPLIED', 'LEASE_EXPIRED'];
  const highTypes = ['LEASE_EXPIRING', 'PAYMENT_REMINDER'];
  const mediumTypes = ['AUTOPAY_UPCOMING', 'WORK_ORDER_UPDATE'];

  if (criticalTypes.includes(type)) {
    return 'critical';
  }
  if (highTypes.includes(type)) {
    return 'high';
  }
  if (mediumTypes.includes(type)) {
    return 'medium';
  }
  return 'low';
};

const priorityConfig: Record<string, { dot: string; border: string }> = {
  low: { dot: 'bg-gray-400', border: 'border-l-gray-400' },
  medium: { dot: 'bg-blue-500', border: 'border-l-blue-500' },
  high: { dot: 'bg-orange-500', border: 'border-l-orange-500' },
  critical: { dot: 'bg-red-500', border: 'border-l-red-500' },
};

// Get link based on notification type
const getNotificationLink = (notification: BackendNotification): string => {
  switch (notification.referenceType) {
    case 'Payment':
      return '/financial';
    case 'Lease':
      return '/leases';
    case 'WorkOrder':
      return '/work-orders';
    case 'Charge':
      return '/financial';
    default:
      return '/notifications';
  }
};

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch notifications from real API
  const {
    data: notificationsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications?limit=20');
      return response.data.data as BackendNotification[];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const response = await api.get('/notifications/unread-count');
      return response.data.data.count as number;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const notifications = useMemo(() => notificationsData || [], [notificationsData]);
  const unreadCount = unreadData || notifications.filter((n) => n.status !== 'READ').length;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.post(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = useCallback(
    (notifId: string) => {
      markAsReadMutation.mutate(notifId);
    },
    [markAsReadMutation],
  );

  const handleMarkAllAsRead = useCallback(() => {
    notifications
      .filter((n) => n.status !== 'READ')
      .forEach((n) => {
        markAsReadMutation.mutate(n.id);
      });
  }, [notifications, markAsReadMutation]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-700"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-700"
                title="Notification settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
                <p className="text-gray-500">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
                <p className="text-gray-500">Failed to load notifications</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.slice(0, 8).map((notification) => {
                  const config = typeConfig[notification.type] || defaultConfig;
                  const priority =
                    priorityConfig[getPriority(notification.type)] || priorityConfig.low;
                  const Icon = config.icon;
                  const isRead = notification.status === 'READ';
                  const link = getNotificationLink(notification);

                  return (
                    <Link
                      to={link}
                      key={notification.id}
                      className={`block px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${priority.border} ${
                        !isRead ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => {
                        if (!isRead) {
                          handleMarkAsRead(notification.id);
                        }
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm font-medium ${!isRead ? 'text-gray-900' : 'text-gray-700'}`}
                            >
                              {notification.subject}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!isRead && (
                                <span className={`w-2 h-2 rounded-full ${priority.dot}`} />
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 p-2 bg-gray-50">
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-primary hover:bg-gray-100 rounded-lg transition-colors"
              >
                View All Notifications
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
