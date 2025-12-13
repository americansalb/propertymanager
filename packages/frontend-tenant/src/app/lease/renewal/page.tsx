'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import TenantLayout from '@/components/layouts/TenantLayout';
import { format, differenceInDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RenewalOffer {
  id: string;
  status: string;
  newMonthlyRent: number;
  newStartDate: string;
  newEndDate: string | null;
  newLeaseType: string;
  rentChangeAmount: number | null;
  rentChangePercent: number | null;
  expiresAt: string;
  createdAt: string;
}

interface CurrentLease {
  id: string;
  monthlyRent: number;
  startDate: string;
  endDate: string | null;
  type: string;
}

interface RenewalOffersResponse {
  offers: RenewalOffer[];
  currentLease: CurrentLease;
}

const LEASE_TYPE_LABELS: Record<string, string> = {
  FIXED_TERM: 'Fixed Term',
  MONTH_TO_MONTH: 'Month-to-Month',
  COMMERCIAL: 'Commercial',
};

export default function LeaseRenewalPage() {
  const [selectedOffer, setSelectedOffer] = useState<RenewalOffer | null>(null);
  const [responseType, setResponseType] = useState<
    'ACCEPT' | 'DECLINE' | 'COUNTER' | 'MOVE_OUT' | null
  >(null);
  const [counterOfferRent, setCounterOfferRent] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['lease-renewal-offers'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/lease/renewal-offers');
      return response.data.data as RenewalOffersResponse;
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({
      offerId,
      response,
      notes,
      counterOfferRent,
    }: {
      offerId: string;
      response: string;
      notes?: string;
      counterOfferRent?: number;
    }) => {
      await api.post(`/tenant-portal/lease/renewal-offers/${offerId}/respond`, {
        response,
        notes,
        counterOfferRent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease-renewal-offers'] });
      setSelectedOffer(null);
      setResponseType(null);
      setNotes('');
      setCounterOfferRent('');
    },
  });

  const handleResponse = async () => {
    if (!selectedOffer || !responseType) {
      return;
    }

    setIsSubmitting(true);
    try {
      await respondMutation.mutateAsync({
        offerId: selectedOffer.id,
        response: responseType,
        notes: notes || undefined,
        counterOfferRent: responseType === 'COUNTER' ? parseFloat(counterOfferRent) : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load renewal offers</h3>
          <p className="text-gray-500">Please try again later.</p>
        </div>
      </TenantLayout>
    );
  }

  const offers = data?.offers || [];
  const currentLease = data?.currentLease;

  const daysUntilExpiry = currentLease?.endDate
    ? differenceInDays(new Date(currentLease.endDate), new Date())
    : null;

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lease Renewal</h1>
            <p className="text-gray-600 mt-1">Review and respond to renewal offers</p>
          </div>
          <Link href="/lease">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              View Current Lease
            </Button>
          </Link>
        </div>

        {/* Current Lease Summary */}
        {currentLease && (
          <Card
            className={
              daysUntilExpiry !== null && daysUntilExpiry < 60
                ? 'border-amber-200 bg-amber-50/50'
                : ''
            }
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Current Lease
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-gray-500">Monthly Rent</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${Number(currentLease.monthlyRent).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Lease Type</p>
                  <p className="text-xl font-bold text-gray-900">
                    {LEASE_TYPE_LABELS[currentLease.type] || currentLease.type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="text-xl font-bold text-gray-900">
                    {currentLease.endDate
                      ? format(new Date(currentLease.endDate), 'MMM d, yyyy')
                      : 'No end date'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Days Remaining</p>
                  <p
                    className={`text-xl font-bold ${daysUntilExpiry !== null && daysUntilExpiry < 60 ? 'text-amber-600' : 'text-gray-900'}`}
                  >
                    {daysUntilExpiry !== null
                      ? daysUntilExpiry > 0
                        ? `${daysUntilExpiry} days`
                        : 'Expired'
                      : 'N/A'}
                  </p>
                </div>
              </div>
              {daysUntilExpiry !== null && daysUntilExpiry < 60 && daysUntilExpiry > 0 && (
                <div className="mt-4 flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    Your lease is expiring soon. Please review renewal offers below.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Renewal Offers */}
        {offers.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Renewal Offers</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  When your property manager sends you a renewal offer, it will appear here. Check
                  back closer to your lease end date.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Available Renewal Offers</h2>
            {offers.map((offer) => {
              const daysUntilOfferExpiry = differenceInDays(new Date(offer.expiresAt), new Date());
              const rentChange = offer.rentChangeAmount || 0;
              const rentChangePercent = offer.rentChangePercent || 0;

              return (
                <Card
                  key={offer.id}
                  className={`transition-all ${offer.status === 'PENDING' ? 'hover:shadow-md' : 'opacity-75'}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {LEASE_TYPE_LABELS[offer.newLeaseType] || offer.newLeaseType} Renewal
                        </CardTitle>
                        <CardDescription>
                          Offer expires {format(new Date(offer.expiresAt), 'MMMM d, yyyy')}
                          {daysUntilOfferExpiry <= 7 && daysUntilOfferExpiry > 0 && (
                            <span className="text-amber-600 ml-2">
                              ({daysUntilOfferExpiry} days left)
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          offer.status === 'PENDING'
                            ? 'bg-blue-100 text-blue-700'
                            : offer.status === 'ACCEPTED'
                              ? 'bg-green-100 text-green-700'
                              : offer.status === 'DECLINED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {offer.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">New Monthly Rent</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-gray-900">
                            ${Number(offer.newMonthlyRent).toLocaleString()}
                          </p>
                          {rentChange !== 0 && (
                            <span
                              className={`flex items-center text-sm ${
                                rentChange > 0 ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              {rentChange > 0 ? (
                                <TrendingUp className="w-4 h-4 mr-1" />
                              ) : rentChange < 0 ? (
                                <TrendingDown className="w-4 h-4 mr-1" />
                              ) : (
                                <Minus className="w-4 h-4 mr-1" />
                              )}
                              {rentChange > 0 ? '+' : ''}
                              {rentChangePercent.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">New Term</p>
                        <p className="text-lg font-medium text-gray-900">
                          {format(new Date(offer.newStartDate), 'MMM d, yyyy')}
                          {offer.newEndDate && (
                            <> - {format(new Date(offer.newEndDate), 'MMM d, yyyy')}</>
                          )}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Lease Type</p>
                        <p className="text-lg font-medium text-gray-900">
                          {LEASE_TYPE_LABELS[offer.newLeaseType] || offer.newLeaseType}
                        </p>
                      </div>
                    </div>

                    {offer.status === 'PENDING' && (
                      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
                        <Button
                          onClick={() => {
                            setSelectedOffer(offer);
                            setResponseType('ACCEPT');
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept Offer
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedOffer(offer);
                            setResponseType('COUNTER');
                            setCounterOfferRent(String(offer.newMonthlyRent));
                          }}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Counter Offer
                        </Button>
                        <Button
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setSelectedOffer(offer);
                            setResponseType('DECLINE');
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Response Dialog */}
        <Dialog
          open={!!selectedOffer && !!responseType}
          onOpenChange={() => {
            setSelectedOffer(null);
            setResponseType(null);
            setNotes('');
            setCounterOfferRent('');
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {responseType === 'ACCEPT' && 'Accept Renewal Offer'}
                {responseType === 'DECLINE' && 'Decline Renewal Offer'}
                {responseType === 'COUNTER' && 'Submit Counter Offer'}
                {responseType === 'MOVE_OUT' && 'Notify Move Out'}
              </DialogTitle>
              <DialogDescription>
                {responseType === 'ACCEPT' &&
                  'By accepting, you agree to the new lease terms. A new lease will be generated for your signature.'}
                {responseType === 'DECLINE' &&
                  'If you decline this offer, your lease will end on the scheduled date. You can still negotiate a new offer with management.'}
                {responseType === 'COUNTER' &&
                  'Submit a counter offer with your preferred rent amount. Management will review and respond.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {responseType === 'COUNTER' && (
                <div className="space-y-2">
                  <Label htmlFor="counterRent">Your Proposed Monthly Rent</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="counterRent"
                      type="number"
                      value={counterOfferRent}
                      onChange={(e) => setCounterOfferRent(e.target.value)}
                      className="pl-9"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    responseType === 'COUNTER'
                      ? 'Explain why you are proposing this rate...'
                      : 'Any additional comments...'
                  }
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedOffer(null);
                  setResponseType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResponse}
                disabled={isSubmitting || (responseType === 'COUNTER' && !counterOfferRent)}
                className={
                  responseType === 'ACCEPT'
                    ? 'bg-green-600 hover:bg-green-700'
                    : responseType === 'DECLINE'
                      ? 'bg-red-600 hover:bg-red-700'
                      : ''
                }
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {responseType === 'ACCEPT' && 'Confirm Acceptance'}
                {responseType === 'DECLINE' && 'Confirm Decline'}
                {responseType === 'COUNTER' && 'Submit Counter Offer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TenantLayout>
  );
}
