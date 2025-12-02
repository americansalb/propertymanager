import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Wrench,
  AlertCircle,
  Clock,
  Play,
  CheckCircle,
  X,
  Briefcase,
  Search,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  Download,
  UserPlus,
  FileText,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatDate } from '../lib/utils';
import { WorkOrderDetailDrawer } from '../components/work-orders/WorkOrderDetailDrawer';
import { WorkOrderCreateModal } from '../components/work-orders/WorkOrderCreateModal';
import { WorkOrderUpdateModal } from '../components/work-orders/WorkOrderUpdateModal';
import PropertyEditModal from '../components/properties/PropertyEditModal';
import { useUpdateWorkOrder } from '../hooks/useWorkOrders';

type StatusFilter = 'ALL' | 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
type PriorityFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
type DateRangePreset = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'CUSTOM';

interface NotificationState {
  show: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  details?: string[];
}

export default function WorkOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [propertyEditModalOpen, setPropertyEditModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);
  const [showBulkVendorAssign, setShowBulkVendorAssign] = useState(false);
  const [showBulkActionsMenu, setShowBulkActionsMenu] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    type: 'error',
    title: '',
    message: '',
    details: [],
  });

  const showNotification = useCallback(
    (type: 'success' | 'error' | 'warning', title: string, message: string, details?: string[]) => {
      setNotification({ show: true, type, title, message, details });
    },
    [],
  );

  const closeNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, show: false }));
  }, []);

  // Get property and vendor filters from URL
  const propertyIdFilter = searchParams.get('propertyId');
  const vendorIdFilter = searchParams.get('vendorId');

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
      return response.data.data;
    },
  });

  // Fetch vendors for filtering
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await api.get('/vendors');
      return response.data.data;
    },
  });

  const updateWorkOrder = useUpdateWorkOrder();

  // Initialize filters from URL params on mount
  useEffect(() => {
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const vendorId = searchParams.get('vendorId');

    if (status && ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      setStatusFilter(status as StatusFilter);
    }
    if (priority && ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'].includes(priority)) {
      setPriorityFilter(priority as PriorityFilter);
    }
    if (vendorId) {
      setVendorFilter(vendorId);
    }
  }, [searchParams]);

  // Update URL when filters change
  const updateFiltersInUrl = (
    newStatus?: StatusFilter,
    newPriority?: PriorityFilter,
    newPropertyId?: string | null,
    newVendorId?: string | null,
  ) => {
    const params = new URLSearchParams();

    const status = newStatus !== undefined ? newStatus : statusFilter;
    const priority = newPriority !== undefined ? newPriority : priorityFilter;
    const propertyId = newPropertyId !== undefined ? newPropertyId : propertyIdFilter;
    const vendorId = newVendorId !== undefined ? newVendorId : vendorIdFilter;

    if (status !== 'ALL') {
      params.set('status', status);
    }
    if (priority !== 'ALL') {
      params.set('priority', priority);
    }
    if (propertyId) {
      params.set('propertyId', propertyId);
    }
    if (vendorId) {
      params.set('vendorId', vendorId);
    }

    setSearchParams(params);
  };

  // Calculate age from createdAt
  const getWorkOrderAge = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get age badge text
  const getAgeBadgeText = (age: number): string => {
    if (age === 0) {
      return 'Opened today';
    }
    if (age === 1) {
      return 'Opened 1 day ago';
    }
    return `Opened ${age} days ago`;
  };

  // Get age badge styling
  const getAgeBadgeClass = (age: number): string => {
    if (age <= 2) {
      return 'bg-gray-100 text-gray-700';
    }
    if (age > 7) {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-amber-100 text-amber-700';
  };

  // Handle quick status change
  const handleQuickStatusChange = async (
    workOrderId: string,
    newStatus: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();

    try {
      await updateWorkOrder.mutateAsync({
        id: workOrderId,
        data: { status: newStatus },
      });
    } catch (error: any) {
      console.error('Failed to update work order status:', error);
      const errorMessage =
        error?.response?.data?.message || 'Failed to update status. Please try again.';
      showNotification('error', 'Update Failed', errorMessage);
    }
  };

  // Get date range based on preset
  const getDateRange = useCallback((): { from: Date | null; to: Date | null } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRangePreset) {
      case 'TODAY':
        return { from: today, to: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'WEEK': {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { from: weekAgo, to: now };
      }
      case 'MONTH': {
        const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        return { from: monthAgo, to: now };
      }
      case 'QUARTER': {
        const quarterAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
        return { from: quarterAgo, to: now };
      }
      case 'CUSTOM':
        return {
          from: dateFrom ? new Date(dateFrom) : null,
          to: dateTo ? new Date(`${dateTo}T23:59:59`) : null,
        };
      default:
        return { from: null, to: null };
    }
  }, [dateRangePreset, dateFrom, dateTo]);

  // Filter work orders in memory
  const filteredWorkOrders = useMemo(() => {
    return (
      workOrders?.filter((order: any) => {
        const statusMatch = statusFilter === 'ALL' || order.status === statusFilter;
        const priorityMatch = priorityFilter === 'ALL' || order.priority === priorityFilter;
        const propertyMatch = !propertyIdFilter || order.propertyId === propertyIdFilter;
        // Use URL vendor filter or state vendor filter
        const effectiveVendorFilter =
          vendorIdFilter || (vendorFilter !== 'ALL' ? vendorFilter : null);
        const vendorMatch = !effectiveVendorFilter || order.vendorId === effectiveVendorFilter;

        // Text search filter
        const searchLower = searchQuery.toLowerCase().trim();
        const searchMatch =
          !searchLower ||
          order.title?.toLowerCase().includes(searchLower) ||
          order.description?.toLowerCase().includes(searchLower) ||
          order.property?.name?.toLowerCase().includes(searchLower) ||
          order.unit?.unitNumber?.toLowerCase().includes(searchLower);

        // Date range filter
        const { from, to } = getDateRange();
        const orderDate = new Date(order.createdAt);
        const dateMatch = (!from || orderDate >= from) && (!to || orderDate <= to);

        return (
          statusMatch && priorityMatch && propertyMatch && vendorMatch && searchMatch && dateMatch
        );
      }) || []
    );
  }, [
    workOrders,
    statusFilter,
    priorityFilter,
    propertyIdFilter,
    vendorIdFilter,
    vendorFilter,
    searchQuery,
    getDateRange,
  ]);

  // Get filtered property name for display
  const filteredProperty = workOrders?.find(
    (wo: any) => wo.propertyId === propertyIdFilter,
  )?.property;

  // Get filtered vendor name for display
  const filteredVendor = vendors?.find((v: any) => v.id === vendorIdFilter);

  const openOrders =
    workOrders?.filter((w: any) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED') || [];
  const completedOrders = workOrders?.filter((w: any) => w.status === 'COMPLETED') || [];

  // Check if work order is overdue
  const isOverdue = (order: any) => {
    if (!order.scheduledDate || order.status === 'COMPLETED') {
      return false;
    }
    return new Date(order.scheduledDate) < new Date();
  };

  const handleWorkOrderClick = (order: any) => {
    setSelectedWorkOrder(order);
    setDrawerOpen(true);
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setSearchQuery('');
    setDateRangePreset('ALL');
    setDateFrom('');
    setDateTo('');
    updateFiltersInUrl('ALL', 'ALL', propertyIdFilter);
  };

  // Check if any advanced filters are active
  const hasActiveFilters =
    searchQuery || dateRangePreset !== 'ALL' || statusFilter !== 'ALL' || priorityFilter !== 'ALL';

  const clearPropertyFilter = () => {
    updateFiltersInUrl(statusFilter, priorityFilter, null, vendorIdFilter);
  };

  const clearVendorFilter = () => {
    setVendorFilter('ALL');
    updateFiltersInUrl(statusFilter, priorityFilter, propertyIdFilter, null);
  };

  const handlePropertyClick = (property: any) => {
    setSelectedProperty(property);
    setPropertyEditModalOpen(true);
    setDrawerOpen(false);
  };

  // Bulk selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredWorkOrders.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = filteredWorkOrders.map((wo: any) => wo.id);
      setSelectedIds(new Set(allIds));
    }
  }, [selectedIds.size, filteredWorkOrders]);

  const toggleSelectOne = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setShowBulkActionsMenu(false);
    setShowBulkVendorAssign(false);
  }, []);

  // Bulk actions
  const handleBulkStatusChange = useCallback(
    async (newStatus: string) => {
      if (selectedIds.size === 0) {
        return;
      }

      setBulkActionInProgress(true);

      try {
        const promises = Array.from(selectedIds).map((id) => {
          return updateWorkOrder.mutateAsync({ id, data: { status: newStatus } });
        });

        const results = await Promise.allSettled(promises);
        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        const failedResults = results.filter(
          (r): r is PromiseRejectedResult => r.status === 'rejected',
        );

        if (failedResults.length > 0) {
          // Extract specific error messages from each failed request
          const errorDetails = failedResults.map((r) => {
            const errorMsg =
              r.reason?.response?.data?.message || r.reason?.message || 'Unknown error';
            return typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
          });

          // Remove duplicates
          const uniqueErrors = [...new Set(errorDetails)];

          showNotification(
            'error',
            'Bulk Update Failed',
            `${succeeded} updated successfully, ${failedResults.length} failed.`,
            uniqueErrors,
          );
        } else if (succeeded > 0) {
          showNotification(
            'success',
            'Update Complete',
            `Successfully updated ${succeeded} work order${succeeded > 1 ? 's' : ''}.`,
          );
        }

        clearSelection();
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          'Some updates failed. Please try again.';
        showNotification('error', 'Update Failed', errorMessage);
      } finally {
        setBulkActionInProgress(false);
      }
    },
    [selectedIds, updateWorkOrder, clearSelection, showNotification],
  );

  // Bulk vendor assignment
  const handleBulkVendorAssign = useCallback(
    async (vendorId: string | null) => {
      if (selectedIds.size === 0) {
        return;
      }

      setBulkActionInProgress(true);
      setShowBulkVendorAssign(false);

      try {
        const promises = Array.from(selectedIds).map((id) => {
          return updateWorkOrder.mutateAsync({ id, data: { vendorId } });
        });

        const results = await Promise.allSettled(promises);
        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        const failedResults = results.filter(
          (r): r is PromiseRejectedResult => r.status === 'rejected',
        );

        if (failedResults.length > 0) {
          // Extract specific error messages from each failed request
          const errorDetails = failedResults.map((r) => {
            const errorMsg =
              r.reason?.response?.data?.message || r.reason?.message || 'Unknown error';
            return typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
          });

          // Remove duplicates
          const uniqueErrors = [...new Set(errorDetails)];

          showNotification(
            'error',
            'Vendor Assignment Failed',
            `${succeeded} assigned successfully, ${failedResults.length} failed.`,
            uniqueErrors,
          );
        } else if (succeeded > 0) {
          showNotification(
            'success',
            'Assignment Complete',
            `Successfully assigned vendor to ${succeeded} work order${succeeded > 1 ? 's' : ''}.`,
          );
        }

        clearSelection();
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          'Some assignments failed. Please try again.';
        showNotification('error', 'Assignment Failed', errorMessage);
      } finally {
        setBulkActionInProgress(false);
      }
    },
    [selectedIds, updateWorkOrder, clearSelection, showNotification],
  );

  // Export selected to CSV
  const handleExportCSV = useCallback(() => {
    const selectedOrders =
      selectedIds.size > 0
        ? filteredWorkOrders.filter((wo: any) => selectedIds.has(wo.id))
        : filteredWorkOrders;

    const headers = [
      'ID',
      'Title',
      'Description',
      'Status',
      'Priority',
      'Property',
      'Property Address',
      'Unit',
      'Vendor',
      'Assigned To',
      'Created Date',
      'Scheduled Date',
      'Completed Date',
      'Estimated Cost',
      'Actual Cost',
    ];

    const rows = selectedOrders.map((wo: any) => [
      wo.id,
      wo.title || '',
      wo.description || '',
      wo.status || '',
      wo.priority || '',
      wo.property?.name || '',
      wo.property?.address || '',
      wo.unit?.unitNumber || '',
      wo.vendor?.companyName || 'Unassigned',
      wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : '',
      formatDate(wo.createdAt) || '',
      wo.scheduledDate ? formatDate(wo.scheduledDate) : '',
      wo.completedAt ? formatDate(wo.completedAt) : '',
      wo.estimatedCost?.toString() || '',
      wo.actualCost?.toString() || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) =>
        row.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `work-orders-export-${new Date().toISOString().split('T')[0]}.csv`;

    link.click();
    URL.revokeObjectURL(url);
  }, [selectedIds, filteredWorkOrders]);

  // Export to JSON
  const handleExportJSON = useCallback(() => {
    const selectedOrders =
      selectedIds.size > 0
        ? filteredWorkOrders.filter((wo: any) => selectedIds.has(wo.id))
        : filteredWorkOrders;

    const exportData = selectedOrders.map((wo: any) => ({
      id: wo.id,
      title: wo.title,
      description: wo.description,
      status: wo.status,
      priority: wo.priority,
      property: wo.property?.name,
      propertyAddress: wo.property?.address,
      unit: wo.unit?.unitNumber,
      vendor: wo.vendor?.companyName,
      assignedTo: wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : null,
      createdAt: wo.createdAt,
      scheduledDate: wo.scheduledDate,
      completedAt: wo.completedAt,
      estimatedCost: wo.estimatedCost,
      actualCost: wo.actualCost,
    }));

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `work-orders-export-${new Date().toISOString().split('T')[0]}.json`;

    link.click();
    URL.revokeObjectURL(url);
  }, [selectedIds, filteredWorkOrders]);

  // Generate PDF report
  const handleGenerateReport = useCallback(() => {
    const selectedOrders =
      selectedIds.size > 0
        ? filteredWorkOrders.filter((wo: any) => selectedIds.has(wo.id))
        : filteredWorkOrders;

    // Create a printable HTML document
    const statusCounts = {
      SUBMITTED: selectedOrders.filter((wo: any) => wo.status === 'SUBMITTED').length,
      ASSIGNED: selectedOrders.filter((wo: any) => wo.status === 'ASSIGNED').length,
      IN_PROGRESS: selectedOrders.filter((wo: any) => wo.status === 'IN_PROGRESS').length,
      COMPLETED: selectedOrders.filter((wo: any) => wo.status === 'COMPLETED').length,
    };

    const priorityCounts = {
      EMERGENCY: selectedOrders.filter((wo: any) => wo.priority === 'EMERGENCY').length,
      HIGH: selectedOrders.filter((wo: any) => wo.priority === 'HIGH').length,
      MEDIUM: selectedOrders.filter((wo: any) => wo.priority === 'MEDIUM').length,
      LOW: selectedOrders.filter((wo: any) => wo.priority === 'LOW').length,
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Work Orders Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 30px; }
          .summary { display: flex; gap: 20px; flex-wrap: wrap; margin: 20px 0; }
          .summary-card { background: #f3f4f6; padding: 15px 25px; border-radius: 8px; }
          .summary-card h3 { margin: 0 0 5px 0; font-size: 14px; color: #6b7280; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #1f2937; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
          th { background: #f9fafb; font-weight: 600; }
          tr:nth-child(even) { background: #f9fafb; }
          .status { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
          .status-submitted { background: #e5e7eb; }
          .status-in_progress { background: #dbeafe; color: #1d4ed8; }
          .status-completed { background: #dcfce7; color: #166534; }
          .priority-emergency { background: #fee2e2; color: #dc2626; }
          .priority-high { background: #ffedd5; color: #ea580c; }
          .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Work Orders Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>

        <h2>Summary</h2>
        <div class="summary">
          <div class="summary-card">
            <h3>Total Work Orders</h3>
            <div class="value">${selectedOrders.length}</div>
          </div>
          <div class="summary-card">
            <h3>Open</h3>
            <div class="value">${statusCounts.SUBMITTED + statusCounts.ASSIGNED + statusCounts.IN_PROGRESS}</div>
          </div>
          <div class="summary-card">
            <h3>Completed</h3>
            <div class="value">${statusCounts.COMPLETED}</div>
          </div>
          <div class="summary-card">
            <h3>Urgent (Emergency + High)</h3>
            <div class="value">${priorityCounts.EMERGENCY + priorityCounts.HIGH}</div>
          </div>
        </div>

        <h2>Status Breakdown</h2>
        <div class="summary">
          <div class="summary-card"><h3>Submitted</h3><div class="value">${statusCounts.SUBMITTED}</div></div>
          <div class="summary-card"><h3>Assigned</h3><div class="value">${statusCounts.ASSIGNED}</div></div>
          <div class="summary-card"><h3>In Progress</h3><div class="value">${statusCounts.IN_PROGRESS}</div></div>
          <div class="summary-card"><h3>Completed</h3><div class="value">${statusCounts.COMPLETED}</div></div>
        </div>

        <h2>Work Order Details</h2>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Property</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Vendor</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${selectedOrders
              .map(
                (wo: any) => `
              <tr>
                <td>${wo.title || '-'}</td>
                <td>${wo.property?.name || '-'}${wo.unit ? ` - Unit ${wo.unit.unitNumber}` : ''}</td>
                <td><span class="status status-${wo.status?.toLowerCase()}">${wo.status?.replace('_', ' ') || '-'}</span></td>
                <td><span class="status priority-${wo.priority?.toLowerCase()}">${wo.priority || '-'}</span></td>
                <td>${wo.vendor?.companyName || 'Unassigned'}</td>
                <td>${wo.createdAt ? formatDate(wo.createdAt) : '-'}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>PropertyMaster - Work Orders Report</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  }, [selectedIds, filteredWorkOrders]);

  const isAllSelected =
    filteredWorkOrders.length > 0 && selectedIds.size === filteredWorkOrders.length;
  const hasSelection = selectedIds.size > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <div className="text-gray-500">Loading work orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-500 mt-1">Manage maintenance requests and work orders</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Wrench className="w-4 h-4 mr-2" />
          Create Work Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{openOrders.length}</div>
            <p className="text-sm text-gray-600 mt-1">Open Work Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {
                openOrders.filter((w: any) => w.priority === 'EMERGENCY' || w.priority === 'HIGH')
                  .length
              }
            </div>
            <p className="text-sm text-gray-600 mt-1">Urgent (High + Emergency)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{completedOrders.length}</div>
            <p className="text-sm text-gray-600 mt-1">Completed This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Advanced Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, description, property, or unit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={showAdvancedFilters ? 'bg-gray-100' : ''}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showAdvancedFilters ? 'Hide Filters' : 'More Filters'}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="text-gray-600">
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="pt-4 border-t space-y-4">
                {/* Date Range Presets */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date Range
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { value: 'ALL', label: 'All Time' },
                        { value: 'TODAY', label: 'Today' },
                        { value: 'WEEK', label: 'Last 7 Days' },
                        { value: 'MONTH', label: 'Last 30 Days' },
                        { value: 'QUARTER', label: 'Last 90 Days' },
                        { value: 'CUSTOM', label: 'Custom' },
                      ] as { value: DateRangePreset; label: string }[]
                    ).map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setDateRangePreset(value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          dateRangePreset === value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Range */}
                {dateRangePreset === 'CUSTOM' && (
                  <div className="flex gap-4 items-center">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">From</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">To</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property Filter Banner */}
      {propertyIdFilter && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-900">
                  Filtered by property:{' '}
                  {filteredProperty?.name || <span className="font-mono">{propertyIdFilter}</span>}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPropertyFilter}
                className="h-7 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor Filter Banner */}
      {vendorIdFilter && (
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">
                  Filtered by vendor:{' '}
                  {filteredVendor?.companyName || (
                    <span className="font-mono">{vendorIdFilter}</span>
                  )}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearVendorFilter}
                className="h-7 text-purple-700 hover:text-purple-900 hover:bg-purple-100"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Chips */}
      {workOrders && workOrders.length > 0 && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as StatusFilter[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      updateFiltersInUrl(status, undefined, undefined);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ),
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Priority</label>
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'] as PriorityFilter[]).map(
                (priority) => (
                  <button
                    key={priority}
                    onClick={() => {
                      setPriorityFilter(priority);
                      updateFiltersInUrl(undefined, priority, undefined);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      priorityFilter === priority
                        ? priority === 'EMERGENCY'
                          ? 'bg-red-600 text-white'
                          : priority === 'HIGH'
                            ? 'bg-orange-600 text-white'
                            : 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {priority}
                  </button>
                ),
              )}
            </div>
          </div>
          {vendors && vendors.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Vendor</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setVendorFilter('ALL')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    vendorFilter === 'ALL'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Vendors
                </button>
                {vendors.map((vendor: any) => (
                  <button
                    key={vendor.id}
                    onClick={() => setVendorFilter(vendor.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      vendorFilter === vendor.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Briefcase className="w-3 h-3 inline mr-1" />
                    {vendor.companyName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Action Bar */}
      {hasSelection && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedIds.size} work order{selectedIds.size > 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusChange('IN_PROGRESS')}
                  disabled={bulkActionInProgress}
                  className="bg-white"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Start All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusChange('COMPLETED')}
                  disabled={bulkActionInProgress}
                  className="bg-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete All
                </Button>

                {/* Vendor Assignment Dropdown */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkVendorAssign(!showBulkVendorAssign)}
                    disabled={bulkActionInProgress}
                    className="bg-white"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Assign Vendor
                  </Button>
                  {showBulkVendorAssign && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                      <button
                        onClick={() => handleBulkVendorAssign(null)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                        Remove Vendor Assignment
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      {vendors?.map((vendor: any) => (
                        <button
                          key={vendor.id}
                          onClick={() => handleBulkVendorAssign(vendor.id)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          {vendor.companyName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Export Menu */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkActionsMenu(!showBulkActionsMenu)}
                    className="bg-white"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                    <MoreHorizontal className="w-4 h-4 ml-1" />
                  </Button>
                  {showBulkActionsMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                      <button
                        onClick={() => {
                          handleExportCSV();
                          setShowBulkActionsMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4 text-gray-400" />
                        Export as CSV
                      </button>
                      <button
                        onClick={() => {
                          handleExportJSON();
                          setShowBulkActionsMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4 text-gray-400" />
                        Export as JSON
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => {
                          handleGenerateReport();
                          setShowBulkActionsMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4 text-gray-400" />
                        Generate PDF Report
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Click outside to close dropdowns */}
      {(showBulkVendorAssign || showBulkActionsMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowBulkVendorAssign(false);
            setShowBulkActionsMenu(false);
          }}
        />
      )}

      {/* Work Orders List */}
      {workOrders && workOrders.length > 0 ? (
        filteredWorkOrders.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                    ? `Filtered Work Orders (${filteredWorkOrders.length})`
                    : 'All Work Orders'}
                </CardTitle>
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {isAllSelected ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredWorkOrders.map((order: any) => {
                  const age = getWorkOrderAge(order.createdAt);
                  const ageBadgeText = getAgeBadgeText(age);
                  const ageBadgeClass = getAgeBadgeClass(age);
                  const isSelected = selectedIds.has(order.id);

                  return (
                    <div
                      key={order.id}
                      onClick={() => handleWorkOrderClick(order)}
                      className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                        order.priority === 'EMERGENCY' ? 'border-red-300 bg-red-50/50' : ''
                      } ${isOverdue(order) ? 'border-orange-300 bg-orange-50/50' : ''} ${
                        isSelected ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => toggleSelectOne(order.id, e)}
                          className="mt-1 flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-medium">{order.title}</h4>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    order.priority === 'EMERGENCY'
                                      ? 'bg-red-100 text-red-700'
                                      : order.priority === 'HIGH'
                                        ? 'bg-orange-100 text-orange-700'
                                        : order.priority === 'MEDIUM'
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {order.priority}
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${ageBadgeClass}`}
                                >
                                  {ageBadgeText}
                                </span>
                                {isOverdue(order) && (
                                  <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                                    <Clock className="w-3 h-3" />
                                    Overdue
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {order.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="font-medium">{order.property?.name}</span>
                                {order.unit && <span>Unit {order.unit.unitNumber}</span>}
                                <span>Created {formatDate(order.createdAt)}</span>
                                {order.scheduledDate && (
                                  <span>Target {formatDate(order.scheduledDate)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-4">
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                                  order.status === 'COMPLETED'
                                    ? 'bg-green-100 text-green-700'
                                    : order.status === 'IN_PROGRESS'
                                      ? 'bg-blue-100 text-blue-700'
                                      : order.status === 'ASSIGNED'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {order.status.replace('_', ' ')}
                              </span>
                              {order.status === 'SUBMITTED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) =>
                                    handleQuickStatusChange(order.id, 'IN_PROGRESS', e)
                                  }
                                  className="text-xs h-7 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                  disabled={updateWorkOrder.isPending}
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  Start
                                </Button>
                              )}
                              {order.status === 'IN_PROGRESS' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleQuickStatusChange(order.id, 'COMPLETED', e)}
                                  className="text-xs h-7 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                  disabled={updateWorkOrder.isPending}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Complete
                                </Button>
                              )}
                            </div>
                          </div>
                          {(order.assignedTo || order.vendor) && (
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              {order.assignedTo && (
                                <span>
                                  Assigned to: {order.assignedTo.firstName}{' '}
                                  {order.assignedTo.lastName}
                                </span>
                              )}
                              {order.vendor && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" />
                                  Vendor: {order.vendor.companyName}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No work orders match these filters
                </h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your filters or create a new work order
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                  <Button onClick={() => setCreateModalOpen(true)}>
                    <Wrench className="w-4 h-4 mr-2" />
                    Create Work Order
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No work orders yet</h3>
              <p className="text-gray-500 mb-6">
                Create your first work order to track maintenance
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Wrench className="w-4 h-4 mr-2" />
                Create Your First Work Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Drawer */}
      <WorkOrderDetailDrawer
        workOrder={selectedWorkOrder}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={() => {
          setDrawerOpen(false);
          setUpdateModalOpen(true);
        }}
        onPropertyClick={handlePropertyClick}
      />

      {/* Create Modal */}
      <WorkOrderCreateModal open={createModalOpen} onOpenChange={setCreateModalOpen} />

      {/* Update Modal */}
      <WorkOrderUpdateModal
        workOrder={selectedWorkOrder}
        open={updateModalOpen}
        onOpenChange={setUpdateModalOpen}
      />

      {/* Property Edit Modal */}
      <PropertyEditModal
        property={selectedProperty}
        open={propertyEditModalOpen}
        onOpenChange={setPropertyEditModalOpen}
      />

      {/* Notification Modal */}
      {notification.show && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={closeNotification} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-[70] w-[90%] max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`p-2 rounded-lg ${
                  notification.type === 'success'
                    ? 'bg-green-100'
                    : notification.type === 'warning'
                      ? 'bg-yellow-100'
                      : 'bg-red-100'
                }`}
              >
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : notification.type === 'warning' ? (
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <h3
                  className={`text-lg font-semibold ${
                    notification.type === 'success'
                      ? 'text-green-900'
                      : notification.type === 'warning'
                        ? 'text-yellow-900'
                        : 'text-red-900'
                  }`}
                >
                  {notification.title}
                </h3>
                <p className="text-gray-600 mt-1">{notification.message}</p>
              </div>
              <button
                onClick={closeNotification}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Error Details */}
            {notification.details && notification.details.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                <p className="text-sm font-medium text-gray-700 mb-2">Error Details:</p>
                <ul className="space-y-1">
                  {notification.details.map((detail, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={closeNotification}
                className={
                  notification.type === 'success'
                    ? 'bg-green-600 hover:bg-green-700'
                    : notification.type === 'warning'
                      ? 'bg-yellow-600 hover:bg-yellow-700'
                      : 'bg-red-600 hover:bg-red-700'
                }
              >
                OK
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
