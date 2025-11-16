import { useQuery } from '@tanstack/react-query';
import { Users, Mail, Phone } from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function VendorsPage() {
  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await api.get('/vendors');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-500 mt-1">Manage your vendor directory</p>
        </div>
        <Button>
          <Users className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {vendors && vendors.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor: any) => (
            <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="text-lg">{vendor.companyName}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    vendor.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    vendor.status === 'SUSPENDED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {vendor.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">{vendor.type?.replace('_', ' ')}</span>
                  </div>
                  {vendor.contactName && (
                    <div className="text-sm text-gray-600">{vendor.contactName}</div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${vendor.email}`} className="hover:text-primary">
                        {vendor.email}
                      </a>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${vendor.phone}`} className="hover:text-primary">
                        {vendor.phone}
                      </a>
                    </div>
                  )}
                  {vendor.paymentTerms && (
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Payment Terms: {vendor.paymentTerms}
                    </div>
                  )}
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors yet</h3>
              <p className="text-gray-500 mb-6">Add vendors to manage your service providers</p>
              <Button>
                <Users className="w-4 h-4 mr-2" />
                Add Your First Vendor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
