import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Users } from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function PropertiesPage() {
  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500 mt-1">Manage your property portfolio</p>
        </div>
        <Button>
          <Building2 className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {properties && properties.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property: any) => (
            <Card key={property.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="text-lg">{property.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    property.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {property.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{property.address1}, {property.city}, {property.state}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{property.totalUnits} units</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span>{property.type?.replace('_', ' ')}</span>
                  </div>
                  {property.yearBuilt && (
                    <div className="text-sm text-gray-500">
                      Built in {property.yearBuilt}
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
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
              <p className="text-gray-500 mb-6">Get started by adding your first property</p>
              <Button>
                <Building2 className="w-4 h-4 mr-2" />
                Add Your First Property
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
