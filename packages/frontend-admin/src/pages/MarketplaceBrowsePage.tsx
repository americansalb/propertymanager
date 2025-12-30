import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Store,
  Star,
  MapPin,
  Phone,
  Mail,
  Shield,
  Search,
  Filter,
  CheckCircle,
  Award,
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

const SERVICE_CATEGORIES = [
  { value: '', label: 'All Services' },
  { value: 'LOCKSMITH', label: 'Locksmith' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'APPLIANCE_REPAIR', label: 'Appliance Repair' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'LANDSCAPING', label: 'Landscaping' },
  { value: 'PEST_CONTROL', label: 'Pest Control' },
];

export default function MarketplaceBrowsePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Fetch marketplace vendors (no auth required)
  const { data: vendors, isLoading } = useQuery({
    queryKey: ['marketplace-vendors-public', categoryFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (categoryFilter) {
          params.append('category', categoryFilter);
        }
        params.append('acceptingOnly', 'true'); // Only show vendors accepting jobs
        const response = await api.get(`/marketplace/vendors/browse?${params.toString()}`);
        return response.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const filteredVendors = vendors?.filter((vendor: any) => {
    if (!searchQuery) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return (
      vendor.vendor?.companyName?.toLowerCase().includes(query) ||
      vendor.vendor?.city?.toLowerCase().includes(query) ||
      vendor.vendor?.state?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PropertyManager</h1>
                <p className="text-sm text-gray-500">Vendor Marketplace</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/vendor-register')}>
                <Store className="w-4 h-4 mr-2" />
                Become a Vendor
              </Button>
              <Button onClick={() => navigate('/login')}>Sign In</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl font-bold text-gray-900">Browse Verified Vendors</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find trusted, verified service providers for your property management needs
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by company name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-64">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by service" />
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
        </div>

        {/* Results Count */}
        {!isLoading && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600">
              {filteredVendors?.length || 0} vendor{filteredVendors?.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}

        {/* Vendor Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading vendors...</p>
          </div>
        ) : filteredVendors && filteredVendors.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map((profile: any) => {
              const vendor = profile.vendor;
              if (!vendor) {
                return null;
              }

              return (
                <Card
                  key={profile.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    // TODO: Navigate to vendor detail page
                  }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {vendor.companyName}
                          </h3>
                        </div>
                        {vendor.type && (
                          <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded mt-1 inline-block">
                            {vendor.type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      {profile.averageRating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-gray-900">
                            {Number(profile.averageRating).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Location */}
                    {vendor.city && vendor.state && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {vendor.city}, {vendor.state}
                        </span>
                      </div>
                    )}

                    {/* Contact */}
                    <div className="space-y-2">
                      {vendor.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{vendor.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Service Area */}
                    {profile.serviceRadius && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>Services within {profile.serviceRadius} miles</span>
                      </div>
                    )}

                    {/* Credentials */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      {profile.insuranceVerified && (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                          <Shield className="w-3 h-3" />
                          Insured
                        </span>
                      )}
                      {profile.licenseVerified && (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          <CheckCircle className="w-3 h-3" />
                          Licensed
                        </span>
                      )}
                      {profile.backgroundCheckStatus === 'VERIFIED' && (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          <Award className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    {profile.totalJobsCompleted > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{profile.totalJobsCompleted} jobs completed</span>
                        </div>
                      </div>
                    )}

                    {/* Tier Badge */}
                    {profile.tier === 'PREMIUM' && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-amber-700">Premium Vendor</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No vendors found</h3>
              <p className="text-gray-600">
                Try adjusting your search or filters. Or{' '}
                <button
                  onClick={() => navigate('/vendor-register')}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  become the first vendor
                </button>{' '}
                in your area!
              </p>
            </CardContent>
          </Card>
        )}

        {/* CTA Section */}
        <div className="mt-12">
          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold text-gray-900">Are you a service provider?</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Join our marketplace and connect with property managers who need your services.
                  Get more jobs and grow your business.
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate('/vendor-register')}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Store className="w-5 h-5 mr-2" />
                  Become a Vendor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <p>&copy; 2024 PropertyManager. All rights reserved.</p>
            <div className="flex gap-6">
              <button className="hover:text-indigo-600">Privacy Policy</button>
              <button className="hover:text-indigo-600">Terms of Service</button>
              <button className="hover:text-indigo-600">Support</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
