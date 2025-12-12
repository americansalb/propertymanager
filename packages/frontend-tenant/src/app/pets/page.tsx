'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PawPrint,
  Loader2,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Syringe,
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import TenantLayout from '@/components/layouts/TenantLayout';
import { format, isBefore } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface PetRegistration {
  id: string;
  status: string;
  petName: string;
  petType: string;
  breed: string | null;
  weight: number | null;
  color: string | null;
  age: number | null;
  description: string | null;
  isVaccinated: boolean;
  vaccinationExpiryDate: string | null;
  vetName: string | null;
  vetPhone: string | null;
  photoUrl: string | null;
  registrationNumber: string | null;
  registrationExpiryDate: string | null;
  petDeposit: number | null;
  monthlyPetRent: number | null;
  denialReason: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    color: 'bg-amber-100 text-amber-700',
    icon: Clock,
  },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  DENIED: { label: 'Denied', color: 'bg-red-100 text-red-700', icon: XCircle },
  EXPIRED: { label: 'Expired', color: 'bg-gray-100 text-gray-700', icon: AlertCircle },
};

const PET_TYPES = [
  { value: 'DOG', label: 'Dog', icon: '🐕' },
  { value: 'CAT', label: 'Cat', icon: '🐱' },
  { value: 'BIRD', label: 'Bird', icon: '🐦' },
  { value: 'FISH', label: 'Fish', icon: '🐟' },
  { value: 'SMALL_MAMMAL', label: 'Small Mammal', icon: '🐹' },
  { value: 'REPTILE', label: 'Reptile', icon: '🦎' },
  { value: 'OTHER', label: 'Other', icon: '🐾' },
];

export default function PetsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingPet, setEditingPet] = useState<PetRegistration | null>(null);

  // Form state
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('DOG');
  const [breed, setBreed] = useState('');
  const [weight, setWeight] = useState('');
  const [color, setColor] = useState('');
  const [age, setAge] = useState('');
  const [description, setDescription] = useState('');
  const [isVaccinated, setIsVaccinated] = useState(false);
  const [vaccinationExpiryDate, setVaccinationExpiryDate] = useState('');
  const [vetName, setVetName] = useState('');
  const [vetPhone, setVetPhone] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['pet-registrations'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/pets');
      return response.data.data as PetRegistration[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/tenant-portal/pets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-registrations'] });
      setShowCreate(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await api.put(`/tenant-portal/pets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-registrations'] });
      setEditingPet(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (petId: string) => {
      await api.delete(`/tenant-portal/pets/${petId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-registrations'] });
    },
  });

  const resetForm = () => {
    setPetName('');
    setPetType('DOG');
    setBreed('');
    setWeight('');
    setColor('');
    setAge('');
    setDescription('');
    setIsVaccinated(false);
    setVaccinationExpiryDate('');
    setVetName('');
    setVetPhone('');
  };

  const handleCreate = () => {
    createMutation.mutate({
      petName,
      petType,
      breed: breed || undefined,
      weight: weight ? parseFloat(weight) : undefined,
      color: color || undefined,
      age: age ? parseInt(age) : undefined,
      description: description || undefined,
      isVaccinated,
      vaccinationExpiryDate: vaccinationExpiryDate || undefined,
      vetName: vetName || undefined,
      vetPhone: vetPhone || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingPet) {
      return;
    }

    updateMutation.mutate({
      id: editingPet.id,
      data: {
        breed: breed || undefined,
        weight: weight ? parseFloat(weight) : undefined,
        color: color || undefined,
        age: age ? parseInt(age) : undefined,
        description: description || undefined,
        isVaccinated,
        vaccinationExpiryDate: vaccinationExpiryDate || undefined,
        vetName: vetName || undefined,
        vetPhone: vetPhone || undefined,
      },
    });
  };

  const openEditDialog = (pet: PetRegistration) => {
    setEditingPet(pet);
    setBreed(pet.breed || '');
    setWeight(pet.weight?.toString() || '');
    setColor(pet.color || '');
    setAge(pet.age?.toString() || '');
    setDescription(pet.description || '');
    setIsVaccinated(pet.isVaccinated);
    setVaccinationExpiryDate(
      pet.vaccinationExpiryDate ? format(new Date(pet.vaccinationExpiryDate), 'yyyy-MM-dd') : '',
    );
    setVetName(pet.vetName || '');
    setVetPhone(pet.vetPhone || '');
  };

  const getPetTypeIcon = (type: string) => {
    const petType = PET_TYPES.find((p) => p.value === type);
    return petType?.icon || '🐾';
  };

  if (isLoading) {
    return (
      <TenantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </TenantLayout>
    );
  }

  if (error) {
    return (
      <TenantLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Unable to load pet registrations
          </h3>
          <p className="text-gray-500">Please try again later.</p>
        </div>
      </TenantLayout>
    );
  }

  const pets = data || [];

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pet Registration</h1>
            <p className="text-gray-600 mt-1">Register and manage your pets</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Register Pet
          </Button>
        </div>

        {/* Pets List */}
        {pets.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pets Registered</h3>
                <p className="text-gray-500 mb-4">
                  Register your pets to comply with building pet policies.
                </p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Register Your First Pet
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pets.map((pet) => {
              const statusConfig = STATUS_CONFIG[pet.status] || STATUS_CONFIG.PENDING_APPROVAL;
              const StatusIcon = statusConfig.icon;
              const vaccinationExpired =
                pet.vaccinationExpiryDate &&
                isBefore(new Date(pet.vaccinationExpiryDate), new Date());

              return (
                <Card key={pet.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-4 bg-amber-100 rounded-xl text-4xl">
                        {getPetTypeIcon(pet.petType)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg text-gray-900">{pet.petName}</h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </span>
                            </div>

                            <p className="text-sm text-gray-600 mt-1">
                              {PET_TYPES.find((p) => p.value === pet.petType)?.label || pet.petType}
                              {pet.breed && ` - ${pet.breed}`}
                            </p>

                            <div className="flex flex-wrap gap-2 mt-2 text-xs">
                              {pet.weight && (
                                <span className="bg-gray-100 px-2 py-1 rounded">
                                  {pet.weight} lbs
                                </span>
                              )}
                              {pet.age && (
                                <span className="bg-gray-100 px-2 py-1 rounded">
                                  {pet.age} years old
                                </span>
                              )}
                              {pet.color && (
                                <span className="bg-gray-100 px-2 py-1 rounded">{pet.color}</span>
                              )}
                            </div>

                            {/* Vaccination Status */}
                            <div className="mt-3">
                              {pet.isVaccinated ? (
                                <div
                                  className={`flex items-center gap-1 text-sm ${
                                    vaccinationExpired ? 'text-red-600' : 'text-green-600'
                                  }`}
                                >
                                  <Syringe className="w-4 h-4" />
                                  {vaccinationExpired ? 'Vaccination Expired' : 'Vaccinated'}
                                  {pet.vaccinationExpiryDate && (
                                    <span className="text-gray-500">
                                      {' '}
                                      (exp.{' '}
                                      {format(new Date(pet.vaccinationExpiryDate), 'MMM d, yyyy')})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-amber-600 flex items-center gap-1">
                                  <AlertCircle className="w-4 h-4" />
                                  Vaccination records needed
                                </span>
                              )}
                            </div>

                            {pet.registrationNumber && (
                              <p className="text-xs text-gray-500 mt-2">
                                Registration #: {pet.registrationNumber}
                              </p>
                            )}

                            {pet.denialReason && (
                              <p className="text-sm text-red-600 mt-2">
                                Denial reason: {pet.denialReason}
                              </p>
                            )}

                            {(pet.petDeposit || pet.monthlyPetRent) && (
                              <div className="flex gap-4 mt-2 text-sm">
                                {pet.petDeposit && (
                                  <span className="text-gray-600">
                                    Deposit: ${Number(pet.petDeposit).toFixed(0)}
                                  </span>
                                )}
                                {pet.monthlyPetRent && (
                                  <span className="text-gray-600">
                                    Monthly: ${Number(pet.monthlyPetRent).toFixed(0)}/mo
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(pet)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => deleteMutation.mutate(pet.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PawPrint className="w-5 h-5" />
                Register Pet
              </DialogTitle>
              <DialogDescription>Register your pet with the building management</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="petName">Pet Name *</Label>
                <Input
                  id="petName"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="Buddy"
                />
              </div>

              <div className="space-y-2">
                <Label>Pet Type *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {PET_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      type="button"
                      variant={petType === type.value ? 'default' : 'outline'}
                      onClick={() => setPetType(type.value)}
                      className="flex flex-col h-auto py-3"
                    >
                      <span className="text-2xl mb-1">{type.icon}</span>
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="breed">Breed</Label>
                  <Input
                    id="breed"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    placeholder="Labrador"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Golden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age (years)</Label>
                  <Input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="3"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any notable features or temperament..."
                  rows={2}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isVaccinated"
                    checked={isVaccinated}
                    onChange={(e) => setIsVaccinated(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="isVaccinated">Pet is vaccinated</Label>
                </div>

                {isVaccinated && (
                  <div className="space-y-2">
                    <Label htmlFor="vaccinationExpiryDate">Vaccination Expiry Date</Label>
                    <Input
                      id="vaccinationExpiryDate"
                      type="date"
                      value={vaccinationExpiryDate}
                      onChange={(e) => setVaccinationExpiryDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vetName">Veterinarian Name</Label>
                  <Input
                    id="vetName"
                    value={vetName}
                    onChange={(e) => setVetName(e.target.value)}
                    placeholder="Dr. Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vetPhone">Vet Phone</Label>
                  <Input
                    id="vetPhone"
                    value={vetPhone}
                    onChange={(e) => setVetPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending || !petName}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Register Pet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingPet} onOpenChange={(open) => !open && setEditingPet(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                Update {editingPet?.petName}
              </DialogTitle>
              <DialogDescription>Update your pet&apos;s information</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editBreed">Breed</Label>
                  <Input id="editBreed" value={breed} onChange={(e) => setBreed(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editColor">Color</Label>
                  <Input id="editColor" value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editWeight">Weight (lbs)</Label>
                  <Input
                    id="editWeight"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAge">Age (years)</Label>
                  <Input
                    id="editAge"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="editIsVaccinated"
                    checked={isVaccinated}
                    onChange={(e) => setIsVaccinated(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="editIsVaccinated">Pet is vaccinated</Label>
                </div>

                {isVaccinated && (
                  <div className="space-y-2">
                    <Label htmlFor="editVaccinationExpiryDate">Vaccination Expiry Date</Label>
                    <Input
                      id="editVaccinationExpiryDate"
                      type="date"
                      value={vaccinationExpiryDate}
                      onChange={(e) => setVaccinationExpiryDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editVetName">Veterinarian Name</Label>
                  <Input
                    id="editVetName"
                    value={vetName}
                    onChange={(e) => setVetName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editVetPhone">Vet Phone</Label>
                  <Input
                    id="editVetPhone"
                    value={vetPhone}
                    onChange={(e) => setVetPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPet(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TenantLayout>
  );
}
