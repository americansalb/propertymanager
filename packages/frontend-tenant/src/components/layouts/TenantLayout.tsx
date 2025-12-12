'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  DollarSign,
  Wrench,
  FileText,
  User,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Bell,
  FolderOpen,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

interface TenantLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Payments', href: '/payments', icon: DollarSign },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
  { name: 'My Lease', href: '/lease', icon: FileText },
  { name: 'Documents', href: '/documents', icon: FolderOpen },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Profile', href: '/profile', icon: User },
];

export default function TenantLayout({ children }: TenantLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { tenant, isAuthenticated, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: unreadMessageCount } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/messages/unread-count');
      return response.data.data.count as number;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: unreadNotificationCount } = useQuery({
    queryKey: ['notification-count'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/notifications/unread-count');
      return response.data.data.count as number;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div className={`lg:hidden fixed inset-0 z-50 ${mobileMenuOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`fixed inset-0 bg-gray-900/50 transition-opacity ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <div
          className={`fixed inset-y-0 left-0 w-64 bg-white shadow-xl transform transition-transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <Home className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold">PropertyMaster</p>
                <p className="text-xs text-gray-500">Tenant Portal</p>
              </div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                  {item.name === 'Messages' && unreadMessageCount && unreadMessageCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadMessageCount}
                    </span>
                  )}
                </Link>
              );
            })}
            {/* Notifications Link */}
            <Link
              href="/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/notifications'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Bell className="w-5 h-5" />
              Notifications
              {unreadNotificationCount && unreadNotificationCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadNotificationCount}
                </span>
              )}
            </Link>
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r">
          <div className="flex items-center gap-3 h-16 px-6 border-b">
            <div className="p-2 bg-primary rounded-lg">
              <Home className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">PropertyMaster</p>
              <p className="text-xs text-gray-500">Tenant Portal</p>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                  {item.name === 'Messages' && unreadMessageCount && unreadMessageCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadMessageCount}
                    </span>
                  )}
                </Link>
              );
            })}
            {/* Notifications Link */}
            <Link
              href="/notifications"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/notifications'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Bell className="w-5 h-5" />
              Notifications
              {unreadNotificationCount && unreadNotificationCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadNotificationCount}
                </span>
              )}
            </Link>
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {tenant?.firstName?.[0]}
                  {tenant?.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {tenant?.firstName} {tenant?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{tenant?.email}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white border-b lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <Home className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">PropertyMaster</span>
            </div>
            <Link href="/notifications" className="relative">
              <Bell className="w-6 h-6 text-gray-500" />
              {unreadNotificationCount && unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
