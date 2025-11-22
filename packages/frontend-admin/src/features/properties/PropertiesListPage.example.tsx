/**
 * Example: Properties List Page with Edit Modal
 * Shows complete integration of PropertyEditModal + React Query hooks
 */

import { useState } from 'react';
import { PropertyEditModal } from './PropertyEditModal';
import { useProperties, useUpdateProperty } from './hooks';
import { propertyEvents } from '@/lib/analytics';
import type { Property } from './api';

export function PropertiesListPage() {
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Fetch properties list
  const { data: properties, isLoading, error } = useProperties();

  // Update mutation (used by modal)
  const updateMutation = useUpdateProperty();

  if (isLoading) {
    return <div>Loading properties...</div>;
  }

  if (error) {
    return <div>Error loading properties: {error.message}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Properties</h1>

      {/* Properties table/list */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left font-medium">Name</th>
              <th className="p-4 text-left font-medium">Address</th>
              <th className="p-4 text-left font-medium">Type</th>
              <th className="p-4 text-left font-medium">Status</th>
              <th className="p-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties?.map((property) => (
              <tr key={property.id} className="border-b last:border-0">
                <td className="p-4">{property.name}</td>
                <td className="p-4">
                  {property.address1}
                  {property.address2 && `, ${property.address2}`}
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {property.city}, {property.state} {property.zipCode}
                  </span>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    {property.type.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      property.status === 'ACTIVE'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {property.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setEditingProperty(property)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingProperty && (
        <PropertyEditModal
          open={!!editingProperty}
          onOpenChange={(open) => {
            if (!open) setEditingProperty(null);
          }}
          property={editingProperty}
          source="list"
          onUpdated={(updated) => {
            // Optional: track additional metrics
            propertyEvents.editSaved(
              updated.id,
              1, // fieldsChangedCount computed in modal
              'list',
            );
          }}
        />
      )}
    </div>
  );
}

/**
 * Alternative: Using the mutation directly in the modal
 * (if you want more control over the mutation)
 */
export function PropertiesListPageWithDirectMutation() {
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const { data: properties } = useProperties();
  const updateMutation = useUpdateProperty();

  return (
    <>
      {/* ... table/list ... */}

      {editingProperty && (
        <PropertyEditModal
          open={!!editingProperty}
          onOpenChange={(open) => {
            if (!open) setEditingProperty(null);
          }}
          property={editingProperty}
          source="list"
          mutation={updateMutation} // Pass mutation directly if modal supports it
        />
      )}
    </>
  );
}
