'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  Trash2,
  Loader2,
  AlertCircle,
  DollarSign,
  Wrench,
  FileText,
  MessageSquare,
  Calendar,
  Megaphone,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TenantLayout from '@/components/layouts/TenantLayout';
import { format, formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  PAYMENT_RECEIVED: <DollarSign className="w-5 h-5 text-green-500" />,
  PAYMENT_DUE: <DollarSign className="w-5 h-5 text-amber-500" />,
  PAYMENT_OVERDUE: <DollarSign className="w-5 h-5 text-red-500" />,
  AUTOPAY_SCHEDULED: <Calendar className="w-5 h-5 text-blue-500" />,
  AUTOPAY_PROCESSED: <DollarSign className="w-5 h-5 text-green-500" />,
  AUTOPAY_FAILED: <DollarSign className="w-5 h-5 text-red-500" />,
  MAINTENANCE_UPDATE: <Wrench className="w-5 h-5 text-blue-500" />,
  MAINTENANCE_COMPLETED: <Wrench className="w-5 h-5 text-green-500" />,
  LEASE_EXPIRING: <FileText className="w-5 h-5 text-amber-500" />,
  LEASE_RENEWED: <FileText className="w-5 h-5 text-green-500" />,
  NEW_MESSAGE: <MessageSquare className="w-5 h-5 text-blue-500" />,
  DOCUMENT_ADDED: <FileText className="w-5 h-5 text-purple-500" />,
  ANNOUNCEMENT: <Megaphone className="w-5 h-5 text-indigo-500" />,
};

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant-notifications', page],
    queryFn: async () => {
      const response = await api.get(`/tenant-portal/notifications?page=${page}&limit=20`);
      return response.data.data as NotificationsResponse;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.put(`/tenant-portal/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.put('/tenant-portal/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.delete(`/tenant-portal/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsReadMutation.mutateAsync(notification.id);
    }
  };

  if (isLoading) {
    return (
      <TenantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </TenantLayout>
    );
  }

  if (error) {
    return (
      <TenantLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load notifications</h3>
          <p className="text-gray-500">Please try again later.</p>
        </div>
      </TenantLayout>
    );
  }

  const notifications = data?.notifications || [];
  const pagination = data?.pagination;
  const unreadCount = data?.unreadCount || 0;

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCheck className="w-4 h-4 mr-2" />
              )}
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <Card>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                <p className="text-gray-500">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="p-2 rounded-full bg-gray-100 flex-shrink-0">
                      {NOTIFICATION_ICONS[notification.type] || (
                        <Bell className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {notification.actionUrl && (
                            <Link href={notification.actionUrl}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleNotificationClick(notification)}
                              >
                                View
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-red-500"
                            onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            disabled={deleteNotificationMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </TenantLayout>
  );
}
