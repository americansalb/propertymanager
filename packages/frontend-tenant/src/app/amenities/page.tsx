'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Users, Loader2, Plus, CheckCircle, MapPin, Info } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import TenantLayout from '@/components/layouts/TenantLayout';
import { format, addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Amenity {
  id: string;
  name: string;
  description: string | null;
  type: string;
  location: string | null;
  requiresReservation: boolean;
  maxCapacity: number | null;
  maxReservationHours: number;
  advanceBookingDays: number;
  operatingHours: any;
  rules: string | null;
  depositRequired: number | null;
  photos: string[];
}

interface Reservation {
  id: string;
  amenityId: string;
  amenityName: string;
  amenityType: string;
  status: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  notes: string | null;
  confirmationCode: string;
  createdAt: string;
}

const AMENITY_ICONS: Record<string, string> = {
  GYM: '🏋️',
  POOL: '🏊',
  CLUBHOUSE: '🏠',
  ROOFTOP: '🌆',
  BBQ_AREA: '🍖',
  TENNIS_COURT: '🎾',
  BASKETBALL_COURT: '🏀',
  BUSINESS_CENTER: '💼',
  CONFERENCE_ROOM: '📊',
  PARTY_ROOM: '🎉',
  THEATER: '🎬',
  DOG_PARK: '🐕',
  OTHER: '✨',
};

export default function AmenitiesPage() {
  const queryClient = useQueryClient();
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingStartTime, setBookingStartTime] = useState('');
  const [bookingEndTime, setBookingEndTime] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState('');

  const { data: amenitiesData, isLoading: amenitiesLoading } = useQuery({
    queryKey: ['amenities'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/amenities');
      return response.data.data as { amenities: Amenity[] };
    },
  });

  const { data: reservationsData, isLoading: reservationsLoading } = useQuery({
    queryKey: ['amenity-reservations'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/amenities/reservations');
      return response.data.data as Reservation[];
    },
  });

  const createReservationMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/tenant-portal/amenities/reservations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amenity-reservations'] });
      setShowBooking(false);
      setSelectedAmenity(null);
      setBookingDate('');
      setBookingStartTime('');
      setBookingEndTime('');
      setGuestCount(1);
      setNotes('');
    },
    onError: (error: any) => {
      console.error('Failed to create reservation:', error);
      alert(error?.response?.data?.message || 'Failed to create reservation. Please try again.');
    },
  });

  const cancelReservationMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      await api.delete(`/tenant-portal/amenities/reservations/${reservationId}`, {
        data: { reason: 'Cancelled by tenant' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amenity-reservations'] });
    },
    onError: (error: any) => {
      console.error('Failed to cancel reservation:', error);
      alert(error?.response?.data?.message || 'Failed to cancel reservation. Please try again.');
    },
  });

  const handleBookAmenity = (amenity: Amenity) => {
    setSelectedAmenity(amenity);
    setShowBooking(true);
    // Set default date to tomorrow
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    setBookingDate(tomorrow);
  };

  const handleSubmitBooking = () => {
    if (!selectedAmenity || !bookingDate || !bookingStartTime || !bookingEndTime) {
      return;
    }

    const startTime = new Date(`${bookingDate}T${bookingStartTime}:00`);
    const endTime = new Date(`${bookingDate}T${bookingEndTime}:00`);

    createReservationMutation.mutate({
      amenityId: selectedAmenity.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      guestCount,
      notes: notes || undefined,
    });
  };

  const isLoading = amenitiesLoading || reservationsLoading;

  if (isLoading) {
    return (
      <TenantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </TenantLayout>
    );
  }

  const amenities = amenitiesData?.amenities || [];
  const reservations = reservationsData || [];
  const upcomingReservations = reservations.filter(
    (r) =>
      r.status !== 'CANCELLED' && r.status !== 'COMPLETED' && new Date(r.startTime) > new Date(),
  );

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Amenities</h1>
          <p className="text-gray-600 mt-1">Reserve building amenities and view your bookings</p>
        </div>

        {/* Upcoming Reservations */}
        {upcomingReservations.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Your Upcoming Reservations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between bg-white p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">
                        {AMENITY_ICONS[reservation.amenityType] || '✨'}
                      </span>
                      <div>
                        <p className="font-medium">{reservation.amenityName}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(reservation.startTime), 'EEEE, MMM d')} at{' '}
                          {format(new Date(reservation.startTime), 'h:mm a')} -{' '}
                          {format(new Date(reservation.endTime), 'h:mm a')}
                        </p>
                        <p className="text-xs text-gray-500">
                          Confirmation: {reservation.confirmationCode.slice(-8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => cancelReservationMutation.mutate(reservation.id)}
                      disabled={cancelReservationMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Amenities */}
        {amenities.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Amenities Available</h3>
                <p className="text-gray-500">
                  Your property does not have any amenities configured for reservation.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {amenities.map((amenity) => (
              <Card key={amenity.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{AMENITY_ICONS[amenity.type] || '✨'}</span>
                      <div>
                        <CardTitle className="text-lg">{amenity.name}</CardTitle>
                        {amenity.location && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {amenity.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {amenity.description && (
                    <p className="text-sm text-gray-600">{amenity.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs">
                    {amenity.maxCapacity && (
                      <span className="bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Max {amenity.maxCapacity}
                      </span>
                    )}
                    <span className="bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Up to {amenity.maxReservationHours}h
                    </span>
                  </div>

                  {amenity.requiresReservation ? (
                    <Button className="w-full" onClick={() => handleBookAmenity(amenity)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Reserve
                    </Button>
                  ) : (
                    <p className="text-sm text-green-600 text-center py-2">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      No reservation required
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Booking Dialog */}
        <Dialog open={showBooking} onOpenChange={setShowBooking}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedAmenity && (
                  <>
                    <span className="text-2xl">{AMENITY_ICONS[selectedAmenity.type] || '✨'}</span>
                    Reserve {selectedAmenity.name}
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Book up to {selectedAmenity?.maxReservationHours} hours,{' '}
                {selectedAmenity?.advanceBookingDays} days in advance
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                  max={format(
                    addDays(new Date(), selectedAmenity?.advanceBookingDays || 14),
                    'yyyy-MM-dd',
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={bookingStartTime}
                    onChange={(e) => setBookingStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={bookingEndTime}
                    onChange={(e) => setBookingEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guests">Number of Guests</Label>
                <Input
                  id="guests"
                  type="number"
                  min={1}
                  max={selectedAmenity?.maxCapacity || 50}
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests..."
                  rows={2}
                />
              </div>

              {selectedAmenity?.rules && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800 mb-1">Rules</p>
                  <p className="text-sm text-amber-700">{selectedAmenity.rules}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBooking(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitBooking}
                disabled={
                  createReservationMutation.isPending ||
                  !bookingDate ||
                  !bookingStartTime ||
                  !bookingEndTime
                }
              >
                {createReservationMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Confirm Reservation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TenantLayout>
  );
}
