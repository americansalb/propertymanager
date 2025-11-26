import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Building2,
  Home,
  Wrench,
  Users,
  DollarSign,
  Filter,
  CheckSquare,
  Square,
  Calendar,
  AlertCircle,
  Eye,
  Loader2,
} from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatDate } from '../lib/utils';

type ExportType = 'properties' | 'leases' | 'work_orders' | 'vendors' | 'tenants' | 'financial';
type ExportFormat = 'csv' | 'json' | 'pdf';

interface ExportConfig {
  type: ExportType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: { key: string; label: string; selected: boolean }[];
}

const exportConfigs: ExportConfig[] = [
  {
    type: 'properties',
    label: 'Properties',
    description: 'Export property data including addresses, units, and details',
    icon: Building2,
    fields: [
      { key: 'id', label: 'ID', selected: true },
      { key: 'name', label: 'Name', selected: true },
      { key: 'address', label: 'Address', selected: true },
      { key: 'city', label: 'City', selected: true },
      { key: 'state', label: 'State', selected: true },
      { key: 'zipCode', label: 'ZIP Code', selected: true },
      { key: 'propertyType', label: 'Property Type', selected: true },
      { key: 'units', label: 'Unit Count', selected: true },
      { key: 'createdAt', label: 'Created Date', selected: false },
    ],
  },
  {
    type: 'leases',
    label: 'Leases',
    description: 'Export lease agreements with tenant and property info',
    icon: FileText,
    fields: [
      { key: 'id', label: 'ID', selected: true },
      { key: 'property', label: 'Property', selected: true },
      { key: 'unit', label: 'Unit', selected: true },
      { key: 'tenant', label: 'Tenant', selected: true },
      { key: 'status', label: 'Status', selected: true },
      { key: 'startDate', label: 'Start Date', selected: true },
      { key: 'endDate', label: 'End Date', selected: true },
      { key: 'monthlyRent', label: 'Monthly Rent', selected: true },
      { key: 'securityDeposit', label: 'Security Deposit', selected: false },
      { key: 'createdAt', label: 'Created Date', selected: false },
    ],
  },
  {
    type: 'work_orders',
    label: 'Work Orders',
    description: 'Export maintenance requests and work order history',
    icon: Wrench,
    fields: [
      { key: 'id', label: 'ID', selected: true },
      { key: 'title', label: 'Title', selected: true },
      { key: 'description', label: 'Description', selected: true },
      { key: 'status', label: 'Status', selected: true },
      { key: 'priority', label: 'Priority', selected: true },
      { key: 'property', label: 'Property', selected: true },
      { key: 'unit', label: 'Unit', selected: true },
      { key: 'vendor', label: 'Vendor', selected: true },
      { key: 'assignedTo', label: 'Assigned To', selected: false },
      { key: 'createdAt', label: 'Created Date', selected: true },
      { key: 'scheduledDate', label: 'Scheduled Date', selected: false },
      { key: 'completedAt', label: 'Completed Date', selected: false },
      { key: 'estimatedCost', label: 'Estimated Cost', selected: false },
      { key: 'actualCost', label: 'Actual Cost', selected: false },
    ],
  },
  {
    type: 'vendors',
    label: 'Vendors',
    description: 'Export vendor/contractor contact information',
    icon: Users,
    fields: [
      { key: 'id', label: 'ID', selected: true },
      { key: 'companyName', label: 'Company Name', selected: true },
      { key: 'contactName', label: 'Contact Name', selected: true },
      { key: 'email', label: 'Email', selected: true },
      { key: 'phone', label: 'Phone', selected: true },
      { key: 'type', label: 'Type', selected: true },
      { key: 'status', label: 'Status', selected: true },
      { key: 'address', label: 'Address', selected: false },
      { key: 'notes', label: 'Notes', selected: false },
      { key: 'createdAt', label: 'Created Date', selected: false },
    ],
  },
  {
    type: 'tenants',
    label: 'Tenants',
    description: 'Export tenant contact information from leases',
    icon: Home,
    fields: [
      { key: 'id', label: 'ID', selected: true },
      { key: 'firstName', label: 'First Name', selected: true },
      { key: 'lastName', label: 'Last Name', selected: true },
      { key: 'email', label: 'Email', selected: true },
      { key: 'phone', label: 'Phone', selected: true },
      { key: 'property', label: 'Property', selected: true },
      { key: 'unit', label: 'Unit', selected: true },
      { key: 'leaseStatus', label: 'Lease Status', selected: true },
      { key: 'moveInDate', label: 'Move In Date', selected: false },
    ],
  },
  {
    type: 'financial',
    label: 'Financial Summary',
    description: 'Export rent roll and financial overview',
    icon: DollarSign,
    fields: [
      { key: 'property', label: 'Property', selected: true },
      { key: 'activeLeases', label: 'Active Leases', selected: true },
      { key: 'totalUnits', label: 'Total Units', selected: true },
      { key: 'occupancyRate', label: 'Occupancy Rate', selected: true },
      { key: 'monthlyRent', label: 'Monthly Rent', selected: true },
      { key: 'expectedAnnualRent', label: 'Expected Annual Rent', selected: true },
    ],
  },
];

type DateRangePreset = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function ExportPage() {
  const [selectedType, setSelectedType] = useState<ExportType>('properties');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [fieldSelections, setFieldSelections] = useState<Record<string, boolean>>({});
  const [dateRange, setDateRange] = useState<DateRangePreset>('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Log page mount
  useEffect(() => {
    console.log('[ExportPage] Component mounted');
  }, []);

  // Log type changes
  useEffect(() => {
    console.log('[ExportPage] Selected type changed:', selectedType);
    // Initialize field selections for the selected type
    const config = exportConfigs.find((c) => c.type === selectedType);
    if (config) {
      const selections: Record<string, boolean> = {};
      config.fields.forEach((field) => {
        selections[field.key] = field.selected;
      });
      setFieldSelections(selections);
      console.log('[ExportPage] Initialized field selections:', selections);
    }
  }, [selectedType]);

  // Fetch data based on selected type
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      console.log('[ExportPage] Fetching properties');
      const response = await api.get('/properties');
      return response.data.data;
    },
    enabled: selectedType === 'properties' || selectedType === 'financial',
  });

  const { data: leases } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      console.log('[ExportPage] Fetching leases');
      const response = await api.get('/leases');
      return response.data.data;
    },
    enabled:
      selectedType === 'leases' || selectedType === 'tenants' || selectedType === 'financial',
  });

  const { data: workOrders } = useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      console.log('[ExportPage] Fetching work orders');
      const response = await api.get('/work-orders');
      return response.data.data;
    },
    enabled: selectedType === 'work_orders',
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      console.log('[ExportPage] Fetching vendors');
      const response = await api.get('/vendors');
      return response.data.data;
    },
    enabled: selectedType === 'vendors',
  });

  // Get date range
  const getDateRange = useCallback((): { from: Date | null; to: Date | null } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case 'today':
        return { from: today, to: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'week':
        return { from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
      case 'month':
        return {
          from: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()),
          to: now,
        };
      case 'quarter':
        return {
          from: new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()),
          to: now,
        };
      case 'year':
        return {
          from: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
          to: now,
        };
      case 'custom':
        return {
          from: customDateFrom ? new Date(customDateFrom) : null,
          to: customDateTo ? new Date(customDateTo + 'T23:59:59') : null,
        };
      default:
        return { from: null, to: null };
    }
  }, [dateRange, customDateFrom, customDateTo]);

  // Process data for export
  const processedData = useMemo(() => {
    console.log('[ExportPage] Processing data for type:', selectedType);

    const { from, to } = getDateRange();
    let data: any[] = [];

    switch (selectedType) {
      case 'properties':
        data = (properties || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          city: p.city,
          state: p.state,
          zipCode: p.zipCode,
          propertyType: p.propertyType,
          units: p.units?.length || 0,
          createdAt: p.createdAt,
        }));
        break;

      case 'leases':
        data = (leases || []).map((l: any) => ({
          id: l.id,
          property: l.unit?.property?.name || '',
          unit: l.unit?.unitNumber || '',
          tenant: l.tenants?.[0] ? `${l.tenants[0].firstName} ${l.tenants[0].lastName}` : '',
          status: l.status,
          startDate: l.startDate,
          endDate: l.endDate,
          monthlyRent: l.monthlyRent,
          securityDeposit: l.securityDeposit,
          createdAt: l.createdAt,
        }));
        // Filter by status
        if (statusFilter !== 'all') {
          data = data.filter((l) => l.status === statusFilter);
        }
        break;

      case 'work_orders':
        data = (workOrders || []).map((wo: any) => ({
          id: wo.id,
          title: wo.title,
          description: wo.description,
          status: wo.status,
          priority: wo.priority,
          property: wo.property?.name || '',
          unit: wo.unit?.unitNumber || '',
          vendor: wo.vendor?.companyName || 'Unassigned',
          assignedTo: wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : '',
          createdAt: wo.createdAt,
          scheduledDate: wo.scheduledDate,
          completedAt: wo.completedAt,
          estimatedCost: wo.estimatedCost,
          actualCost: wo.actualCost,
        }));
        // Filter by status
        if (statusFilter !== 'all') {
          data = data.filter((wo) => wo.status === statusFilter);
        }
        break;

      case 'vendors':
        data = (vendors || []).map((v: any) => ({
          id: v.id,
          companyName: v.companyName,
          contactName: v.contactName,
          email: v.email,
          phone: v.phone,
          type: v.type,
          status: v.status,
          address: v.address,
          notes: v.notes,
          createdAt: v.createdAt,
        }));
        // Filter by status
        if (statusFilter !== 'all') {
          data = data.filter((v) => v.status === statusFilter);
        }
        break;

      case 'tenants': {
        // Extract tenants from leases
        const tenantMap = new Map();
        (leases || []).forEach((l: any) => {
          l.tenants?.forEach((t: any) => {
            if (!tenantMap.has(t.id)) {
              tenantMap.set(t.id, {
                id: t.id,
                firstName: t.firstName,
                lastName: t.lastName,
                email: t.email,
                phone: t.phone,
                property: l.unit?.property?.name || '',
                unit: l.unit?.unitNumber || '',
                leaseStatus: l.status,
                moveInDate: l.startDate,
              });
            }
          });
        });
        data = Array.from(tenantMap.values());
        break;
      }

      case 'financial':
        // Generate financial summary per property
        data = (properties || []).map((p: any) => {
          const propertyLeases = (leases || []).filter(
            (l: any) => l.unit?.property?.id === p.id && l.status === 'ACTIVE',
          );
          const totalRent = propertyLeases.reduce(
            (sum: number, l: any) => sum + (l.monthlyRent || 0),
            0,
          );
          const totalUnits = p.units?.length || 0;
          const occupiedUnits = propertyLeases.length;
          const occupancyRate =
            totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '0';

          return {
            property: p.name,
            activeLeases: propertyLeases.length,
            totalUnits,
            occupancyRate: `${occupancyRate}%`,
            monthlyRent: totalRent,
            expectedAnnualRent: totalRent * 12,
          };
        });
        break;
    }

    // Apply date filter
    if (from || to) {
      data = data.filter((item) => {
        const itemDate = new Date(item.createdAt || item.startDate);
        if (from && itemDate < from) return false;
        if (to && itemDate > to) return false;
        return true;
      });
    }

    console.log('[ExportPage] Processed data count:', data.length);
    return data;
  }, [selectedType, properties, leases, workOrders, vendors, statusFilter, getDateRange]);

  // Get selected fields
  const selectedFields = useMemo(() => {
    const config = exportConfigs.find((c) => c.type === selectedType);
    if (!config) return [];
    return config.fields.filter((f) => fieldSelections[f.key]);
  }, [selectedType, fieldSelections]);

  // Toggle field selection
  const toggleField = useCallback((key: string) => {
    console.log('[ExportPage] Toggling field:', key);
    setFieldSelections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Select/deselect all fields
  const toggleAllFields = useCallback(
    (selected: boolean) => {
      console.log('[ExportPage] Toggle all fields:', selected);
      const config = exportConfigs.find((c) => c.type === selectedType);
      if (!config) return;

      const selections: Record<string, boolean> = {};
      config.fields.forEach((field) => {
        selections[field.key] = selected;
      });
      setFieldSelections(selections);
    },
    [selectedType],
  );

  // Export handlers
  const handleExport = useCallback(async () => {
    console.log('[ExportPage] handleExport called:', {
      type: selectedType,
      format: selectedFormat,
      recordCount: processedData.length,
      fields: selectedFields.map((f) => f.key),
    });

    if (processedData.length === 0) {
      alert('No data to export');
      return;
    }

    if (selectedFields.length === 0) {
      alert('Please select at least one field to export');
      return;
    }

    setIsExporting(true);
    const startTime = Date.now();

    try {
      const fieldKeys = selectedFields.map((f) => f.key);
      const fieldLabels = selectedFields.map((f) => f.label);

      if (selectedFormat === 'csv') {
        console.log('[ExportPage] Generating CSV');
        const rows = processedData.map((item) =>
          fieldKeys.map((key) => {
            let value = item[key];
            if (
              value instanceof Date ||
              (typeof value === 'string' && key.includes('Date')) ||
              key === 'createdAt' ||
              key === 'completedAt'
            ) {
              value = value ? formatDate(value) : '';
            }
            if (
              typeof value === 'number' &&
              (key.includes('Rent') || key.includes('Cost') || key.includes('Deposit'))
            ) {
              value = `$${value.toLocaleString()}`;
            }
            return `"${String(value || '').replace(/"/g, '""')}"`;
          }),
        );

        const csvContent = [fieldLabels.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `${selectedType}-export-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        console.log('[ExportPage] CSV export completed:', {
          duration: Date.now() - startTime,
          size: csvContent.length,
          rows: rows.length,
        });
      } else if (selectedFormat === 'json') {
        console.log('[ExportPage] Generating JSON');
        const exportData = processedData.map((item) => {
          const obj: Record<string, any> = {};
          fieldKeys.forEach((key) => {
            obj[key] = item[key];
          });
          return obj;
        });

        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `${selectedType}-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        console.log('[ExportPage] JSON export completed:', {
          duration: Date.now() - startTime,
          size: jsonContent.length,
          records: exportData.length,
        });
      } else if (selectedFormat === 'pdf') {
        console.log('[ExportPage] Generating PDF report');
        const config = exportConfigs.find((c) => c.type === selectedType);

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${config?.label || selectedType} Export - ${new Date().toLocaleDateString()}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
              h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
              .meta { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
              th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
              th { background: #f9fafb; font-weight: 600; }
              tr:nth-child(even) { background: #f9fafb; }
              .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
              .summary { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <h1>${config?.label || selectedType} Export</h1>
            <div class="meta">
              <p>Generated on ${new Date().toLocaleString()}</p>
              <p>Total records: ${processedData.length}</p>
            </div>

            <div class="summary">
              <strong>Export Summary</strong>
              <p>Data Type: ${config?.label || selectedType}</p>
              <p>Fields: ${selectedFields.map((f) => f.label).join(', ')}</p>
              <p>Date Range: ${dateRange === 'all' ? 'All Time' : dateRange}</p>
            </div>

            <table>
              <thead>
                <tr>
                  ${fieldLabels.map((label) => `<th>${label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${processedData
                  .map(
                    (item) => `
                  <tr>
                    ${fieldKeys
                      .map((key) => {
                        let value = item[key];
                        if (key.includes('Date') || key === 'createdAt' || key === 'completedAt') {
                          value = value ? formatDate(value) : '-';
                        }
                        if (
                          typeof value === 'number' &&
                          (key.includes('Rent') || key.includes('Cost') || key.includes('Deposit'))
                        ) {
                          value = `$${value.toLocaleString()}`;
                        }
                        return `<td>${value || '-'}</td>`;
                      })
                      .join('')}
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>

            <div class="footer">
              <p>PropertyMaster - Data Export</p>
            </div>
          </body>
          </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.print();
          console.log('[ExportPage] PDF report generated:', {
            duration: Date.now() - startTime,
          });
        }
      }
    } catch (error) {
      console.error('[ExportPage] Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedType, selectedFormat, processedData, selectedFields, dateRange]);

  const currentConfig = exportConfigs.find((c) => c.type === selectedType);

  // Get status options based on type
  const statusOptions = useMemo(() => {
    switch (selectedType) {
      case 'leases':
        return ['all', 'DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED'];
      case 'work_orders':
        return ['all', 'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      case 'vendors':
        return ['all', 'ACTIVE', 'INACTIVE'];
      default:
        return [];
    }
  }, [selectedType]);

  console.log('[ExportPage] Rendering with:', {
    selectedType,
    selectedFormat,
    dataCount: processedData.length,
    selectedFieldCount: selectedFields.length,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Data Export</h1>
        <p className="text-gray-500 mt-1">
          Export your property management data in various formats
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Data Type Selection */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Data Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {exportConfigs.map((config) => {
                const Icon = config.icon;
                return (
                  <button
                    key={config.type}
                    onClick={() => {
                      console.log('[ExportPage] Data type selected:', config.type);
                      setSelectedType(config.type);
                      setStatusFilter('all');
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedType === config.type
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        selectedType === config.type ? 'bg-blue-100' : 'bg-gray-200'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          selectedType === config.type ? 'text-blue-600' : 'text-gray-600'
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`font-medium ${
                          selectedType === config.type ? 'text-blue-900' : 'text-gray-900'
                        }`}
                      >
                        {config.label}
                      </p>
                      <p className="text-xs text-gray-500">{config.description}</p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Export Format */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  format: 'csv' as ExportFormat,
                  label: 'CSV',
                  icon: FileSpreadsheet,
                  desc: 'Spreadsheet format',
                },
                {
                  format: 'json' as ExportFormat,
                  label: 'JSON',
                  icon: FileJson,
                  desc: 'Structured data format',
                },
                {
                  format: 'pdf' as ExportFormat,
                  label: 'PDF Report',
                  icon: FileText,
                  desc: 'Printable report',
                },
              ].map(({ format, label, icon: Icon, desc }) => (
                <button
                  key={format}
                  onClick={() => {
                    console.log('[ExportPage] Format selected:', format);
                    setSelectedFormat(format);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedFormat === format
                      ? 'bg-green-50 border-2 border-green-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      selectedFormat === format ? 'text-green-600' : 'text-gray-500'
                    }`}
                  />
                  <div>
                    <p
                      className={`font-medium ${
                        selectedFormat === format ? 'text-green-900' : 'text-gray-900'
                      }`}
                    >
                      {label}
                    </p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Field Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Select Fields</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAllFields(true)}
                    className="text-blue-600"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAllFields(false)}
                    className="text-gray-600"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {currentConfig?.fields.map((field) => (
                  <button
                    key={field.key}
                    onClick={() => toggleField(field.key)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                      fieldSelections[field.key]
                        ? 'bg-blue-50 text-blue-900'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {fieldSelections[field.key] ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm">{field.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Range */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date Range
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'Last 7 Days' },
                    { value: 'month', label: 'Last 30 Days' },
                    { value: 'quarter', label: 'Last 90 Days' },
                    { value: 'year', label: 'Last Year' },
                    { value: 'custom', label: 'Custom' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => {
                        console.log('[ExportPage] Date range selected:', value);
                        setDateRange(value as DateRangePreset);
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        dateRange === value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {dateRange === 'custom' && (
                  <div className="flex gap-4 mt-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">From</label>
                      <input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">To</label>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Filter (for applicable types) */}
              {statusOptions.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Status Filter
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          console.log('[ExportPage] Status filter selected:', status);
                          setStatusFilter(status);
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          statusFilter === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status === 'all' ? 'All Status' : status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview & Export */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Export Preview</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('[ExportPage] Toggle preview');
                    setShowPreview(!showPreview);
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              <div className="flex items-center gap-6 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Records to Export</p>
                  <p className="text-2xl font-bold text-gray-900">{processedData.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fields Selected</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedFields.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Format</p>
                  <p className="text-2xl font-bold text-gray-900 uppercase">{selectedFormat}</p>
                </div>
              </div>

              {/* Preview Table */}
              {showPreview && processedData.length > 0 && (
                <div className="border rounded-lg overflow-hidden mb-4">
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {selectedFields.map((field) => (
                            <th
                              key={field.key}
                              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {field.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {processedData.slice(0, 5).map((item, index) => (
                          <tr key={index}>
                            {selectedFields.map((field) => (
                              <td
                                key={field.key}
                                className="px-3 py-2 whitespace-nowrap text-gray-700"
                              >
                                {field.key.includes('Date') ||
                                field.key === 'createdAt' ||
                                field.key === 'completedAt'
                                  ? item[field.key]
                                    ? formatDate(item[field.key])
                                    : '-'
                                  : typeof item[field.key] === 'number' &&
                                      (field.key.includes('Rent') ||
                                        field.key.includes('Cost') ||
                                        field.key.includes('Deposit'))
                                    ? `$${item[field.key].toLocaleString()}`
                                    : item[field.key] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {processedData.length > 5 && (
                    <div className="px-4 py-2 bg-gray-50 text-center text-sm text-gray-500">
                      Showing 5 of {processedData.length} records
                    </div>
                  )}
                </div>
              )}

              {processedData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No data available for export with current filters</p>
                </div>
              )}

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={isExporting || processedData.length === 0 || selectedFields.length === 0}
                className="w-full"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Export {processedData.length} {currentConfig?.label || 'Records'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
