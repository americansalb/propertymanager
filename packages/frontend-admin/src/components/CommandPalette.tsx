import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Command,
  Home,
  FileText,
  DollarSign,
  Wrench,
  Users,
  Building2,
  Calendar,
  Bell,
  BarChart3,
  Settings,
  FolderOpen,
  User,
  Clock,
  Zap,
  X,
  CornerDownLeft,
} from 'lucide-react';
import api from '../services/api';

type SearchCategory =
  | 'all'
  | 'properties'
  | 'leases'
  | 'work_orders'
  | 'vendors'
  | 'tenants'
  | 'pages';

interface SearchResult {
  id: string;
  type: 'property' | 'lease' | 'work_order' | 'vendor' | 'tenant' | 'page' | 'action';
  title: string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  href?: string;
  action?: () => void;
  metadata?: Record<string, any>;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  shortcut?: string;
  action: () => void;
}

const categoryIcons: Record<SearchCategory, React.ComponentType<any>> = {
  all: Search,
  properties: Home,
  leases: FileText,
  work_orders: Wrench,
  vendors: Users,
  tenants: User,
  pages: Command,
};

const typeConfig: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  property: { icon: Home, color: 'text-green-600' },
  lease: { icon: FileText, color: 'text-blue-600' },
  work_order: { icon: Wrench, color: 'text-orange-600' },
  vendor: { icon: Users, color: 'text-purple-600' },
  tenant: { icon: User, color: 'text-cyan-600' },
  page: { icon: Command, color: 'text-gray-600' },
  action: { icon: Zap, color: 'text-yellow-600' },
};

const pages: SearchResult[] = [
  {
    id: 'page-dashboard',
    type: 'page',
    title: 'Dashboard',
    subtitle: 'Overview and analytics',
    icon: Building2,
    href: '/',
  },
  {
    id: 'page-properties',
    type: 'page',
    title: 'Properties',
    subtitle: 'Manage properties',
    icon: Home,
    href: '/properties',
  },
  {
    id: 'page-leases',
    type: 'page',
    title: 'Leases',
    subtitle: 'Lease management',
    icon: FileText,
    href: '/leases',
  },
  {
    id: 'page-financial',
    type: 'page',
    title: 'Financial',
    subtitle: 'Payments and transactions',
    icon: DollarSign,
    href: '/financial',
  },
  {
    id: 'page-work-orders',
    type: 'page',
    title: 'Work Orders',
    subtitle: 'Maintenance requests',
    icon: Wrench,
    href: '/work-orders',
  },
  {
    id: 'page-vendors',
    type: 'page',
    title: 'Vendors',
    subtitle: 'Vendor management',
    icon: Users,
    href: '/vendors',
  },
  {
    id: 'page-documents',
    type: 'page',
    title: 'Documents',
    subtitle: 'File management',
    icon: FolderOpen,
    href: '/documents',
  },
  {
    id: 'page-calendar',
    type: 'page',
    title: 'Calendar',
    subtitle: 'Events and scheduling',
    icon: Calendar,
    href: '/calendar',
  },
  {
    id: 'page-activity',
    type: 'page',
    title: 'Activity',
    subtitle: 'Activity log',
    icon: Bell,
    href: '/activity',
  },
  {
    id: 'page-reports',
    type: 'page',
    title: 'Reports',
    subtitle: 'Analytics and exports',
    icon: BarChart3,
    href: '/reports',
  },
  {
    id: 'page-tenant-portal',
    type: 'page',
    title: 'Tenant Portal',
    subtitle: 'Tenant view',
    icon: User,
    href: '/tenant-portal',
  },
  {
    id: 'page-settings',
    type: 'page',
    title: 'Settings',
    subtitle: 'App configuration',
    icon: Settings,
    href: '/settings',
  },
  {
    id: 'page-notifications',
    type: 'page',
    title: 'Notifications',
    subtitle: 'All notifications',
    icon: Bell,
    href: '/notifications',
  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Fetch data for search
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
    enabled: isOpen,
  });

  const { data: leases } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      const response = await api.get('/leases');
      return response.data.data;
    },
    enabled: isOpen,
  });

  const { data: workOrders } = useQuery({
    queryKey: ['workOrders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
      return response.data.data;
    },
    enabled: isOpen,
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await api.get('/vendors');
      return response.data.data;
    },
    enabled: isOpen,
  });

  // Quick actions
  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'action-new-work-order',
        title: 'Create Work Order',
        description: 'Submit a new maintenance request',
        icon: Wrench,
        shortcut: 'W',
        action: () => {
          navigate('/work-orders');
          onClose();
        },
      },
      {
        id: 'action-new-lease',
        title: 'Create Lease',
        description: 'Add a new lease agreement',
        icon: FileText,
        shortcut: 'L',
        action: () => {
          navigate('/leases');
          onClose();
        },
      },
      {
        id: 'action-view-reports',
        title: 'View Reports',
        description: 'Open analytics dashboard',
        icon: BarChart3,
        shortcut: 'R',
        action: () => {
          navigate('/reports');
          onClose();
        },
      },
      {
        id: 'action-settings',
        title: 'Open Settings',
        description: 'Configure application',
        icon: Settings,
        shortcut: ',',
        action: () => {
          navigate('/settings');
          onClose();
        },
      },
    ],
    [navigate, onClose],
  );

  // Build search results
  const searchResults = useMemo(() => {
    const results: SearchResult[] = [];
    const q = query.toLowerCase().trim();

    // Add pages
    if (selectedCategory === 'all' || selectedCategory === 'pages') {
      pages.forEach((page) => {
        if (
          !q ||
          page.title.toLowerCase().includes(q) ||
          page.subtitle?.toLowerCase().includes(q)
        ) {
          results.push(page);
        }
      });
    }

    // Add properties
    if (selectedCategory === 'all' || selectedCategory === 'properties') {
      properties?.forEach((property: any) => {
        if (
          !q ||
          property.name?.toLowerCase().includes(q) ||
          property.address?.toLowerCase().includes(q)
        ) {
          results.push({
            id: `property-${property.id}`,
            type: 'property',
            title: property.name,
            subtitle: property.address,
            icon: Home,
            href: '/properties',
            metadata: { propertyId: property.id },
          });
        }
      });
    }

    // Add leases
    if (selectedCategory === 'all' || selectedCategory === 'leases') {
      leases?.forEach((lease: any) => {
        const tenantName =
          `${lease.tenant?.firstName || ''} ${lease.tenant?.lastName || ''}`.trim();
        if (!q || tenantName.toLowerCase().includes(q) || lease.unit?.unitNumber?.includes(q)) {
          results.push({
            id: `lease-${lease.id}`,
            type: 'lease',
            title: `Lease - ${tenantName || 'Unknown Tenant'}`,
            subtitle: `Unit ${lease.unit?.unitNumber || 'N/A'} • $${lease.rentAmount?.toLocaleString() || 0}/mo`,
            icon: FileText,
            href: '/leases',
            metadata: { leaseId: lease.id },
          });
        }
      });
    }

    // Add work orders
    if (selectedCategory === 'all' || selectedCategory === 'work_orders') {
      workOrders?.forEach((wo: any) => {
        if (
          !q ||
          wo.title?.toLowerCase().includes(q) ||
          wo.description?.toLowerCase().includes(q)
        ) {
          results.push({
            id: `wo-${wo.id}`,
            type: 'work_order',
            title: wo.title || `Work Order #${wo.id.slice(-6)}`,
            subtitle: `${wo.status} • ${wo.priority} priority`,
            icon: Wrench,
            href: '/work-orders',
            metadata: { workOrderId: wo.id },
          });
        }
      });
    }

    // Add vendors
    if (selectedCategory === 'all' || selectedCategory === 'vendors') {
      vendors?.forEach((vendor: any) => {
        if (
          !q ||
          vendor.companyName?.toLowerCase().includes(q) ||
          vendor.specialty?.toLowerCase().includes(q)
        ) {
          results.push({
            id: `vendor-${vendor.id}`,
            type: 'vendor',
            title: vendor.companyName,
            subtitle: vendor.specialty || 'General',
            icon: Users,
            href: '/vendors',
            metadata: { vendorId: vendor.id },
          });
        }
      });
    }

    // Add tenants from leases
    if (selectedCategory === 'all' || selectedCategory === 'tenants') {
      const seenTenants = new Set<string>();
      leases?.forEach((lease: any) => {
        if (lease.tenant && !seenTenants.has(lease.tenant.id)) {
          seenTenants.add(lease.tenant.id);
          const tenantName =
            `${lease.tenant.firstName || ''} ${lease.tenant.lastName || ''}`.trim();
          if (
            !q ||
            tenantName.toLowerCase().includes(q) ||
            lease.tenant.email?.toLowerCase().includes(q)
          ) {
            results.push({
              id: `tenant-${lease.tenant.id}`,
              type: 'tenant',
              title: tenantName || 'Unknown Tenant',
              subtitle: lease.tenant.email || lease.tenant.phone || '',
              icon: User,
              href: '/leases',
              metadata: { tenantId: lease.tenant.id },
            });
          }
        }
      });
    }

    return results.slice(0, 20); // Limit results
  }, [query, selectedCategory, properties, leases, workOrders, vendors]);

  // Handle result selection
  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      // Save to recent searches
      if (query) {
        const newRecent = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem('commandPaletteRecent', JSON.stringify(newRecent));
      }

      // Execute action or navigate
      if (result.action) {
        result.action();
      } else if (result.href) {
        navigate(result.href);
      }

      onClose();
    },
    [query, recentSearches, navigate, onClose],
  );

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(searchResults[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, onClose, handleSelectResult]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    const container = resultsRef.current;
    if (container) {
      const selected = container.querySelector(`[data-index="${selectedIndex}"]`);
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const categories: { key: SearchCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pages', label: 'Pages' },
    { key: 'properties', label: 'Properties' },
    { key: 'leases', label: 'Leases' },
    { key: 'work_orders', label: 'Work Orders' },
    { key: 'vendors', label: 'Vendors' },
    { key: 'tenants', label: 'Tenants' },
  ];

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search properties, leases, work orders, or type a command..."
            className="flex-1 text-lg outline-none placeholder-gray-400"
          />
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">
              esc
            </kbd>
            <span>to close</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 overflow-x-auto">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat.key];
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setSelectedCategory(cat.key);
                  setSelectedIndex(0);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.key
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto">
          {/* Quick Actions (when no query) */}
          {!query && selectedCategory === 'all' && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={action.action}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors group"
                    >
                      <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-primary/10">
                        <Icon className="w-4 h-4 text-gray-600 group-hover:text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{action.title}</p>
                        <p className="text-xs text-gray-500">{action.description}</p>
                      </div>
                      {action.shortcut && (
                        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-500">
                          ⌘{action.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Recent Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(search)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                  >
                    <Clock className="w-3 h-3 text-gray-400" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 ? (
            <div className="py-2">
              {query && (
                <p className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''}
                </p>
              )}
              {searchResults.map((result, index) => {
                const config = typeConfig[result.type];
                const Icon = config?.icon || result.icon;

                return (
                  <button
                    key={result.id}
                    data-index={index}
                    onClick={() => handleSelectResult(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedIndex === index ? 'bg-primary/10' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        selectedIndex === index ? 'bg-primary/20' : 'bg-gray-100'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${selectedIndex === index ? 'text-primary' : config?.color || 'text-gray-600'}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${
                          selectedIndex === index ? 'text-primary' : 'text-gray-900'
                        }`}
                      >
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          selectedIndex === index
                            ? 'bg-primary/20 text-primary'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {result.type.replace('_', ' ')}
                      </span>
                      {selectedIndex === index && (
                        <CornerDownLeft className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : query ? (
            <div className="px-4 py-12 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-900 font-medium">No results found</p>
              <p className="text-sm text-gray-500">Try a different search term</p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono">
                ↵
              </kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono">
                esc
              </kbd>
              close
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>Command Palette</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// Hook to manage command palette state globally
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}
