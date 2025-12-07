import { useState, useEffect } from 'react';
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
  UserPlus,
  Send,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Building,
  DoorOpen,
} from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { Checkbox } from '../components/ui/checkbox';

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
  status: 'ACTIVE' | 'INACTIVE' | 'MOVED_OUT';
  invitationStatus: 'NOT_INVITED' | 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  invitationSentAt?: string;
  moveInDate?: string;
  moveOutDate?: string;
  unit?: {
    id: string;
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
  };
  lease?: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
  };
}

interface Property {
  id: string;
  name: string;
  units: {
    id: string;
    unitNumber: string;
  }[];
}

interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  portalEnabled: number;
  pendingInvites: number;
  portalAdoptionRate: number;
}

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [assignUnitModalOpen, setAssignUnitModalOpen] = useState(false);
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

  // Send invitation mutation
  const sendInvite = useMutation({
    mutationFn: (id: string) => api.post(`/tenants/${id}/invite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-stats'] });
      toast({ title: 'Invitation sent successfully' });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: 'Failed to send invitation',
        description: error.response?.data?.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  // Resend invitation mutation
  const resendInvite = useMutation({
    mutationFn: (id: string) => api.post(`/tenants/${id}/resend-invite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Invitation resent successfully' });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: 'Failed to resend invitation',
        description: error.response?.data?.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const tenants = tenantsData || [];

  const getInvitationBadge = (tenant: Tenant) => {
    if (tenant.portalEnabled) {
      return (
        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    }
    switch (tenant.invitationStatus) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'EXPIRED':
        return (
          <Badge variant="outline" className="text-xs text-red-600 border-red-600">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      case 'ACCEPTED':
        return (
          <Badge variant="outline" className="text-xs text-green-600 border-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs text-gray-500 border-gray-400">
            Not Invited
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'INACTIVE':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>;
      case 'MOVED_OUT':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Moved Out</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-600">Manage all tenants across your properties</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Tenant
        </Button>
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
                <p className="text-sm text-gray-600">Active Tenants</p>
                <p className="text-2xl font-bold">{stats?.activeTenants || 0}</p>
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
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Invites</p>
                <p className="text-2xl font-bold">{stats?.pendingInvites || 0}</p>
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
                <SelectValue placeholder="Tenant Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="MOVED_OUT">Moved Out</SelectItem>
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
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No tenants found</p>
              <p className="text-sm text-gray-400 mt-1">Add a tenant to get started</p>
              <Button className="mt-4" onClick={() => setAddModalOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Tenant
              </Button>
            </div>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {tenant.firstName} {tenant.lastName}
                        </p>
                        {getStatusBadge(tenant.status)}
                        {getInvitationBadge(tenant)}
                        {tenant.isPrimary && (
                          <Badge variant="secondary" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {tenant.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {tenant.phone}
                        </span>
                      </div>
                      {tenant.unit ? (
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {tenant.unit.property.name}
                          <DoorOpen className="w-3 h-3 ml-2" />
                          Unit {tenant.unit.unitNumber}
                          {tenant.lease && (
                            <Badge
                              variant={tenant.lease.status === 'ACTIVE' ? 'default' : 'secondary'}
                              className="ml-2 text-xs"
                            >
                              Lease: {tenant.lease.status}
                            </Badge>
                          )}
                        </p>
                      ) : (
                        <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          No unit assigned
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Assign unit button for tenants without a unit */}
                    {!tenant.unit && (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600"
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setAssignUnitModalOpen(true);
                        }}
                      >
                        <Home className="w-4 h-4 mr-1" />
                        Assign Unit
                      </Button>
                    )}
                    {/* Invite actions */}
                    {!tenant.portalEnabled && (
                      <>
                        {tenant.invitationStatus === 'NOT_INVITED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendInvite.mutate(tenant.id)}
                            disabled={sendInvite.isPending}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Invite
                          </Button>
                        )}
                        {(tenant.invitationStatus === 'PENDING' ||
                          tenant.invitationStatus === 'EXPIRED') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendInvite.mutate(tenant.id)}
                            disabled={resendInvite.isPending}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Resend
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setHistoryModalOpen(true);
                      }}
                      title="View history"
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
                      title="Edit tenant"
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

      {/* Add Tenant Modal */}
      <AddTenantModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />

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

      {/* Assign Unit Modal */}
      <AssignUnitModal
        tenant={selectedTenant}
        open={assignUnitModalOpen}
        onClose={() => {
          setAssignUnitModalOpen(false);
          setSelectedTenant(null);
        }}
      />
    </div>
  );
}

function AddTenantModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    unitId: '',
    propertyId: '',
    sendInvite: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch properties with units - always refetch when modal opens
  const { data: properties } = useQuery({
    queryKey: ['properties-for-tenant', open],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data as Property[];
    },
    enabled: open,
    staleTime: 0,
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        unitId: '',
        propertyId: '',
        sendInvite: true,
      });
    }
  }, [open]);

  const selectedProperty = properties?.find((p) => p.id === formData.propertyId);

  const createTenant = useMutation({
    mutationFn: () =>
      api.post('/tenants', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        unitId: formData.unitId,
        sendInvite: formData.sendInvite,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-stats'] });
      toast({
        title: 'Tenant added successfully',
        description: formData.sendInvite ? 'An invitation email has been sent.' : undefined,
      });
      onClose();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: 'Failed to add tenant',
        description: error.response?.data?.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const isValid =
    formData.firstName && formData.lastName && formData.email && formData.phone && formData.unitId;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Tenant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Doe"
              />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <Label>Property</Label>
            <Select
              value={formData.propertyId}
              onValueChange={(value) => setFormData({ ...formData, propertyId: value, unitId: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties?.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unit</Label>
            <Select
              value={formData.unitId}
              onValueChange={(value) => setFormData({ ...formData, unitId: value })}
              disabled={!formData.propertyId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={formData.propertyId ? 'Select a unit' : 'Select a property first'}
                />
              </SelectTrigger>
              <SelectContent>
                {selectedProperty?.units?.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    Unit {unit.unitNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendInvite"
              checked={formData.sendInvite}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, sendInvite: checked as boolean })
              }
            />
            <label
              htmlFor="sendInvite"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Send portal invitation email
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => createTenant.mutate()}
              disabled={!isValid || createTenant.isPending}
            >
              {createTenant.isPending ? 'Adding...' : 'Add Tenant'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  useEffect(() => {
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
  }, [tenant]);

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
              <Label>First Name</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Emergency Contact</Label>
            <Input
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
            />
          </div>
          <div>
            <Label>Emergency Phone</Label>
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
            Tenant History - {tenant.firstName} {tenant.lastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Current Assignment */}
          {tenant.unit && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-800 mb-1">Current Assignment</p>
              <p className="text-sm text-blue-700">
                {tenant.unit.property.name} - Unit {tenant.unit.unitNumber}
              </p>
              {tenant.moveInDate && (
                <p className="text-xs text-blue-600 mt-1">
                  Moved in: {new Date(tenant.moveInDate).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Lease History */}
          <div>
            <p className="font-medium text-gray-700 mb-2">Lease History</p>
            {isLoading ? (
              <p className="text-center text-gray-500">Loading...</p>
            ) : !history || history.length === 0 ? (
              <p className="text-center text-gray-500 text-sm">No lease history found</p>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignUnitModal({
  tenant,
  open,
  onClose,
}: {
  tenant: Tenant | null;
  open: boolean;
  onClose: () => void;
}) {
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setPropertyId('');
      setUnitId('');
    }
  }, [open]);

  // Fetch properties with units - always refetch when modal opens
  const { data: properties } = useQuery({
    queryKey: ['properties-with-units', open],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data as Property[];
    },
    enabled: open,
    staleTime: 0,
  });

  const selectedProperty = properties?.find((p) => p.id === propertyId);

  const assignUnit = useMutation({
    mutationFn: () =>
      api.post(`/tenants/${tenant?.id}/assign-unit`, {
        unitId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-stats'] });
      toast({
        title: 'Unit assigned successfully',
        description: `${tenant?.firstName} ${tenant?.lastName} has been assigned to the unit.`,
      });
      onClose();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: 'Failed to assign unit',
        description: error.response?.data?.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  if (!tenant) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Unit to Tenant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium">
              {tenant.firstName} {tenant.lastName}
            </p>
            <p className="text-sm text-gray-500">{tenant.email}</p>
          </div>
          <div>
            <Label>Property</Label>
            <Select
              value={propertyId}
              onValueChange={(value) => {
                setPropertyId(value);
                setUnitId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties?.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unit</Label>
            <Select value={unitId} onValueChange={setUnitId} disabled={!propertyId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={propertyId ? 'Select a unit' : 'Select a property first'}
                />
              </SelectTrigger>
              <SelectContent>
                {selectedProperty?.units?.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    Unit {unit.unitNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => assignUnit.mutate()} disabled={!unitId || assignUnit.isPending}>
              {assignUnit.isPending ? 'Assigning...' : 'Assign Unit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
