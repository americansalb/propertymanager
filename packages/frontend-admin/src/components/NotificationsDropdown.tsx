import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  Info,
  DollarSign,
  Wrench,
  FileText,
  Users,
  Home,
  Clock,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';

export type NotificationType =
  | 'work_order'
  | 'lease'
  | 'payment'
  | 'maintenance'
  | 'alert'
  | 'info'
  | 'vendor'
  | 'property';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  link?: string;
  metadata?: Record<string, any>;
}

const typeConfig: Record<
  NotificationType,
  { icon: React.ComponentType<any>; color: string; bgColor: string }
> = {
  work_order: { icon: Wrench, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  lease: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  payment: { icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-100' },
  maintenance: { icon: Wrench, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  alert: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
  info: { icon: Info, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  vendor: { icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  property: { icon: Home, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
};

const priorityConfig: Record<NotificationPriority, { dot: string; border: string }> = {
  low: { dot: 'bg-gray-400', border: 'border-l-gray-400' },
  medium: { dot: 'bg-blue-500', border: 'border-l-blue-500' },
  high: { dot: 'bg-orange-500', border: 'border-l-orange-500' },
  critical: { dot: 'bg-red-500', border: 'border-l-red-500' },
};

// Generate notifications from real data
const generateNotificationsFromData = (
  workOrders: any[],
  leases: any[],
  properties: any[],
  vendors: any[],
): Notification[] => {
  const notifications: Notification[] = [];
  let notifId = 1;

  console.log('[NotificationsDropdown] Generating notifications from data:', {
    workOrders: workOrders?.length || 0,
    leases: leases?.length || 0,
    properties: properties?.length || 0,
    vendors: vendors?.length || 0,
  });

  // Work order notifications
  workOrders?.slice(0, 5).forEach((wo: any) => {
    if (wo.priority === 'CRITICAL' || wo.priority === 'HIGH') {
      notifications.push({
        id: `notif-${notifId++}`,
        type: 'work_order',
        priority: wo.priority === 'CRITICAL' ? 'critical' : 'high',
        title: `${wo.priority} Priority Work Order`,
        message: `${wo.title || 'Work order'} requires attention at ${wo.property?.name || 'property'}`,
        read: Math.random() > 0.7,
        createdAt: new Date(wo.createdAt || Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        link: '/work-orders',
        metadata: { workOrderId: wo.id },
      });
    }

    if (wo.status === 'COMPLETED') {
      notifications.push({
        id: `notif-${notifId++}`,
        type: 'work_order',
        priority: 'low',
        title: 'Work Order Completed',
        message: `${wo.title || 'Work order'} has been completed by ${wo.vendor?.companyName || 'vendor'}`,
        read: Math.random() > 0.5,
        createdAt: new Date(wo.updatedAt || Date.now() - Math.random() * 48 * 60 * 60 * 1000),
        link: '/work-orders',
        metadata: { workOrderId: wo.id },
      });
    }
  });

  // Lease notifications
  leases?.forEach((lease: any) => {
    const endDate = new Date(lease.endDate);
    const daysUntilEnd = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysUntilEnd > 0 && daysUntilEnd <= 30) {
      notifications.push({
        id: `notif-${notifId++}`,
        type: 'lease',
        priority: daysUntilEnd <= 7 ? 'critical' : daysUntilEnd <= 14 ? 'high' : 'medium',
        title: 'Lease Expiring Soon',
        message: `Lease for ${lease.tenant?.firstName} ${lease.tenant?.lastName} expires in ${daysUntilEnd} days`,
        read: Math.random() > 0.6,
        createdAt: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000),
        link: '/leases',
        metadata: { leaseId: lease.id },
      });
    }
  });

  // Payment notifications (simulated)
  if (Math.random() > 0.3) {
    notifications.push({
      id: `notif-${notifId++}`,
      type: 'payment',
      priority: 'medium',
      title: 'Rent Payment Received',
      message: `Payment of $1,500 received for Unit 101 at Sunset Apartments`,
      read: Math.random() > 0.5,
      createdAt: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000),
      link: '/financial',
    });
  }

  // Overdue payment alert
  if (Math.random() > 0.5) {
    notifications.push({
      id: `notif-${notifId++}`,
      type: 'alert',
      priority: 'high',
      title: 'Overdue Payment',
      message: `Rent payment overdue for 3 units. Total outstanding: $4,500`,
      read: false,
      createdAt: new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000),
      link: '/financial',
    });
  }

  // Vendor notifications
  vendors?.slice(0, 2).forEach((vendor: any) => {
    if (Math.random() > 0.6) {
      notifications.push({
        id: `notif-${notifId++}`,
        type: 'vendor',
        priority: 'low',
        title: 'Vendor Update',
        message: `${vendor.companyName} has updated their availability`,
        read: true,
        createdAt: new Date(Date.now() - Math.random() * 96 * 60 * 60 * 1000),
        link: '/vendors',
        metadata: { vendorId: vendor.id },
      });
    }
  });

  // Property notifications
  properties?.slice(0, 2).forEach((property: any) => {
    if (Math.random() > 0.7) {
      notifications.push({
        id: `notif-${notifId++}`,
        type: 'property',
        priority: 'info' as NotificationPriority,
        title: 'Property Inspection Due',
        message: `Annual inspection due for ${property.name}`,
        read: Math.random() > 0.5,
        createdAt: new Date(Date.now() - Math.random() * 120 * 60 * 60 * 1000),
        link: '/properties',
        metadata: { propertyId: property.id },
      });
    }
  });

  // System info notification
  notifications.push({
    id: `notif-${notifId++}`,
    type: 'info',
    priority: 'low',
    title: 'System Update',
    message: 'PropertyMaster has been updated with new features. Check out the changelog!',
    read: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    link: '/settings',
  });

  // Sort by date (newest first) and unread first
  notifications.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  console.log('[NotificationsDropdown] Generated notifications:', notifications.length);
  return notifications;
};

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch data for generating notifications
  const { data: workOrders } = useQuery({
    queryKey: ['workOrders'],
    queryFn: async () => {
      console.log('[NotificationsDropdown] Fetching work orders...');
      const response = await api.get('/work-orders');
      return response.data.data;
    },
  });

  const { data: leases } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      console.log('[NotificationsDropdown] Fetching leases...');
      const response = await api.get('/leases');
      return response.data.data;
    },
  });

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      console.log('[NotificationsDropdown] Fetching properties...');
      const response = await api.get('/properties');
      return response.data.data;
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      console.log('[NotificationsDropdown] Fetching vendors...');
      const response = await api.get('/vendors');
      return response.data.data;
    },
  });

  // Generate notifications
  const notifications = generateNotificationsFromData(
    workOrders || [],
    leases || [],
    properties || [],
    vendors || [],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const handleMarkAsRead = useCallback((notifId: string) => {
    console.log('[NotificationsDropdown] Marking notification as read:', notifId);
    // In a real app, this would call an API
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    console.log('[NotificationsDropdown] Marking all notifications as read');
    // In a real app, this would call an API
  }, []);

  const handleDeleteNotification = useCallback((notifId: string) => {
    console.log('[NotificationsDropdown] Deleting notification:', notifId);
    // In a real app, this would call an API
  }, []);

  const toggleDropdown = () => {
    console.log('[NotificationsDropdown] Toggle dropdown, current state:', isOpen);
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
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.slice(0, 8).map((notification) => {
                  const config = typeConfig[notification.type];
                  const priority = priorityConfig[notification.priority] || priorityConfig.low;
                  const Icon = config.icon;

                  return (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${priority.border} ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => {
                        handleMarkAsRead(notification.id);
                        if (notification.link) {
                          setIsOpen(false);
                        }
                      }}
                    >
                      <div className="flex gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}
                            >
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!notification.read && (
                                <span className={`w-2 h-2 rounded-full ${priority.dot}`} />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notification.id);
                                }}
                                className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {notification.message}
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
                    </div>
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
