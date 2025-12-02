import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Loader2,
  Home,
  Briefcase,
  MapPin,
  X,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  DollarSign,
  Calendar,
  User,
  Mail,
  Phone,
  Hash,
  Bed,
  Bath,
} from 'lucide-react';
import api from '../../services/api';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';

interface AddPropertyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AddressSuggestion {
  display_name: string;
  place_id?: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
  latitude?: number;
  longitude?: number;
}

interface UnitData {
  id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  marketRent: number | null; // null = not set yet
  actualRent?: number | null; // what tenant actually pays (may differ from market)
  status: 'VACANT' | 'OCCUPIED';
  // Tenant info if occupied
  tenantFirstName?: string;
  tenantLastName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  leaseStart?: string;
  leaseEnd?: string;
  isMonthToMonth?: boolean;
}

type Step = 'address' | 'mode' | 'property-type' | 'units' | 'occupancy' | 'review' | 'manual';
type SetupMode = 'express' | 'advanced';

const PROPERTY_TYPES = [
  {
    value: 'SINGLE_FAMILY',
    label: 'Single Family',
    icon: Home,
    desc: 'House, townhome, or condo',
    defaultUnits: 1,
  },
  {
    value: 'MULTIFAMILY',
    label: 'Multifamily',
    icon: Building2,
    desc: 'Apartment building, duplex, triplex',
    defaultUnits: 4,
  },
  {
    value: 'COMMERCIAL',
    label: 'Commercial',
    icon: Briefcase,
    desc: 'Office, retail, or warehouse',
    defaultUnits: 1,
  },
];

const UNIT_TYPES: Record<number, string> = {
  0: 'STUDIO',
  1: 'ONE_BED',
  2: 'TWO_BED',
  3: 'THREE_BED',
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function AddPropertyModal({ open, onOpenChange }: AddPropertyModalProps) {
  const queryClient = useQueryClient();

  // Step state
  const [step, setStep] = useState<Step>('address');

  // Address state
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Manual address
  const [manualAddress, setManualAddress] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualZip, setManualZip] = useState('');

  // Property data
  const [propertyName, setPropertyName] = useState('');
  const [propertyType, setPropertyType] = useState('MULTIFAMILY');
  const [setupMode, setSetupMode] = useState<SetupMode>('advanced');

  // Units data
  const [units, setUnits] = useState<UnitData[]>([]);
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('address');
      setAddressQuery('');
      setSuggestions([]);
      setSelectedAddress(null);
      setPropertyName('');
      setPropertyType('MULTIFAMILY');
      setSetupMode('advanced');
      setUnits([]);
      setCurrentUnitIndex(0);
      setSkipUnits(false);
      setManualAddress('');
      setManualCity('');
      setManualState('');
      setManualZip('');
      setErrors({});
      setSearchError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Click outside suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Address search
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await api.get('/properties/address/search', { params: { q: query } });
      if (response.data.error) {
        setSearchError(response.data.error);
        setSuggestions([]);
      } else {
        setSuggestions(response.data.data || []);
        setShowSuggestions((response.data.data || []).length > 0);
      }
    } catch (error: any) {
      setSearchError(error.message || 'Search failed');
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddressInput = (value: string) => {
    setAddressQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => searchAddress(value), 500);
  };

  const selectAddress = async (suggestion: AddressSuggestion) => {
    setShowSuggestions(false);
    setIsSearching(true);
    try {
      let fullAddress = suggestion;
      if (suggestion.place_id) {
        const response = await api.get(`/properties/address/details/${suggestion.place_id}`);
        if (response.data.success) {
          fullAddress = response.data.data;
        }
      }
      setSelectedAddress(fullAddress);
      const addr = fullAddress.address;
      const street =
        addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : addr.road || '';
      const city = addr.city || addr.town || addr.village || '';
      setPropertyName(
        street ? `${street}${city ? `, ${city}` : ''}` : fullAddress.display_name.split(',')[0],
      );
      setStep('mode');
    } catch {
      setSelectedAddress(suggestion);
      setPropertyName(suggestion.display_name.split(',')[0]);
      setStep('mode');
    } finally {
      setIsSearching(false);
    }
  };

  // Skip units flag
  const [skipUnits, setSkipUnits] = useState(false);

  // Generate units based on property type
  const generateUnits = (count: number, type: string) => {
    const newUnits: UnitData[] = [];
    const isSingleFamily = type === 'SINGLE_FAMILY';

    for (let i = 0; i < count; i++) {
      newUnits.push({
        id: generateId(),
        unitNumber: isSingleFamily ? 'Main' : String(i + 1),
        bedrooms: isSingleFamily ? 3 : 1,
        bathrooms: isSingleFamily ? 2 : 1,
        marketRent: null, // Start with null - user can fill in or leave blank
        status: 'VACANT',
      });
    }
    setUnits(newUnits);
  };

  const selectMode = (mode: SetupMode) => {
    setSetupMode(mode);
    if (mode === 'express') {
      setSkipUnits(true);
      setStep('property-type');
    } else {
      setSkipUnits(false);
      setStep('property-type');
    }
  };

  const selectPropertyType = (type: string) => {
    setPropertyType(type);
    if (setupMode === 'express') {
      // Express mode: skip units, go straight to review
      setUnits([]);
      setStep('review');
    } else {
      // Advanced mode: configure units
      const config = PROPERTY_TYPES.find((t) => t.value === type);
      generateUnits(config?.defaultUnits || 1, type);
      setStep('units');
    }
  };

  // Unit management
  const addUnit = () => {
    const lastUnit = units[units.length - 1];
    const nextNumber = lastUnit
      ? String(parseInt(lastUnit.unitNumber) + 1 || units.length + 1)
      : '1';
    setUnits([
      ...units,
      {
        id: generateId(),
        unitNumber: nextNumber,
        bedrooms: 1,
        bathrooms: 1,
        marketRent: null,
        status: 'VACANT',
      },
    ]);
  };

  const removeUnit = (id: string) => {
    if (units.length > 1) {
      setUnits(units.filter((u) => u.id !== id));
    }
  };

  const updateUnit = (id: string, updates: Partial<UnitData>) => {
    setUnits(units.map((u) => (u.id === id ? { ...u, ...updates } : u)));
  };

  // Get formatted address
  const getFormattedAddress = (s: AddressSuggestion) => {
    const addr = s.address;
    const street =
      addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : addr.road || '';
    const city = addr.city || addr.town || addr.village || '';
    return { street, city, state: addr.state || '', zip: addr.postcode || '' };
  };

  // Stats
  const occupiedCount = units.filter((u) => u.status === 'OCCUPIED').length;
  const vacantCount = units.filter((u) => u.status === 'VACANT').length;
  const totalRent = units.reduce((sum, u) => {
    if (u.status === 'OCCUPIED') {
      return sum + (u.actualRent ?? u.marketRent ?? 0);
    }
    return sum;
  }, 0);
  const potentialRent = units.reduce((sum, u) => sum + (u.marketRent ?? 0), 0);
  const occupancyRate = units.length > 0 ? Math.round((occupiedCount / units.length) * 100) : 0;

  // Submit
  const createMutation = useMutation({
    mutationFn: async () => {
      const addr = selectedAddress?.address || {
        road: manualAddress,
        city: manualCity,
        state: manualState,
        postcode: manualZip,
      };
      const street =
        addr.house_number && addr.road
          ? `${addr.house_number} ${addr.road}`
          : addr.road || manualAddress;

      const payload = {
        name: propertyName,
        type: propertyType,
        address1: street,
        city: addr.city || addr.town || addr.village || manualCity,
        state: addr.state || manualState,
        zipCode: addr.postcode || manualZip,
        country: 'US',
        latitude: selectedAddress?.latitude,
        longitude: selectedAddress?.longitude,
        units: skipUnits
          ? []
          : units.map((u) => ({
              unitNumber: u.unitNumber,
              type: UNIT_TYPES[u.bedrooms] || (u.bedrooms >= 4 ? 'FOUR_PLUS_BED' : 'ONE_BED'),
              bedrooms: u.bedrooms,
              bathrooms: u.bathrooms,
              marketRent: u.marketRent ?? 0,
              status: u.status,
              ...(u.status === 'OCCUPIED' && u.tenantEmail
                ? {
                    leaseStart: u.leaseStart || new Date().toISOString().split('T')[0],
                    leaseEnd: u.isMonthToMonth ? undefined : u.leaseEnd,
                    isMonthToMonth: u.isMonthToMonth,
                    actualRent: u.actualRent ?? u.marketRent ?? 0,
                    securityDeposit: u.marketRent ?? 0,
                    tenant: {
                      firstName: u.tenantFirstName || 'Tenant',
                      lastName: u.tenantLastName || u.unitNumber,
                      email: u.tenantEmail,
                      phone: u.tenantPhone || '',
                    },
                  }
                : {}),
            })),
      };

      const response = await api.post('/properties/setup', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      setErrors({ submit: error.response?.data?.message || 'Failed to create property' });
    },
  });

  // Navigation
  const handleNext = () => {
    if (step === 'units') {
      if (skipUnits) {
        setStep('review');
      } else {
        setCurrentUnitIndex(0);
        setStep('occupancy');
      }
    } else if (step === 'occupancy') {
      if (currentUnitIndex < units.length - 1) {
        setCurrentUnitIndex(currentUnitIndex + 1);
      } else {
        setStep('review');
      }
    } else if (step === 'review') {
      createMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step === 'mode') {
      setStep('address');
    } else if (step === 'property-type') {
      setStep('mode');
    } else if (step === 'units') {
      setStep('property-type');
    } else if (step === 'occupancy') {
      if (currentUnitIndex > 0) {
        setCurrentUnitIndex(currentUnitIndex - 1);
      } else {
        setStep('units');
      }
    } else if (step === 'review') {
      if (setupMode === 'express') {
        setStep('property-type');
      } else if (skipUnits) {
        setStep('units');
      } else {
        setCurrentUnitIndex(units.length - 1);
        setStep('occupancy');
      }
    } else if (step === 'manual') {
      setStep('address');
    }
  };

  const currentUnit = units[currentUnitIndex];

  // Progress
  const getProgress = () => {
    if (step === 'address' || step === 'manual') {
      return 10;
    }
    if (step === 'mode') {
      return 25;
    }
    if (step === 'property-type') {
      return setupMode === 'express' ? 50 : 35;
    }
    if (step === 'units') {
      return 50;
    }
    if (step === 'occupancy') {
      return 55 + ((currentUnitIndex + 1) / units.length) * 35;
    }
    if (step === 'review') {
      return 95;
    }
    return 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Property Setup</h2>
                <p className="text-sm text-slate-400">
                  {step === 'address' && 'Step 1: Find property address'}
                  {step === 'mode' && 'Step 2: Choose setup mode'}
                  {step === 'property-type' &&
                    `Step 3: Property type${setupMode === 'express' ? ' (Express)' : ''}`}
                  {step === 'units' && 'Step 4: Configure units'}
                  {step === 'occupancy' &&
                    `Step 5: Unit ${currentUnitIndex + 1} of ${units.length} - Occupancy`}
                  {step === 'review' &&
                    (setupMode === 'express'
                      ? 'Final: Review & create'
                      : 'Step 6: Review & create')}
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP: Address */}
          {step === 'address' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Where is your property?</h3>
                <p className="text-slate-600">Start typing the address</p>
              </div>
              <div className="relative" ref={suggestionsRef}>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={addressQuery}
                    onChange={(e) => handleAddressInput(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="123 Main St, City, State"
                    className="w-full pl-12 pr-12 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 animate-spin" />
                  )}
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border rounded-xl shadow-xl overflow-hidden">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => selectAddress(s)}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b last:border-b-0"
                      >
                        <div className="font-medium">
                          {getFormattedAddress(s).street || s.display_name}
                        </div>
                        <div className="text-sm text-slate-500">
                          {[getFormattedAddress(s).city, getFormattedAddress(s).state]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {searchError && <p className="text-center text-red-600">{searchError}</p>}
              <div className="text-center">
                <button
                  onClick={() => setStep('manual')}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Enter address manually
                </button>
              </div>
            </div>
          )}

          {/* STEP: Manual Address */}
          {step === 'manual' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Enter Address</h3>
              <input
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Street Address"
                className="w-full px-4 py-3 border-2 rounded-xl"
              />
              <div className="grid grid-cols-6 gap-3">
                <input
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  placeholder="City"
                  className="col-span-3 px-4 py-3 border-2 rounded-xl"
                />
                <input
                  value={manualState}
                  onChange={(e) => setManualState(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="ST"
                  maxLength={2}
                  className="col-span-1 px-4 py-3 border-2 rounded-xl uppercase"
                />
                <input
                  value={manualZip}
                  onChange={(e) => setManualZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="ZIP"
                  maxLength={5}
                  className="col-span-2 px-4 py-3 border-2 rounded-xl"
                />
              </div>
              <input
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="Property Name"
                className="w-full px-4 py-3 border-2 rounded-xl"
              />
              <Button
                onClick={() => {
                  if (manualAddress && manualCity && manualState && manualZip && propertyName) {
                    setStep('mode');
                  }
                }}
                className="w-full bg-indigo-600 text-white"
              >
                Continue
              </Button>
            </div>
          )}

          {/* STEP: Mode Selection */}
          {step === 'mode' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  How would you like to set up?
                </h3>
                <p className="text-slate-600">
                  Choose based on how much detail you want to add now
                </p>
              </div>
              <div className="space-y-4">
                <button
                  onClick={() => selectMode('express')}
                  className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-slate-900">Express Setup</div>
                      <p className="text-slate-500 mt-1">
                        Just the basics — add units and tenants later
                      </p>
                      <ul className="mt-3 text-sm text-slate-600 space-y-1">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" /> Property address & name
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" /> Property type
                        </li>
                        <li className="flex items-center gap-2 text-slate-400">
                          <ArrowRight className="w-4 h-4" /> Add units later from property page
                        </li>
                      </ul>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => selectMode('advanced')}
                  className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-100 rounded-xl group-hover:bg-indigo-200 transition-colors">
                      <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-slate-900">Full Setup</div>
                      <p className="text-slate-500 mt-1">
                        Complete setup with units, occupancy & tenants
                      </p>
                      <ul className="mt-3 text-sm text-slate-600 space-y-1">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-indigo-500" /> Property address & name
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-indigo-500" /> Property type
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-indigo-500" /> Configure all units (beds,
                          baths, rent)
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-indigo-500" /> Set occupancy & tenant info
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-indigo-500" /> Auto-create leases for
                          occupied units
                        </li>
                      </ul>
                    </div>
                  </div>
                </button>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={() => setStep('address')}
                  className="text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to address
                </button>
              </div>
            </div>
          )}

          {/* STEP: Property Type */}
          {step === 'property-type' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  What type of property is this?
                </h3>
                <p className="text-slate-600">This helps us set up the right number of units</p>
              </div>
              <div className="space-y-3">
                {PROPERTY_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => selectPropertyType(type.value)}
                      className="w-full flex items-center gap-4 p-5 border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                    >
                      <div className="p-3 bg-slate-100 rounded-xl">
                        <Icon className="w-6 h-6 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-slate-900">{type.label}</div>
                        <div className="text-slate-500">{type.desc}</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP: Units Configuration */}
          {step === 'units' && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Configure Your Units</h3>
                <p className="text-slate-600">Set up units now or skip and add them later</p>
              </div>

              {/* Skip units option */}
              <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <input
                  type="checkbox"
                  id="skipUnits"
                  checked={skipUnits}
                  onChange={(e) => setSkipUnits(e.target.checked)}
                  className="rounded border-amber-300"
                />
                <label htmlFor="skipUnits" className="text-sm text-amber-800">
                  Skip unit setup for now — I'll add units later
                </label>
              </div>

              {!skipUnits && (
                <>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                    {units.map((unit) => (
                      <div
                        key={unit.id}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-slate-400" />
                            <input
                              value={unit.unitNumber}
                              onChange={(e) => updateUnit(unit.id, { unitNumber: e.target.value })}
                              className="w-20 px-2 py-1 border rounded font-medium"
                              placeholder="Unit #"
                            />
                          </div>
                          {units.length > 1 && (
                            <button
                              onClick={() => removeUnit(unit.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                              <Bed className="w-3 h-3" /> Beds
                            </label>
                            <select
                              value={unit.bedrooms}
                              onChange={(e) =>
                                updateUnit(unit.id, { bedrooms: parseInt(e.target.value) })
                              }
                              className="w-full px-2 py-2 border rounded"
                            >
                              <option value={0}>Studio</option>
                              <option value={1}>1 Bed</option>
                              <option value={2}>2 Bed</option>
                              <option value={3}>3 Bed</option>
                              <option value={4}>4+ Bed</option>
                            </select>
                          </div>
                          <div>
                            <label className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                              <Bath className="w-3 h-3" /> Baths
                            </label>
                            <select
                              value={unit.bathrooms}
                              onChange={(e) =>
                                updateUnit(unit.id, { bathrooms: parseFloat(e.target.value) })
                              }
                              className="w-full px-2 py-2 border rounded"
                            >
                              <option value={1}>1</option>
                              <option value={1.5}>1.5</option>
                              <option value={2}>2</option>
                              <option value={2.5}>2.5</option>
                              <option value={3}>3+</option>
                            </select>
                          </div>
                          <div>
                            <label className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                              <DollarSign className="w-3 h-3" /> Est. Rent
                            </label>
                            <input
                              type="number"
                              value={unit.marketRent ?? ''}
                              onChange={(e) =>
                                updateUnit(unit.id, {
                                  marketRent: e.target.value ? parseInt(e.target.value) : null,
                                })
                              }
                              placeholder="Optional"
                              className="w-full px-2 py-2 border rounded"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={addUnit}
                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Another Unit
                  </button>

                  <div className="bg-slate-100 rounded-xl p-4">
                    <div className="text-sm text-slate-600">
                      <strong>{units.length}</strong> unit{units.length !== 1 ? 's' : ''}
                      {potentialRent > 0 && (
                        <>
                          {' '}
                          • <strong>${potentialRent.toLocaleString()}</strong>/mo estimated rent
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Estimated rent is optional — you can update it anytime
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP: Occupancy for each unit */}
          {step === 'occupancy' && currentUnit && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  Unit {currentUnit.unitNumber}
                </h3>
                <p className="text-slate-600">
                  {currentUnit.bedrooms === 0 ? 'Studio' : `${currentUnit.bedrooms} bed`} •{' '}
                  {currentUnit.bathrooms} bath
                  {currentUnit.marketRent ? ` • $${currentUnit.marketRent}/mo est.` : ''}
                </p>
              </div>

              {/* Occupancy toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() =>
                    updateUnit(currentUnit.id, {
                      status: 'VACANT',
                      tenantEmail: undefined,
                      actualRent: undefined,
                    })
                  }
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${currentUnit.status === 'VACANT' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <Home
                    className={`w-8 h-8 ${currentUnit.status === 'VACANT' ? 'text-green-600' : 'text-slate-400'}`}
                  />
                  <span
                    className={`font-medium ${currentUnit.status === 'VACANT' ? 'text-green-700' : 'text-slate-600'}`}
                  >
                    Vacant
                  </span>
                  <span className="text-xs text-slate-500">Ready to rent</span>
                </button>
                <button
                  onClick={() =>
                    updateUnit(currentUnit.id, {
                      status: 'OCCUPIED',
                      actualRent: currentUnit.marketRent,
                    })
                  }
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${currentUnit.status === 'OCCUPIED' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <Users
                    className={`w-8 h-8 ${currentUnit.status === 'OCCUPIED' ? 'text-blue-600' : 'text-slate-400'}`}
                  />
                  <span
                    className={`font-medium ${currentUnit.status === 'OCCUPIED' ? 'text-blue-700' : 'text-slate-600'}`}
                  >
                    Occupied
                  </span>
                  <span className="text-xs text-slate-500">Has tenant</span>
                </button>
              </div>

              {/* Tenant info if occupied */}
              {currentUnit.status === 'OCCUPIED' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                    <User className="w-4 h-4" /> Tenant Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={currentUnit.tenantFirstName || ''}
                      onChange={(e) =>
                        updateUnit(currentUnit.id, { tenantFirstName: e.target.value })
                      }
                      placeholder="First Name"
                      className="px-3 py-2 border rounded-lg"
                    />
                    <input
                      value={currentUnit.tenantLastName || ''}
                      onChange={(e) =>
                        updateUnit(currentUnit.id, { tenantLastName: e.target.value })
                      }
                      placeholder="Last Name"
                      className="px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={currentUnit.tenantEmail || ''}
                      onChange={(e) => updateUnit(currentUnit.id, { tenantEmail: e.target.value })}
                      placeholder="Email"
                      type="email"
                      className="w-full pl-10 pr-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={currentUnit.tenantPhone || ''}
                      onChange={(e) => updateUnit(currentUnit.id, { tenantPhone: e.target.value })}
                      placeholder="Phone"
                      className="w-full pl-10 pr-3 py-2 border rounded-lg"
                    />
                  </div>

                  {/* Actual rent field */}
                  <div>
                    <label className="flex items-center gap-1 text-xs text-blue-700 mb-1">
                      <DollarSign className="w-3 h-3" /> Current Monthly Rent
                    </label>
                    <input
                      type="number"
                      value={currentUnit.actualRent ?? ''}
                      onChange={(e) =>
                        updateUnit(currentUnit.id, {
                          actualRent: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="What tenant pays monthly"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      Leave blank if same as estimated rent
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="mtm"
                      checked={currentUnit.isMonthToMonth || false}
                      onChange={(e) =>
                        updateUnit(currentUnit.id, { isMonthToMonth: e.target.checked })
                      }
                      className="rounded"
                    />
                    <label htmlFor="mtm" className="text-sm text-slate-700">
                      Month-to-month lease
                    </label>
                  </div>
                  {!currentUnit.isMonthToMonth && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                          <Calendar className="w-3 h-3" /> Lease Start
                        </label>
                        <input
                          type="date"
                          value={currentUnit.leaseStart || ''}
                          onChange={(e) =>
                            updateUnit(currentUnit.id, { leaseStart: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                          <Calendar className="w-3 h-3" /> Lease End
                        </label>
                        <input
                          type="date"
                          value={currentUnit.leaseEnd || ''}
                          onChange={(e) => updateUnit(currentUnit.id, { leaseEnd: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress indicator */}
              <div className="flex justify-center gap-1">
                {units.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${i === currentUnitIndex ? 'bg-indigo-500' : i < currentUnitIndex ? 'bg-green-500' : 'bg-slate-300'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* STEP: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Review Your Property</h3>
                <p className="text-slate-600">Everything looks good?</p>
              </div>

              {/* Property Summary */}
              <div className="bg-slate-50 rounded-xl p-5 space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Property</p>
                  <p className="text-xl font-bold text-slate-900">{propertyName}</p>
                  <p className="text-slate-600">
                    {selectedAddress ? getFormattedAddress(selectedAddress).street : manualAddress},
                    {selectedAddress
                      ? ` ${getFormattedAddress(selectedAddress).city}, ${getFormattedAddress(selectedAddress).state}`
                      : ` ${manualCity}, ${manualState}`}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {PROPERTY_TYPES.find((t) => t.value === propertyType)?.label}
                  </p>
                </div>

                {skipUnits ? (
                  <div className="pt-3 border-t">
                    <div className="text-center py-4 bg-amber-50 rounded-lg">
                      <p className="text-amber-800 font-medium">Units will be added later</p>
                      <p className="text-sm text-amber-600">
                        You can add units from the property details page
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-4 pt-3 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">{units.length}</p>
                        <p className="text-xs text-slate-500">Units</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{vacantCount}</p>
                        <p className="text-xs text-slate-500">Vacant</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{occupiedCount}</p>
                        <p className="text-xs text-slate-500">Occupied</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">{occupancyRate}%</p>
                        <p className="text-xs text-slate-500">Occupancy</p>
                      </div>
                    </div>

                    {(totalRent > 0 || potentialRent > 0) && (
                      <div className="pt-3 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Current Monthly Revenue</span>
                          <span className="text-xl font-bold text-green-600">
                            ${totalRent.toLocaleString()}
                          </span>
                        </div>
                        {potentialRent > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">
                              Estimated potential (if 100% occupied)
                            </span>
                            <span className="text-slate-600">
                              ${potentialRent.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Unit List */}
              {!skipUnits && units.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-700">Units</h4>
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {units.map((unit) => (
                      <div
                        key={unit.id}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-slate-900">Unit {unit.unitNumber}</span>
                          <span className="text-sm text-slate-500">
                            {unit.bedrooms === 0 ? 'Studio' : `${unit.bedrooms}BR`}/{unit.bathrooms}
                            BA
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {(unit.actualRent || unit.marketRent) && (
                            <span className="font-medium text-slate-700">
                              ${(unit.actualRent ?? unit.marketRent ?? 0).toLocaleString()}
                              {unit.status === 'OCCUPIED' && unit.actualRent ? '/mo' : ' est.'}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${unit.status === 'OCCUPIED' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}
                          >
                            {unit.status === 'OCCUPIED' && unit.tenantFirstName
                              ? `${unit.tenantFirstName} ${unit.tenantLastName}`
                              : unit.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {errors.submit}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'address' && step !== 'manual' && step !== 'mode' && (
          <div className="px-6 py-4 bg-slate-50 border-t flex justify-between">
            <Button variant="ghost" onClick={handleBack} disabled={createMutation.isPending}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
                </>
              ) : step === 'review' ? (
                <>
                  <Check className="w-4 h-4 mr-2" /> Create Property
                </>
              ) : (
                <>
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
