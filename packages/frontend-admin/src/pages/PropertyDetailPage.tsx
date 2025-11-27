import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, MapPin, Edit, Calendar, Ruler, Hash, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../components/ui/dialog';
import UnitsTable from '../components/units/UnitsTable';
import PropertyEditModal from '../components/properties/PropertyEditModal';

interface Property {
  id: string;
  name: string;
  type: string;
  status: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  yearBuilt?: number;
  totalUnits: number;
  squareFeet?: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  UNDER_CONSTRUCTION: 'bg-orange-100 text-orange-700',
};

const TYPE_LABELS: Record<string, string> = {
  MULTIFAMILY: 'Multifamily',
  SINGLE_FAMILY: 'Single Family',
  COMMERCIAL: 'Commercial',
  MIXED_USE: 'Mixed Use',
  STUDENT_HOUSING: 'Student Housing',
  SENIOR_LIVING: 'Senior Living',
};

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    data: property,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      const response = await api.get(`/properties/${id}`);
      return response.data.data as Property;
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigate('/properties');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete property';
      setDeleteError(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const handleDelete = () => {
    setDeleteError(null);
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/properties')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Properties
        </Button>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Property not found</h3>
              <p className="text-gray-500">
                The property you&apos;re looking for doesn&apos;t exist or has been deleted.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/properties')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-gray-500 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {property.address1}, {property.city}, {property.state} {property.zipCode}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setEditModalOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Property
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-red-600 border-red-300 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Property
          </Button>
        </div>
      </div>

      {/* Property Info Card */}
      <Card>
        <CardContent className="py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {/* Status */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[property.status] || 'bg-gray-100 text-gray-700'}`}
              >
                {property.status}
              </span>
            </div>

            {/* Type */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Type</p>
              <p className="font-medium flex items-center gap-1">
                <Building2 className="w-4 h-4 text-gray-400" />
                {TYPE_LABELS[property.type] || property.type}
              </p>
            </div>

            {/* Total Units */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Units</p>
              <p className="font-medium flex items-center gap-1">
                <Hash className="w-4 h-4 text-gray-400" />
                {property.totalUnits}
              </p>
            </div>

            {/* Year Built */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Year Built</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                {property.yearBuilt || 'N/A'}
              </p>
            </div>

            {/* Square Feet */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Square Feet</p>
              <p className="font-medium flex items-center gap-1">
                <Ruler className="w-4 h-4 text-gray-400" />
                {property.squareFeet ? property.squareFeet.toLocaleString() : 'N/A'}
              </p>
            </div>

            {/* Address Line 2 */}
            {property.address2 && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Address Line 2</p>
                <p className="font-medium">{property.address2}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Units Table */}
      <UnitsTable propertyId={property.id} propertyName={property.name} />

      {/* Edit Property Modal */}
      <PropertyEditModal property={property} open={editModalOpen} onOpenChange={setEditModalOpen} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Delete Property
              </DialogTitle>
              <DialogDescription className="mt-2 text-gray-600">
                Are you sure you want to delete <strong>{property.name}</strong>? This action cannot
                be undone. All units associated with this property will also be deleted.
              </DialogDescription>
              {deleteError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{deleteError}</p>
                </div>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeleteError(null);
                  }}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Property
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
