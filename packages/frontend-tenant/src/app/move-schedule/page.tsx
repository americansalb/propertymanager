'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Loader2,
  AlertCircle,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

interface MoveSchedule {
  id: string;
  type: 'MOVE_IN' | 'MOVE_OUT';
  status: string;
  requestedDate: string;
  requestedTimeSlot: string;
  approvedDate: string | null;
  approvedTimeSlot: string | null;
  elevatorReserved: boolean;
  elevatorNumber: string | null;
  movingCompanyName: string | null;
  movingCompanyPhone: string | null;
  estimatedDuration: number | null;
  specialRequests: string | null;
  denialReason: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  REQUESTED: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  DENIED: { label: 'Denied', color: 'bg-red-100 text-red-700', icon: XCircle },
  COMPLETED: { label: 'Completed', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

const TIME_SLOTS = [
  { value: '8am-12pm', label: '8:00 AM - 12:00 PM' },
  { value: '12pm-4pm', label: '12:00 PM - 4:00 PM' },
  { value: '4pm-8pm', label: '4:00 PM - 8:00 PM' },
];

export default function MoveSchedulePage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [moveType, setMoveType] = useState<'MOVE_IN' | 'MOVE_OUT'>('MOVE_IN');
  const [requestedDate, setRequestedDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [movingCompanyName, setMovingCompanyName] = useState('');
  const [movingCompanyPhone, setMovingCompanyPhone] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['move-schedules'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/move-schedules');
      return response.data.data as MoveSchedule[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/tenant-portal/move-schedules', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['move-schedules'] });
      setShowCreate(false);
      resetForm();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await api.delete(`/tenant-portal/move-schedules/${scheduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['move-schedules'] });
    },
  });

  const resetForm = () => {
    setMoveType('MOVE_IN');
    setRequestedDate('');
    setTimeSlot('');
    setMovingCompanyName('');
    setMovingCompanyPhone('');
    setEstimatedDuration('');
    setSpecialRequests('');
  };

  const handleCreate = () => {
    createMutation.mutate({
      type: moveType,
      requestedDate,
      requestedTimeSlot: timeSlot,
      movingCompanyName: movingCompanyName || undefined,
      movingCompanyPhone: movingCompanyPhone || undefined,
      estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
      specialRequests: specialRequests || undefined,
    });
  };

  const openCreateDialog = () => {
    const defaultDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    setRequestedDate(defaultDate);
    setTimeSlot(TIME_SLOTS[0].value);
    setShowCreate(true);
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load move schedules</h3>
          <p className="text-gray-500">Please try again later.</p>
        </div>
      </TenantLayout>
    );
  }

  const schedules = data || [];
  const hasPendingMoveIn = schedules.some(
    (s) => s.type === 'MOVE_IN' && (s.status === 'REQUESTED' || s.status === 'APPROVED'),
  );
  const hasPendingMoveOut = schedules.some(
    (s) => s.type === 'MOVE_OUT' && (s.status === 'REQUESTED' || s.status === 'APPROVED'),
  );

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Move Scheduling</h1>
            <p className="text-gray-600 mt-1">Schedule elevator reservations for moving</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Move
          </Button>
        </div>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Planning a move?</p>
                <p className="text-sm text-blue-700 mt-1">
                  Schedule your move at least 7 days in advance to ensure elevator availability.
                  Include your moving company information if applicable.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedules List */}
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Move Schedules</h3>
                <p className="text-gray-500 mb-4">
                  Schedule a move-in or move-out to reserve the elevator.
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Your Move
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => {
              const statusConfig = STATUS_CONFIG[schedule.status] || STATUS_CONFIG.REQUESTED;
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={schedule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          schedule.type === 'MOVE_IN' ? 'bg-green-100' : 'bg-orange-100'
                        }`}
                      >
                        {schedule.type === 'MOVE_IN' ? (
                          <ArrowDown
                            className={`w-6 h-6 ${
                              schedule.type === 'MOVE_IN' ? 'text-green-600' : 'text-orange-600'
                            }`}
                          />
                        ) : (
                          <ArrowUp className="w-6 h-6 text-orange-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-gray-900">
                                {schedule.type === 'MOVE_IN' ? 'Move In' : 'Move Out'}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </span>
                            </div>

                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {schedule.status === 'APPROVED' && schedule.approvedDate
                                  ? format(new Date(schedule.approvedDate), 'EEEE, MMMM d, yyyy')
                                  : format(new Date(schedule.requestedDate), 'EEEE, MMMM d, yyyy')}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Clock className="w-4 h-4 text-gray-400" />
                                {schedule.status === 'APPROVED' && schedule.approvedTimeSlot
                                  ? schedule.approvedTimeSlot
                                  : schedule.requestedTimeSlot}
                              </p>
                            </div>

                            {schedule.elevatorReserved && schedule.elevatorNumber && (
                              <p className="text-sm text-green-600 mt-2">
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                Elevator {schedule.elevatorNumber} reserved
                              </p>
                            )}

                            {schedule.movingCompanyName && (
                              <p className="text-sm text-gray-500 mt-2">
                                Moving Company: {schedule.movingCompanyName}
                                {schedule.movingCompanyPhone && ` - ${schedule.movingCompanyPhone}`}
                              </p>
                            )}

                            {schedule.denialReason && (
                              <p className="text-sm text-red-600 mt-2">
                                Reason: {schedule.denialReason}
                              </p>
                            )}
                          </div>

                          {(schedule.status === 'REQUESTED' || schedule.status === 'APPROVED') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => cancelMutation.mutate(schedule.id)}
                              disabled={cancelMutation.isPending}
                            >
                              Cancel
                            </Button>
                          )}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Schedule Move
              </DialogTitle>
              <DialogDescription>Request an elevator reservation for your move</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Move Type Selection */}
              <div className="space-y-2">
                <Label>Move Type *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={moveType === 'MOVE_IN' ? 'default' : 'outline'}
                    onClick={() => setMoveType('MOVE_IN')}
                    className={moveType === 'MOVE_IN' ? 'bg-green-600 hover:bg-green-700' : ''}
                    disabled={hasPendingMoveIn}
                  >
                    <ArrowDown className="w-4 h-4 mr-2" />
                    Move In
                  </Button>
                  <Button
                    type="button"
                    variant={moveType === 'MOVE_OUT' ? 'default' : 'outline'}
                    onClick={() => setMoveType('MOVE_OUT')}
                    className={moveType === 'MOVE_OUT' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    disabled={hasPendingMoveOut}
                  >
                    <ArrowUp className="w-4 h-4 mr-2" />
                    Move Out
                  </Button>
                </div>
                {(hasPendingMoveIn || hasPendingMoveOut) && (
                  <p className="text-xs text-amber-600">
                    You already have a pending schedule for some move types.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requestedDate">Date *</Label>
                  <Input
                    id="requestedDate"
                    type="date"
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                    min={format(addDays(new Date(), 3), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeSlot">Time Slot *</Label>
                  <select
                    id="timeSlot"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="movingCompanyName">Moving Company</Label>
                  <Input
                    id="movingCompanyName"
                    value={movingCompanyName}
                    onChange={(e) => setMovingCompanyName(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="movingCompanyPhone">Company Phone</Label>
                  <Input
                    id="movingCompanyPhone"
                    value={movingCompanyPhone}
                    onChange={(e) => setMovingCompanyPhone(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedDuration">Estimated Duration (hours)</Label>
                <Input
                  id="estimatedDuration"
                  type="number"
                  min={1}
                  max={8}
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="e.g., 4"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Large items, specific requirements..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !requestedDate || !timeSlot}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TenantLayout>
  );
}
