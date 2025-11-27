/**
 * React Query hooks for properties
 * Provides data fetching, caching, and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  fetchProperties,
  fetchProperty,
  updateProperty,
  deleteProperty,
  type Property,
  type UpdatePropertyDto,
  type ApiError,
} from './api';

/**
 * Query key factory for properties
 * Centralizes cache key management
 */
export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...propertyKeys.lists(), filters] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
};

/**
 * Fetch all properties for current organization
 */
export function useProperties() {
  return useQuery({
    queryKey: propertyKeys.lists(),
    queryFn: fetchProperties,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single property by ID
 */
export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: propertyKeys.detail(id!),
    queryFn: () => fetchProperty(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Update property mutation
 * Automatically invalidates cache and shows toast notifications
 */
export function useUpdateProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePropertyDto }) => updateProperty(id, data),
    onSuccess: (updatedProperty) => {
      // Invalidate and refetch properties list
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Update the cached property detail
      queryClient.setQueryData(propertyKeys.detail(updatedProperty.id), updatedProperty);

      toast({
        title: 'Property updated',
        description: `${updatedProperty.name} has been updated successfully.`,
      });
    },
    onError: (error: unknown) => {
      const apiError = error as ApiError;

      toast({
        title: 'Failed to update property',
        description: apiError.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });

      // Log correlation ID for debugging
      if (apiError.correlationId) {
        console.error('[Property Update Failed]', {
          correlationId: apiError.correlationId,
          statusCode: apiError.statusCode,
          code: apiError.code,
          errors: apiError.errors,
        });
      }
    },
  });
}

/**
 * Delete property mutation
 */
export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      toast({
        title: 'Property deleted',
        description: 'The property has been deleted successfully.',
      });
    },
    onError: (error: unknown) => {
      const apiError = error as ApiError;

      toast({
        title: 'Failed to delete property',
        description: apiError.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Optimistic update helper
 * Use this for instant UI feedback before server confirms
 */
export function useOptimisticPropertyUpdate() {
  const queryClient = useQueryClient();

  return {
    onMutate: async ({ id, data }: { id: string; data: Partial<Property> }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyKeys.detail(id) });

      // Snapshot previous value
      const previousProperty = queryClient.getQueryData<Property>(propertyKeys.detail(id));

      // Optimistically update
      if (previousProperty) {
        queryClient.setQueryData(propertyKeys.detail(id), {
          ...previousProperty,
          ...data,
        });
      }

      return { previousProperty };
    },
    onError: (_error: unknown, _variables: unknown, context?: { previousProperty?: Property }) => {
      // Rollback on error
      if (context?.previousProperty) {
        queryClient.setQueryData(
          propertyKeys.detail(context.previousProperty.id),
          context.previousProperty,
        );
      }
    },
  };
}
