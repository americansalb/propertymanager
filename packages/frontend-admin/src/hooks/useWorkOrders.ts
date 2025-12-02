import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  propertyId: string;
  property?: {
    id: string;
    name: string;
    address1: string;
    city: string;
    state: string;
  };
  unitId?: string;
  unit?: {
    id: string;
    unitNumber: string;
  };
  location?: string;
  assignedToId?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  vendorId?: string;
  vendor?: {
    id: string;
    companyName: string;
  };
  requestedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  tenantReportedBy?: string;
  tenantPhone?: string;
  permissionToEnter: boolean;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkOrderDto {
  title: string;
  description: string;
  type: string;
  priority?: string;
  propertyId: string;
  unitId?: string;
  location?: string;
  assignedToId?: string;
  vendorId?: string;
  estimatedCost?: number;
  tenantReportedBy?: string;
  tenantPhone?: string;
  permissionToEnter?: boolean;
}

export interface UpdateWorkOrderDto {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  status?: string;
  unitId?: string;
  location?: string;
  assignedToId?: string;
  vendorId?: string;
  scheduledDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  tenantReportedBy?: string;
  tenantPhone?: string;
  permissionToEnter?: boolean;
  completionNotes?: string;
}

export function useWorkOrders() {
  return useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
      return response.data.data as WorkOrder[];
    },
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: ['work-orders', id],
    queryFn: async () => {
      const response = await api.get(`/work-orders/${id}`);
      return response.data.data as WorkOrder;
    },
    enabled: !!id,
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWorkOrderDto) => {
      const response = await api.post('/work-orders', data);
      return response.data.data as WorkOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWorkOrderDto }) => {
      const response = await api.put(`/work-orders/${id}`, data);
      return response.data.data as WorkOrder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders', variables.id] });
    },
  });
}

export function useCancelWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.post(`/work-orders/${id}/cancel`, { reason });
      return response.data.data as WorkOrder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders', variables.id] });
    },
  });
}

export function useDeleteWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/work-orders/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}
