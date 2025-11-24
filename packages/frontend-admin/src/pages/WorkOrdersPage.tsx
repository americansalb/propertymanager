import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wrench, AlertCircle, Clock } from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatDate } from '../lib/utils';
import { WorkOrderDetailDrawer } from '../components/work-orders/WorkOrderDetailDrawer';

type StatusFilter = 'ALL' | 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
type PriorityFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export default function WorkOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
      return response.data.data;
    },
  });

  // Filter work orders in memory
  const filteredWorkOrders =
    workOrders?.filter((order: any) => {
      const statusMatch = statusFilter === 'ALL' || order.status === statusFilter;
      const priorityMatch = priorityFilter === 'ALL' || order.priority === priorityFilter;
      return statusMatch && priorityMatch;
    }) || [];

  const openOrders =
    workOrders?.filter((w: any) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED') || [];
  const completedOrders = workOrders?.filter((w: any) => w.status === 'COMPLETED') || [];

  // Check if work order is overdue
  const isOverdue = (order: any) => {
    if (!order.scheduledDate || order.status === 'COMPLETED') return false;
    return new Date(order.scheduledDate) < new Date();
  };

  const handleWorkOrderClick = (order: any) => {
    setSelectedWorkOrder(order);
    setDrawerOpen(true);
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
  };

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
        <Button>
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
            <p className="text-sm text-gray-600 mt-1">High Priority</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{completedOrders.length}</div>
            <p className="text-sm text-gray-600 mt-1">Completed This Month</p>
          </CardContent>
        </Card>
      </div>

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
                    onClick={() => setStatusFilter(status)}
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
                    onClick={() => setPriorityFilter(priority)}
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
        </div>
      )}

      {/* Work Orders List */}
      {workOrders && workOrders.length > 0 ? (
        filteredWorkOrders.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                  ? `Filtered Work Orders (${filteredWorkOrders.length})`
                  : 'All Work Orders'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredWorkOrders.map((order: any) => (
                  <div
                    key={order.id}
                    onClick={() => handleWorkOrderClick(order)}
                    className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                      order.priority === 'EMERGENCY' ? 'border-red-300 bg-red-50/50' : ''
                    } ${isOverdue(order) ? 'border-orange-300 bg-orange-50/50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
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
                    </div>
                    {order.assignedTo && (
                      <div className="text-xs text-gray-600">
                        Assigned to: {order.assignedTo.firstName} {order.assignedTo.lastName}
                      </div>
                    )}
                  </div>
                ))}
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
                  <Button>
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
              <Button>
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
      />
    </div>
  );
}
