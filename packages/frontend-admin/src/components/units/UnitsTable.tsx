import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Home, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import UnitModal from './UnitModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface Unit {
  id: string;
  unitNumber: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  marketRent: number;
  status: 'VACANT' | 'OCCUPIED' | 'NOTICE' | 'MAINTENANCE';
  floor: number | null;
  features: string[];
}

interface UnitsTableProps {
  propertyId: string;
  propertyName: string;
}

const STATUS_COLORS: Record<string, string> = {
  VACANT: 'bg-yellow-100 text-yellow-700',
  OCCUPIED: 'bg-green-100 text-green-700',
  NOTICE: 'bg-orange-100 text-orange-700',
  MAINTENANCE: 'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  STUDIO: 'Studio',
  ONE_BED: '1 Bed',
  TWO_BED: '2 Bed',
  THREE_BED: '3 Bed',
  FOUR_PLUS_BED: '4+ Bed',
};

export default function UnitsTable({ propertyId, propertyName }: UnitsTableProps) {
  const queryClient = useQueryClient();
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: units, isLoading } = useQuery({
    queryKey: ['units', propertyId],
    queryFn: async () => {
      const response = await api.get(`/units?propertyId=${propertyId}`);
      return response.data.data as Unit[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (unitId: string) => {
      await api.delete(`/units/${unitId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
      setDeleteDialogOpen(false);
      setUnitToDelete(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ unitId, status }: { unitId: string; status: string }) => {
      await api.put(`/units/${unitId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
    },
  });

  const handleAddUnit = () => {
    setSelectedUnit(null);
    setModalOpen(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setModalOpen(true);
  };

  const handleDeleteClick = (unit: Unit) => {
    setUnitToDelete(unit);
    setDeleteDialogOpen(true);
  };

  const handleStatusChange = (unitId: string, newStatus: string) => {
    statusMutation.mutate({ unitId, status: newStatus });
  };

  const filteredUnits = units?.filter((unit) => {
    if (statusFilter === 'ALL') {
      return true;
    }
    return unit.status === statusFilter;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Units ({units?.length || 0})
            </CardTitle>
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border rounded-md px-3 py-1.5"
              >
                <option value="ALL">All Statuses</option>
                <option value="VACANT">Vacant</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="NOTICE">Notice</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
              <Button onClick={handleAddUnit} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Unit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUnits && filteredUnits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Unit #</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Bed/Bath</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Sq Ft</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Market Rent</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map((unit) => (
                    <tr key={unit.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{unit.unitNumber}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {TYPE_LABELS[unit.type] || unit.type}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {unit.bedrooms} / {unit.bathrooms}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {unit.squareFeet ? unit.squareFeet.toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        ${Number(unit.marketRent).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={unit.status}
                          onChange={(e) => handleStatusChange(unit.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[unit.status]}`}
                          disabled={statusMutation.isPending}
                        >
                          <option value="VACANT">Vacant</option>
                          <option value="OCCUPIED">Occupied</option>
                          <option value="NOTICE">Notice</option>
                          <option value="MAINTENANCE">Maintenance</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditUnit(unit)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(unit)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No units yet</h3>
              <p className="text-gray-500 mb-6">Add units to this property to get started</p>
              <Button onClick={handleAddUnit}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Unit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <UnitModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        unit={selectedUnit}
        propertyId={propertyId}
        propertyName={propertyName}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Unit {unitToDelete?.unitNumber}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => unitToDelete && deleteMutation.mutate(unitToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
