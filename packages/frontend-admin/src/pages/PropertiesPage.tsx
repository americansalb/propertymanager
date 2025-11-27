import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Users, Edit, Wrench, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import PropertyEditModal from '../components/properties/PropertyEditModal';
import { WorkOrderCreateModal } from '../components/work-orders/WorkOrderCreateModal';
import { useWorkOrders } from '../hooks/useWorkOrders';

export default function PropertiesPage() {
  const navigate = useNavigate();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createWorkOrderOpen, setCreateWorkOrderOpen] = useState(false);
  const [selectedPropertyForWorkOrder, setSelectedPropertyForWorkOrder] = useState<any>(null);

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
  });

  // Fetch all work orders for ops snapshot
  const { data: workOrders } = useWorkOrders();

  // Fetch all leases for lease snapshot
  const { data: leases } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      const response = await api.get('/leases');
      return response.data.data;
    },
  });

  // Calculate ops stats per property
  const propertyOpsStats = useMemo(() => {
    if (!workOrders) {
      return {};
    }

    const stats: Record<
      string,
      { openCount: number; emergencyCount: number; mostRecentDate: string | null }
    > = {};

    properties?.forEach((property: any) => {
      const propertyWorkOrders = workOrders.filter((wo) => wo.propertyId === property.id);

      const openWorkOrders = propertyWorkOrders.filter(
        (wo) =>
          wo.status === 'SUBMITTED' || wo.status === 'ASSIGNED' || wo.status === 'IN_PROGRESS',
      );

      const emergencyOrHighWorkOrders = openWorkOrders.filter(
        (wo) => wo.priority === 'EMERGENCY' || wo.priority === 'HIGH',
      );

      // Find most recent work order
      const sortedByDate = [...propertyWorkOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const mostRecent = sortedByDate[0];

      stats[property.id] = {
        openCount: openWorkOrders.length,
        emergencyCount: emergencyOrHighWorkOrders.length,
        mostRecentDate: mostRecent?.createdAt || null,
      };
    });

    return stats;
  }, [workOrders, properties]);

  // Calculate lease stats per property
  const propertyLeaseStats = useMemo(() => {
    if (!leases) {
      return {};
    }

    const stats: Record<string, { activeCount: number; totalRent: number }> = {};

    properties?.forEach((property: any) => {
      const propertyLeases = leases.filter(
        (lease: any) => lease.unit?.property?.id === property.id,
      );

      const activeLeases = propertyLeases.filter((lease: any) => lease.status === 'ACTIVE');

      const totalRent = activeLeases.reduce(
        (sum: number, lease: any) => sum + Number(lease.monthlyRent),
        0,
      );

      stats[property.id] = {
        activeCount: activeLeases.length,
        totalRent,
      };
    });

    return stats;
  }, [leases, properties]);

  // Format age text for most recent work order
  const formatAge = (dateString: string | null): string => {
    if (!dateString) {
      return 'No work orders yet';
    }

    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Last: today';
    }
    if (diffDays === 1) {
      return 'Last: yesterday';
    }
    return `Last: ${diffDays}d ago`;
  };

  const handlePropertyClick = (property: any) => {
    navigate(`/properties/${property.id}`);
  };

  const handleEditProperty = (property: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProperty(property);
    setEditModalOpen(true);
  };

  const handleAddProperty = () => {
    setSelectedProperty(null);
    setEditModalOpen(true);
  };

  const handleCreateWorkOrder = (property: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPropertyForWorkOrder(property);
    setCreateWorkOrderOpen(true);
  };

  const handleViewWorkOrders = (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/work-orders?propertyId=${propertyId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500 mt-1">Manage your property portfolio</p>
        </div>
        <Button onClick={handleAddProperty}>
          <Building2 className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {properties && properties.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property: any) => (
            <Card
              key={property.id}
              className="hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => handlePropertyClick(property)}
            >
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="text-lg group-hover:text-primary transition-colors">
                    {property.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        property.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {property.status}
                    </span>
                    <button
                      onClick={(e) => handleEditProperty(property, e)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit className="w-4 h-4 text-gray-400 hover:text-primary transition-colors" />
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {property.address1}, {property.city}, {property.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{property.totalUnits} units</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span>{property.type?.replace('_', ' ')}</span>
                  </div>
                  {property.yearBuilt && (
                    <div className="text-sm text-gray-500">Built in {property.yearBuilt}</div>
                  )}

                  {/* Ops Snapshot */}
                  {propertyOpsStats[property.id] && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>
                            {propertyOpsStats[property.id].openCount > 0 ? (
                              <>
                                <span className="font-semibold text-gray-900">
                                  {propertyOpsStats[property.id].openCount}
                                </span>{' '}
                                open
                                {propertyOpsStats[property.id].emergencyCount > 0 && (
                                  <span className="text-red-600 font-semibold">
                                    {' '}
                                    • {propertyOpsStats[property.id].emergencyCount} urgent
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-500">No open work orders</span>
                            )}
                          </span>
                        </div>
                        <div className="text-gray-500">
                          {formatAge(propertyOpsStats[property.id].mostRecentDate)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lease Snapshot */}
                  {propertyLeaseStats[property.id] && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>
                            {propertyLeaseStats[property.id].activeCount > 0 ? (
                              <>
                                <span className="font-semibold text-gray-900">
                                  {propertyLeaseStats[property.id].activeCount}
                                </span>{' '}
                                active lease
                                {propertyLeaseStats[property.id].activeCount !== 1 ? 's' : ''}
                              </>
                            ) : (
                              <span className="text-gray-500">No active leases</span>
                            )}
                          </span>
                        </div>
                        {propertyLeaseStats[property.id].totalRent > 0 && (
                          <div className="text-gray-500">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(propertyLeaseStats[property.id].totalRent)}{' '}
                            / mo
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100 flex gap-2">
                    <Button
                      onClick={(e) => handleViewWorkOrders(property.id, e)}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      <FileText className="w-3 h-3 mr-1.5" />
                      View Work Orders
                    </Button>
                    <Button
                      onClick={(e) => handleCreateWorkOrder(property, e)}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      <Wrench className="w-3 h-3 mr-1.5" />
                      Create Work Order
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
              <p className="text-gray-500 mb-6">Get started by adding your first property</p>
              <Button onClick={handleAddProperty}>
                <Building2 className="w-4 h-4 mr-2" />
                Add Your First Property
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <PropertyEditModal
        property={selectedProperty}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />

      <WorkOrderCreateModal
        open={createWorkOrderOpen}
        onOpenChange={setCreateWorkOrderOpen}
        defaultPropertyId={selectedPropertyForWorkOrder?.id}
        defaultPropertyName={selectedPropertyForWorkOrder?.name}
      />
    </div>
  );
}
