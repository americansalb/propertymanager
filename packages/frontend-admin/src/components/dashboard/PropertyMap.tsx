import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, Users, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom colored markers for different occupancy levels
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

const greenIcon = createColoredIcon('#22c55e'); // High occupancy (>= 90%)
const yellowIcon = createColoredIcon('#f59e0b'); // Medium occupancy (>= 70%)
const redIcon = createColoredIcon('#ef4444'); // Low occupancy (< 70%)
const grayIcon = createColoredIcon('#6b7280'); // No units

interface Property {
  id: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  units?: Array<{
    id: string;
    status: string;
  }>;
}

interface PropertyMapProps {
  properties: Property[];
}

// Component to fit map bounds to markers
function FitBounds({ properties }: { properties: Property[] }) {
  const map = useMap();

  useMemo(() => {
    const validProps = properties.filter((p) => p.latitude && p.longitude);
    if (validProps.length === 0) {
      return;
    }

    if (validProps.length === 1) {
      map.setView([validProps[0].latitude!, validProps[0].longitude!], 13);
    } else {
      const bounds = L.latLngBounds(
        validProps.map((p) => [p.latitude!, p.longitude!] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [properties, map]);

  return null;
}

export default function PropertyMap({ properties }: PropertyMapProps) {
  const propertiesWithCoords = useMemo(
    () => properties.filter((p) => p.latitude && p.longitude),
    [properties],
  );

  const getOccupancyRate = (property: Property) => {
    const units = property.units || [];
    if (units.length === 0) {
      return 0;
    }
    const occupied = units.filter(
      (u) => u.status === 'OCCUPIED' || u.status === 'VACANT_RENTED',
    ).length;
    return Math.round((occupied / units.length) * 100);
  };

  const getMarkerIcon = (property: Property) => {
    const units = property.units || [];
    if (units.length === 0) {
      return grayIcon;
    }

    const rate = getOccupancyRate(property);
    if (rate >= 90) {
      return greenIcon;
    }
    if (rate >= 70) {
      return yellowIcon;
    }
    return redIcon;
  };

  // Default center (US center) if no properties with coords
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const defaultZoom = 4;

  if (propertiesWithCoords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Property Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-gray-50 rounded-lg">
            <MapPin className="w-12 h-12 text-gray-300 mb-2" />
            <p className="text-sm">No properties with location data</p>
            <p className="text-xs text-gray-400 mt-1">
              Add properties with addresses to see them on the map
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Property Map
          </span>
          <div className="flex items-center gap-4 text-xs font-normal">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              &gt;90%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              70-90%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              &lt;70%
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 rounded-b-lg overflow-hidden">
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds properties={propertiesWithCoords} />
            {propertiesWithCoords.map((property) => {
              const occupancyRate = getOccupancyRate(property);
              const totalUnits = property.units?.length || 0;
              const occupiedUnits =
                property.units?.filter(
                  (u) => u.status === 'OCCUPIED' || u.status === 'VACANT_RENTED',
                ).length || 0;

              return (
                <Marker
                  key={property.id}
                  position={[property.latitude!, property.longitude!]}
                  icon={getMarkerIcon(property)}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {property.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {property.address1}, {property.city}, {property.state}
                      </p>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-gray-600">
                            <Users className="w-3 h-3" />
                            Occupancy
                          </span>
                          <span
                            className={`font-medium ${
                              occupancyRate >= 90
                                ? 'text-green-600'
                                : occupancyRate >= 70
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {occupancyRate}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {occupiedUnits} of {totalUnits} units occupied
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
