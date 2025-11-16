import { useQuery } from '@tanstack/react-query';
import { Wrench, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatDate } from '../lib/utils';

export default function WorkOrdersPage() {
  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading work orders...</div>
      </div>
    );
  }

  const openOrders = workOrders?.filter((w: any) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED') || [];
  const completedOrders = workOrders?.filter((w: any) => w.status === 'COMPLETED') || [];

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
              {openOrders.filter((w: any) => w.priority === 'EMERGENCY' || w.priority === 'HIGH').length}
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

      {/* Work Orders List */}
      {workOrders && workOrders.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workOrders.map((order: any) => (
                <div key={order.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{order.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.priority === 'EMERGENCY' ? 'bg-red-100 text-red-700' :
                          order.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                          order.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {order.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{order.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{order.property?.name}</span>
                        {order.unit && <span>Unit {order.unit.unitNumber}</span>}
                        <span>Created {formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'ASSIGNED' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
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
              <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No work orders yet</h3>
              <p className="text-gray-500 mb-6">Create your first work order to track maintenance</p>
              <Button>
                <Wrench className="w-4 h-4 mr-2" />
                Create Your First Work Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
