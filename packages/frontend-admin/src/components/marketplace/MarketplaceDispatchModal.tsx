import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Star,
  CheckCircle,
  Phone,
  MapPin,
  Clock,
  Shield,
  Search,
  Award,
  DollarSign,
  AlertCircle,
  Zap,
} from 'lucide-react';
import api from '../../services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface MarketplaceDispatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: any;
}

const SERVICE_CATEGORIES = [
  { value: 'LOCKSMITH', label: 'Locksmith' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'APPLIANCE_REPAIR', label: 'Appliance Repair' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'LANDSCAPING', label: 'Landscaping' },
  { value: 'PEST_CONTROL', label: 'Pest Control' },
  { value: 'PAINTING', label: 'Painting' },
  { value: 'FLOORING', label: 'Flooring' },
  { value: 'ROOFING', label: 'Roofing' },
  { value: 'GENERAL_HANDYMAN', label: 'General Handyman' },
];

const PROTECTION_TIERS = [
  {
    value: 'PROTECTED',
    label: 'Full Protection (12%)',
    description: '90-day workmanship guarantee, $10k damage coverage, dispute resolution',
    fee: '12%',
  },
  {
    value: 'BASIC',
    label: 'Basic (3%)',
    description: 'Payment processing only, no guarantees',
    fee: '3%',
  },
];

export default function MarketplaceDispatchModal({
  open,
  onOpenChange,
  workOrder,
}: MarketplaceDispatchModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedVendorProfileId, setSelectedVendorProfileId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [protectionTier, setProtectionTier] = useState<string>('PROTECTED');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState<string>('');
  const [estimatedAmount, setEstimatedAmount] = useState<string>('');

  // Fetch marketplace vendors
  const { data: vendorsData, isLoading: isLoadingVendors } = useQuery({
    queryKey: ['marketplace-vendors-dispatch', categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }
      params.append('acceptingOnly', 'true');

      const response = await api.get(`/marketplace/vendors/browse?${params.toString()}`);
      return response.data;
    },
    enabled: open,
  });

  // Fetch service catalog for the selected category
  const { data: services } = useQuery({
    queryKey: ['service-catalog-dispatch', categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }
      params.append('activeOnly', 'true');

      const response = await api.get(`/marketplace/services?${params.toString()}`);
      return response.data.data;
    },
    enabled: open && !!categoryFilter,
  });

  // Create marketplace job mutation
  const createMarketplaceJob = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/marketplace/jobs', data);
      return response.data;
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.message || 'Failed to create marketplace job. Please try again.',
      );
    },
  });

  // Dispatch job mutation
  const dispatchJob = useMutation({
    mutationFn: async ({ jobId, data }: { jobId: string; data: any }) => {
      const response = await api.post(`/marketplace/jobs/${jobId}/dispatch`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'Failed to dispatch job. Please try again.');
    },
  });

  const resetForm = () => {
    setStep('select');
    setSearchQuery('');
    setCategoryFilter('');
    setSelectedVendorProfileId('');
    setSelectedServiceId('');
    setProtectionTier('PROTECTED');
    setScheduledDate('');
    setScheduledTimeSlot('');
    setEstimatedAmount('');
  };

  // Filter vendors by search query
  const filteredVendors = useMemo(() => {
    if (!vendorsData?.data) {
      return [];
    }

    return vendorsData.data.filter((profile: any) => {
      if (!searchQuery) {
        return true;
      }
      const search = searchQuery.toLowerCase();
      return (
        profile.vendor.companyName?.toLowerCase().includes(search) ||
        profile.vendor.contactName?.toLowerCase().includes(search)
      );
    });
  }, [vendorsData?.data, searchQuery]);

  const selectedVendor = useMemo(() => {
    if (!selectedVendorProfileId || !vendorsData?.data) {
      return null;
    }
    return vendorsData.data.find((p: any) => p.id === selectedVendorProfileId);
  }, [selectedVendorProfileId, vendorsData?.data]);

  const selectedService = useMemo(() => {
    if (!selectedServiceId || !services) {
      return null;
    }
    return services.find((s: any) => s.id === selectedServiceId);
  }, [selectedServiceId, services]);

  const handleSelectVendor = (profileId: string) => {
    setSelectedVendorProfileId(profileId);
    setStep('configure');
  };

  const handleDispatch = async () => {
    if (!workOrder?.id || !selectedVendorProfileId) {
      return;
    }

    try {
      // First create the marketplace job
      const jobResponse = await createMarketplaceJob.mutateAsync({
        workOrderId: workOrder.id,
        source: 'MARKETPLACE',
        serviceCatalogId: selectedServiceId || undefined,
        protectionTier,
        estimatedTotal: estimatedAmount ? parseFloat(estimatedAmount) : undefined,
      });

      // Then dispatch to the selected vendor
      await dispatchJob.mutateAsync({
        jobId: jobResponse.data.id,
        data: {
          vendorProfileId: selectedVendorProfileId,
          scheduledDate: scheduledDate || undefined,
          scheduledTimeSlot: scheduledTimeSlot || undefined,
          estimatedAmount: estimatedAmount ? parseFloat(estimatedAmount) : undefined,
        },
      });
    } catch {
      // Error is handled by mutation's onError callback
    }
  };

  const isDispatching = createMarketplaceJob.isPending || dispatchJob.isPending;

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'PREMIUM':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-300">
            <Award className="w-3 h-3" />
            Premium
          </span>
        );
      case 'VERIFIED_PRICING':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
            <CheckCircle className="w-3 h-3" />
            Verified
          </span>
        );
      default:
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Standard</span>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-primary/10 to-blue-50 -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Dispatch to Marketplace</DialogTitle>
              <DialogDescription>
                {workOrder?.title} - {workOrder?.property?.name}
                {workOrder?.unit && ` Unit ${workOrder.unit.unitNumber}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 'select' ? (
          <div className="space-y-4 py-4">
            {/* Marketplace Benefits Banner */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span>90-Day Guarantee</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Fast Response</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span>Transparent Pricing</span>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={categoryFilter || 'all'}
                onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vendor List */}
            {isLoadingVendors ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-gray-500">Loading vendors...</div>
              </div>
            ) : filteredVendors.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 max-h-[400px] overflow-y-auto pr-2">
                {filteredVendors.map((profile: any) => (
                  <div
                    key={profile.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedVendorProfileId === profile.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSelectVendor(profile.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{profile.vendor.companyName}</h4>
                        {profile.vendor.contactName && (
                          <p className="text-sm text-gray-500">{profile.vendor.contactName}</p>
                        )}
                      </div>
                      {getTierBadge(profile.tier)}
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-medium">
                          {profile.averageRating ? Number(profile.averageRating).toFixed(1) : 'New'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {profile.totalJobsCompleted} jobs
                      </span>
                      {profile.averageResponseMinutes && (
                        <span className="text-sm text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {profile.averageResponseMinutes < 60
                            ? `${profile.averageResponseMinutes}m`
                            : `${Math.round(profile.averageResponseMinutes / 60)}h`}{' '}
                          response
                        </span>
                      )}
                    </div>

                    {profile.services && profile.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {profile.services.slice(0, 3).map((service: any) => (
                          <span
                            key={service.id}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
                            {service.serviceCatalog?.name || service.serviceCatalog?.category}
                          </span>
                        ))}
                        {profile.services.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{profile.services.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {profile.vendor.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {profile.vendor.phone}
                        </span>
                      )}
                      {profile.vendor.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {profile.vendor.city}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">No vendors found</p>
                <p className="text-sm text-gray-400">Try adjusting your filters or search query</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Selected Vendor Summary */}
            {selectedVendor && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800">
                      {selectedVendor.vendor.companyName}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-green-700">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {selectedVendor.averageRating
                          ? Number(selectedVendor.averageRating).toFixed(1)
                          : 'New'}
                      </span>
                      <span>{selectedVendor.totalJobsCompleted} jobs completed</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep('select')}>
                    Change
                  </Button>
                </div>
              </div>
            )}

            {/* Configuration Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Service Selection */}
                <div className="space-y-2">
                  <Label>Service Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {services && services.length > 0 && (
                  <div className="space-y-2">
                    <Label>Specific Service</Label>
                    <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specific service (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service: any) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} (${Number(service.typicalTotalMin).toFixed(0)}-$
                            {Number(service.typicalTotalMax).toFixed(0)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Estimated Amount */}
                <div className="space-y-2">
                  <Label htmlFor="estimatedAmount">Estimated Amount ($)</Label>
                  <Input
                    id="estimatedAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={
                      selectedService
                        ? `Typical: $${Number(selectedService.typicalTotalMin).toFixed(0)}-$${Number(selectedService.typicalTotalMax).toFixed(0)}`
                        : 'Enter estimated amount'
                    }
                    value={estimatedAmount}
                    onChange={(e) => setEstimatedAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Scheduling */}
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Preferred Date</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preferred Time</Label>
                  <Select value={scheduledTimeSlot} onValueChange={setScheduledTimeSlot}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8am-10am">8am - 10am</SelectItem>
                      <SelectItem value="10am-12pm">10am - 12pm</SelectItem>
                      <SelectItem value="12pm-2pm">12pm - 2pm</SelectItem>
                      <SelectItem value="2pm-4pm">2pm - 4pm</SelectItem>
                      <SelectItem value="4pm-6pm">4pm - 6pm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Protection Tier Selection */}
            <div className="space-y-3">
              <Label>Protection Level</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROTECTION_TIERS.map((tier) => (
                  <div
                    key={tier.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      protectionTier === tier.value
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setProtectionTier(tier.value)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{tier.label}</h4>
                      {protectionTier === tier.value && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{tier.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'configure' && (
            <Button variant="outline" onClick={() => setStep('select')}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 'configure' && (
            <Button onClick={handleDispatch} disabled={!selectedVendorProfileId || isDispatching}>
              {isDispatching ? (
                'Dispatching...'
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Dispatch to Vendor
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
