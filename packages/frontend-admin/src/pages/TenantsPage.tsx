import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Mail,
  Phone,
  Home,
  Shield,
  ShieldOff,
  Edit,
  History,
  ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  portalEnabled: boolean;
  isPrimary: boolean;
  lease?: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    unit?: {
      id: string;
      unitNumber: string;
      property: {
        id: string;
        name: string;
      };
    };
  };
}

interface TenantStats {
  totalTenants: number;
  activeLeases: number;
  portalEnabled: number;
  portalAdoptionRate: number;
}

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tenants
  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['tenants', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const response = await api.get(`/tenants?${params}`);
      return response.data.data as Tenant[];
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['tenant-stats'],
    queryFn: async () => {
      const response = await api.get('/tenants/stats');
      return response.data.data as TenantStats;
    },
  });

  // Enable portal mutation
  const enablePortal = useMutation({
    mutationFn: (id: string) => api.post(`/tenants/${id}/enable-portal`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-stats'] });
      toast({ title: 'Portal access enabled' });
    },
  });

  // Disable portal mutation
  const disablePortal = useMutation({
    mutationFn: (id: string) => api.post(`/tenants/${id}/disable-portal`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-stats'] });
      toast({ title: 'Portal access disabled' });
    },
  });

  const tenants = tenantsData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-600">Manage all tenants across your properties</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tenants</p>
                <p className="text-2xl font-bold">{stats?.totalTenants || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Home className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Leases</p>
                <p className="text-2xl font-bold">{stats?.activeLeases || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Portal Enabled</p>
                <p className="text-2xl font-bold">{stats?.portalEnabled || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Portal Adoption</p>
                <p className="text-2xl font-bold">{stats?.portalAdoptionRate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, email, or phone..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Lease Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenants List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants ({tenants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No tenants found</div>
          ) : (
            <div className="divide-y">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="py-4 flex items-center justify-between hover:bg-gray-50 px-2 rounded"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {tenant.firstName[0]}
                        {tenant.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {tenant.firstName} {tenant.lastName}
                        </p>
                        {tenant.isPrimary && (
                          <Badge variant="secondary" className="text-xs">
                            Primary
                          </Badge>
                        )}
                        {tenant.portalEnabled && (
                          <Badge
                            variant="outline"
                            className="text-xs text-green-600 border-green-600"
                          >
                            Portal
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {tenant.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {tenant.phone}
                        </span>
                      </div>
                      {tenant.lease?.unit && (
                        <p className="text-sm text-gray-500 mt-1">
                          <Home className="w-3 h-3 inline mr-1" />
                          {tenant.lease.unit.property.name} - Unit {tenant.lease.unit.unitNumber}
                          <Badge
                            variant={tenant.lease.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className="ml-2 text-xs"
                          >
                            {tenant.lease.status}
                          </Badge>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setHistoryModalOpen(true);
                      }}
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setEditModalOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {tenant.portalEnabled ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disablePortal.mutate(tenant.id)}
                        title="Disable portal access"
                      >
                        <ShieldOff className="w-4 h-4 text-red-500" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => enablePortal.mutate(tenant.id)}
                        title="Enable portal access"
                      >
                        <Shield className="w-4 h-4 text-green-500" />
                      </Button>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <TenantEditModal
        tenant={selectedTenant}
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTenant(null);
        }}
      />

      {/* History Modal */}
      <TenantHistoryModal
        tenant={selectedTenant}
        open={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setSelectedTenant(null);
        }}
      />
    </div>
  );
}

function TenantEditModal({
  tenant,
  open,
  onClose,
}: {
  tenant: Tenant | null;
  open: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    emergencyContact: '',
    emergencyPhone: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when tenant changes
  useState(() => {
    if (tenant) {
      setFormData({
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
        phone: tenant.phone,
        emergencyContact: tenant.emergencyContact || '',
        emergencyPhone: tenant.emergencyPhone || '',
      });
    }
  });

  const updateTenant = useMutation({
    mutationFn: () => api.put(`/tenants/${tenant?.id}`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Tenant updated successfully' });
      onClose();
    },
    onError: () => {
      toast({ title: 'Failed to update tenant', variant: 'destructive' });
    },
  });

  if (!tenant) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Tenant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Emergency Contact</label>
            <Input
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Emergency Phone</label>
            <Input
              value={formData.emergencyPhone}
              onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => updateTenant.mutate()}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TenantHistoryModal({
  tenant,
  open,
  onClose,
}: {
  tenant: Tenant | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['tenant-history', tenant?.id],
    queryFn: async () => {
      if (!tenant) {
        return [];
      }
      const response = await api.get(`/tenants/${tenant.id}/history`);
      return response.data.data;
    },
    enabled: !!tenant && open,
  });

  if (!tenant) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Lease History - {tenant.firstName} {tenant.lastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : !history || history.length === 0 ? (
            <p className="text-center text-gray-500">No lease history found</p>
          ) : (
            <div className="space-y-3">
              {history.map(
                (lease: {
                  leaseId: string;
                  property: string;
                  unit: string;
                  status: string;
                  startDate: string;
                  endDate: string;
                  monthlyRent: number;
                  isPrimary: boolean;
                }) => (
                  <div key={lease.leaseId} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {lease.property} - Unit {lease.unit}
                      </p>
                      <Badge variant={lease.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {lease.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(lease.startDate).toLocaleDateString()} -{' '}
                      {lease.endDate ? new Date(lease.endDate).toLocaleDateString() : 'Present'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Rent: ${lease.monthlyRent?.toLocaleString()}/mo
                      {lease.isPrimary && ' (Primary Tenant)'}
                    </p>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
