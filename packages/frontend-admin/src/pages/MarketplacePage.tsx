import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Star,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Wrench,
  Shield,
  TrendingUp,
  Search,
  Filter,
  ExternalLink,
  Award,
  Zap,
  Users,
} from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

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

const JOB_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING_DISPATCH: { label: 'Pending Dispatch', color: 'bg-gray-100 text-gray-700' },
  DISPATCHED: { label: 'Dispatched', color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { label: 'Accepted', color: 'bg-purple-100 text-purple-700' },
  QUOTE_SUBMITTED: { label: 'Quote Pending', color: 'bg-amber-100 text-amber-700' },
  QUOTE_APPROVED: { label: 'Quote Approved', color: 'bg-indigo-100 text-indigo-700' },
  QUOTE_DECLINED: { label: 'Quote Declined', color: 'bg-red-100 text-red-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-cyan-100 text-cyan-700' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700' },
  DISPUTED: { label: 'Disputed', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
};

export default function MarketplacePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('vendors');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('');

  // Fetch marketplace statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['marketplace-stats'],
    queryFn: async () => {
      const response = await api.get('/marketplace/stats');
      return response.data.data;
    },
  });

  // Fetch marketplace vendors
  const { data: vendorsData, isLoading: isLoadingVendors } = useQuery({
    queryKey: ['marketplace-vendors', categoryFilter, tierFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }
      if (tierFilter) {
        params.append('tier', tierFilter);
      }
      params.append('acceptingOnly', 'true');

      const response = await api.get(`/marketplace/vendors/browse?${params.toString()}`);
      return response.data;
    },
  });

  // Fetch marketplace jobs
  const { data: jobsData, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['marketplace-jobs'],
    queryFn: async () => {
      const response = await api.get('/marketplace/jobs');
      return response.data;
    },
  });

  // Fetch service catalog
  const { data: services } = useQuery({
    queryKey: ['service-catalog'],
    queryFn: async () => {
      const response = await api.get('/marketplace/services?activeOnly=true');
      return response.data.data;
    },
  });

  // Confirm job mutation
  const confirmJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post(`/marketplace/jobs/${jobId}/confirm`, {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-stats'] });
    },
  });

  // Approve quote mutation
  const approveQuoteMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post(`/marketplace/jobs/${jobId}/quote/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-jobs'] });
    },
  });

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
        profile.vendor.contactName?.toLowerCase().includes(search) ||
        profile.services?.some(
          (s: any) =>
            s.serviceCatalog?.name?.toLowerCase().includes(search) ||
            s.serviceCatalog?.category?.toLowerCase().includes(search),
        )
      );
    });
  }, [vendorsData?.data, searchQuery]);

  // Group jobs by status
  const jobsByStatus = useMemo(() => {
    if (!jobsData?.data) {
      return { active: [], completed: [], pending: [] };
    }

    const active = jobsData.data.filter((job: any) =>
      ['DISPATCHED', 'ACCEPTED', 'QUOTE_APPROVED', 'IN_PROGRESS'].includes(job.status),
    );
    const completed = jobsData.data.filter((job: any) =>
      ['COMPLETED', 'CONFIRMED'].includes(job.status),
    );
    const pending = jobsData.data.filter((job: any) =>
      ['PENDING_DISPATCH', 'QUOTE_SUBMITTED', 'QUOTE_DECLINED'].includes(job.status),
    );

    return { active, completed, pending };
  }, [jobsData?.data]);

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

  if (isLoadingStats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading marketplace...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Store className="w-8 h-8 text-primary" />
            Vendor Marketplace
          </h1>
          <p className="text-gray-500 mt-1">
            Find trusted vendors with transparent pricing and guaranteed work
          </p>
        </div>
      </div>

      {/* Marketplace Value Proposition */}
      <div className="bg-gradient-to-r from-primary/10 to-blue-50 rounded-xl p-6 border border-primary/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">90-Day Guarantee</h3>
              <p className="text-sm text-gray-600">
                All work is backed by our workmanship guarantee
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Transparent Pricing</h3>
              <p className="text-sm text-gray-600">See typical costs before you dispatch</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">One-Click Dispatch</h3>
              <p className="text-sm text-gray-600">Dispatch vendors directly from work orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Jobs</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Wrench className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats?.totalJobs || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Marketplace jobs created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Jobs</CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats?.activeJobs || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats?.completedJobs || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spend</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              ${Number(stats?.totalSpend || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Through marketplace</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Job Value</CardTitle>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              ${Number(stats?.avgJobValue || 0).toFixed(0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per completed job</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Browse Vendors
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            My Jobs
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Services
          </TabsTrigger>
        </TabsList>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search vendors by name or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {SERVICE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Tiers</SelectItem>
                <SelectItem value="PREMIUM">Premium</SelectItem>
                <SelectItem value="VERIFIED_PRICING">Verified Pricing</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vendor Cards */}
          {isLoadingVendors ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-gray-500">Loading vendors...</div>
            </div>
          ) : filteredVendors.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredVendors.map((profile: any) => (
                <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{profile.vendor.companyName}</CardTitle>
                        {profile.vendor.contactName && (
                          <p className="text-sm text-gray-500">{profile.vendor.contactName}</p>
                        )}
                      </div>
                      {getTierBadge(profile.tier)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Rating */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                        <span className="font-semibold">
                          {profile.averageRating ? Number(profile.averageRating).toFixed(1) : 'New'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {profile.totalJobsCompleted} jobs completed
                      </span>
                    </div>

                    {/* Services */}
                    {profile.services && profile.services.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {profile.services.slice(0, 4).map((service: any) => (
                          <span
                            key={service.id}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                          >
                            {service.serviceCatalog?.name || service.serviceCatalog?.category}
                          </span>
                        ))}
                        {profile.services.length > 4 && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            +{profile.services.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="space-y-2 pt-2 border-t">
                      {profile.vendor.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <a href={`tel:${profile.vendor.phone}`} className="hover:text-primary">
                            {profile.vendor.phone}
                          </a>
                        </div>
                      )}
                      {profile.vendor.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />
                          <a
                            href={`mailto:${profile.vendor.email}`}
                            className="hover:text-primary truncate"
                          >
                            {profile.vendor.email}
                          </a>
                        </div>
                      )}
                      {profile.vendor.city && profile.vendor.state && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {profile.vendor.city}, {profile.vendor.state}
                        </div>
                      )}
                    </div>

                    {/* Availability */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        {profile.acceptingJobs ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            Accepting Jobs
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <AlertCircle className="w-3 h-3" />
                            Not Available
                          </span>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
                  <p className="text-gray-500">
                    {searchQuery || categoryFilter
                      ? 'Try adjusting your filters'
                      : 'No marketplace vendors are available yet'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-6">
          {isLoadingJobs ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-gray-500">Loading jobs...</div>
            </div>
          ) : (
            <>
              {/* Pending Action Jobs */}
              {jobsByStatus.pending.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Needs Attention ({jobsByStatus.pending.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {jobsByStatus.pending.map((job: any) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onApproveQuote={() => approveQuoteMutation.mutate(job.id)}
                        isApprovingQuote={approveQuoteMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Active Jobs */}
              {jobsByStatus.active.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    Active Jobs ({jobsByStatus.active.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {jobsByStatus.active.map((job: any) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onConfirm={() => confirmJobMutation.mutate(job.id)}
                        isConfirming={confirmJobMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Jobs */}
              {jobsByStatus.completed.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Completed ({jobsByStatus.completed.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {jobsByStatus.completed.slice(0, 6).map((job: any) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {jobsData?.data?.length === 0 && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No marketplace jobs yet
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Create a work order and dispatch it to the marketplace to get started
                      </p>
                      <Button variant="outline" asChild>
                        <a href="/work-orders">Go to Work Orders</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          {services && services.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {SERVICE_CATEGORIES.map((category) => {
                const categoryServices = services.filter((s: any) => s.category === category.value);
                if (categoryServices.length === 0) {
                  return null;
                }

                return (
                  <Card key={category.value}>
                    <CardHeader>
                      <CardTitle className="text-lg">{category.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {categoryServices.map((service: any) => (
                          <div
                            key={service.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-sm">{service.name}</p>
                              {service.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                  {service.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-green-600">
                                ${Number(service.typicalTotalMin).toFixed(0)} - $
                                {Number(service.typicalTotalMax).toFixed(0)}
                              </p>
                              {service.standardQuoteFee && (
                                <p className="text-xs text-gray-500">
                                  Quote fee: ${Number(service.standardQuoteFee).toFixed(0)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No services in catalog</h3>
                  <p className="text-gray-500">Service catalog is being populated</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Top Vendors Section */}
      {stats?.topVendors && stats.topVendors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Your Top Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {stats.topVendors.map((vendor: any, index: number) => (
                <div key={vendor.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{vendor.companyName}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {vendor.averageRating ? Number(vendor.averageRating).toFixed(1) : 'N/A'}
                      </span>
                      <span>|</span>
                      <span>{vendor.jobsCompleted} jobs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Job Card Component
function JobCard({
  job,
  onConfirm,
  onApproveQuote,
  isConfirming,
  isApprovingQuote,
}: {
  job: any;
  onConfirm?: () => void;
  onApproveQuote?: () => void;
  isConfirming?: boolean;
  isApprovingQuote?: boolean;
}) {
  const statusInfo = JOB_STATUS_LABELS[job.status] || {
    label: job.status,
    color: 'bg-gray-100 text-gray-700',
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">{job.workOrder?.title || 'Work Order'}</p>
              {job.workOrder?.property && (
                <p className="text-sm text-gray-500">
                  {job.workOrder.property.name}
                  {job.workOrder.unit && ` - Unit ${job.workOrder.unit.unitNumber}`}
                </p>
              )}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Vendor */}
          {job.vendorProfile && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{job.vendorProfile.vendor.companyName}</span>
            </div>
          )}

          {/* Service */}
          {job.serviceCatalog && (
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="w-4 h-4 text-gray-400" />
              <span>{job.serviceCatalog.name}</span>
            </div>
          )}

          {/* Cost */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{job.actualTotal ? 'Final Cost' : 'Estimated'}</span>
            <span className="font-semibold text-green-600">
              ${Number(job.actualTotal || job.estimatedTotal || 0).toFixed(2)}
            </span>
          </div>

          {/* Actions */}
          {job.status === 'COMPLETED' && onConfirm && (
            <Button size="sm" className="w-full" onClick={onConfirm} disabled={isConfirming}>
              {isConfirming ? 'Confirming...' : 'Confirm & Release Payment'}
            </Button>
          )}

          {job.status === 'QUOTE_SUBMITTED' && onApproveQuote && (
            <Button
              size="sm"
              className="w-full"
              onClick={onApproveQuote}
              disabled={isApprovingQuote}
            >
              {isApprovingQuote ? 'Approving...' : 'Approve Quote'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
