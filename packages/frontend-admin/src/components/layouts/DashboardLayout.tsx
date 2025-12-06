import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  Home,
  FileText,
  DollarSign,
  Wrench,
  Users,
  UserCircle,
  LogOut,
  Menu,
  Bell,
  Calendar,
  BarChart3,
  Settings,
  FolderOpen,
  User,
  Search,
  HelpCircle,
  Download,
  Store,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { logoutUser } from '../../services/api';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useState } from 'react';
import NotificationsDropdown from '../NotificationsDropdown';
import CommandPalette, { useCommandPalette } from '../CommandPalette';
import HelpPanel, { useHelpPanel } from '../HelpPanel';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Properties', href: '/properties', icon: Home },
  { title: 'Leases', href: '/leases', icon: FileText },
  { title: 'Tenants', href: '/tenants', icon: UserCircle },
  { title: 'Financial', href: '/financial', icon: DollarSign },
  { title: 'Work Orders', href: '/work-orders', icon: Wrench },
  { title: 'Vendors', href: '/vendors', icon: Users },
  { title: 'Marketplace', href: '/marketplace', icon: Store },
  { title: 'Documents', href: '/documents', icon: FolderOpen },
  { title: 'Calendar', href: '/calendar', icon: Calendar },
  { title: 'Activity', href: '/activity', icon: Bell },
  { title: 'Reports', href: '/reports', icon: BarChart3 },
  { title: 'Export Data', href: '/export', icon: Download },
  { title: 'Tenant Preview', href: '/tenant-preview', icon: User },
  { title: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const commandPalette = useCommandPalette();
  const helpPanel = useHelpPanel();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-200">
            <div className="p-2 bg-primary rounded-lg">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">PropertyMaster</h1>
              <p className="text-xs text-gray-500">Command Center</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                {user?.firstName[0]}
                {user?.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.organizationName}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Desktop header */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 hidden lg:block">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Search Button */}
            <button
              onClick={() => commandPalette.open()}
              className="flex items-center gap-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors group"
            >
              <Search className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">Search anything...</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded border border-gray-200 text-xs text-gray-400 font-mono">
                ⌘K
              </kbd>
            </button>

            <div className="flex items-center gap-4">
              {/* Help Button */}
              <button
                onClick={() => helpPanel.open()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Help & Resources (⌘/)"
              >
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </button>
              <NotificationsDropdown />
              <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile header */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-6 h-6" />
            </Button>
            <button onClick={() => commandPalette.open()} className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              <span className="font-semibold">PropertyMaster</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => commandPalette.open()}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <Search className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={() => helpPanel.open()} className="p-2 rounded-lg hover:bg-gray-100">
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </button>
              <NotificationsDropdown />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Global Components */}
      <CommandPalette />
      <HelpPanel />
    </div>
  );
}
