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
  Zap,
  Settings2,
  ArrowRight,
  ArrowLeft,
  Car,
  Waves,
  Dumbbell,
  Wind,
  Flame,
  Wifi,
  Dog,
  Droplets,
  Trash2,
  Calendar,
  Ruler,
  Layers,
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
    country?: string;
  };
  latitude?: number;
  longitude?: number;
}

type WizardMode = 'express' | 'advanced';
type Step = 'address' | 'mode' | 'express-details' | 'adv-basics' | 'adv-building' | 'adv-amenities' | 'adv-review' | 'manual';

const PROPERTY_TYPES = [
  { value: 'MULTIFAMILY', label: 'Multifamily', icon: Building2, desc: 'Apartments, condos' },
  { value: 'SINGLE_FAMILY', label: 'Single Family', icon: Home, desc: 'Houses, townhomes' },
  { value: 'COMMERCIAL', label: 'Commercial', icon: Briefcase, desc: 'Office, retail' },
  { value: 'MIXED_USE', label: 'Mixed Use', icon: Building2, desc: 'Residential + commercial' },
];

const AMENITIES = [
  { id: 'pool', label: 'Pool', icon: Waves },
  { id: 'gym', label: 'Fitness Center', icon: Dumbbell },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'ac', label: 'Central A/C', icon: Wind },
  { id: 'heating', label: 'Heating', icon: Flame },
  { id: 'wifi', label: 'WiFi Included', icon: Wifi },
  { id: 'petFriendly', label: 'Pet Friendly', icon: Dog },
  { id: 'waterIncluded', label: 'Water Included', icon: Droplets },
  { id: 'trashIncluded', label: 'Trash Included', icon: Trash2 },
];

const STEP_TITLES: Record<Step, string> = {
  address: 'Find Your Property',
  mode: 'How Much Detail?',
  'express-details': 'Quick Details',
  'adv-basics': 'Property Basics',
  'adv-building': 'Building Details',
  'adv-amenities': 'Amenities',
  'adv-review': 'Review & Create',
  manual: 'Enter Address',
};

export default function AddPropertyModal({ open, onOpenChange }: AddPropertyModalProps) {
  const queryClient = useQueryClient();

  // Step & mode state
  const [step, setStep] = useState<Step>('address');
  const [mode, setMode] = useState<WizardMode | null>(null);

  // Address search state
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Form data
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [propertyName, setPropertyName] = useState('');
  const [propertyType, setPropertyType] = useState('MULTIFAMILY');
  const [totalUnits, setTotalUnits] = useState('1');
  const [yearBuilt, setYearBuilt] = useState('');
  const [squareFeet, setSquareFeet] = useState('');
  const [floors, setFloors] = useState('');
  const [parkingSpaces, setParkingSpaces] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);

  // Manual address entry
  const [manualAddress, setManualAddress] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualZip, setManualZip] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate progress
  const getProgress = (): number => {
    if (step === 'address' || step === 'manual') return 20;
    if (step === 'mode') return 40;
    if (step === 'express-details') return 80;
    if (step === 'adv-basics') return 50;
    if (step === 'adv-building') return 65;
    if (step === 'adv-amenities') return 80;
    if (step === 'adv-review') return 95;
    return 0;
  };

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('address');
      setMode(null);
      setAddressQuery('');
      setSuggestions([]);
      setSelectedAddress(null);
      setPropertyName('');
      setPropertyType('MULTIFAMILY');
      setTotalUnits('1');
      setYearBuilt('');
      setSquareFeet('');
      setFloors('');
      setParkingSpaces('');
      setAmenities([]);
      setManualAddress('');
      setManualCity('');
      setManualState('');
      setManualZip('');
      setErrors({});
      setSearchError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Click outside to close suggestions
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
      setSearchError(error.response?.data?.message || error.message || 'Search failed');
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddressInput = (value: string) => {
    setAddressQuery(value);
    setSelectedAddress(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchAddress(value), 500);
  };

  const selectAddress = async (suggestion: AddressSuggestion) => {
    setShowSuggestions(false);
    setIsSearching(true);

    try {
      let fullAddress = suggestion;
      if (suggestion.place_id) {
        const response = await api.get(`/properties/address/details/${suggestion.place_id}`);
        if (response.data.success && response.data.data) {
          fullAddress = response.data.data;
        }
      }

      setSelectedAddress(fullAddress);
      const addr = fullAddress.address;
      const street = addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : addr.road || '';
      const city = addr.city || addr.town || addr.village || '';
      setPropertyName(street ? `${street}${city ? `, ${city}` : ''}` : fullAddress.display_name.split(',')[0]);

      // Smart type detection
      const displayLower = fullAddress.display_name.toLowerCase();
      if (displayLower.includes('apartment') || displayLower.includes('apt')) setPropertyType('MULTIFAMILY');
      else if (displayLower.includes('office') || displayLower.includes('commercial')) setPropertyType('COMMERCIAL');
      else if (displayLower.includes('house')) setPropertyType('SINGLE_FAMILY');

      setStep('mode');
    } catch {
      setSelectedAddress(suggestion);
      setPropertyName(suggestion.display_name.split(',')[0]);
      setStep('mode');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleAmenity = (id: string) => {
    setAmenities(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  // Submit mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      let payload: any;

      if (step === 'manual' || (mode === 'express' && !selectedAddress)) {
        if (!manualAddress.trim() || !manualCity.trim() || !manualState.trim() || !manualZip.trim() || !propertyName.trim()) {
          throw new Error('Please fill in all required fields');
        }
        payload = {
          name: propertyName.trim(),
          type: propertyType,
          status: 'ACTIVE',
          address1: manualAddress.trim(),
          city: manualCity.trim(),
          state: manualState.toUpperCase(),
          zipCode: manualZip.trim(),
          country: 'US',
          totalUnits: parseInt(totalUnits) || 1,
        };
      } else {
        if (!selectedAddress) throw new Error('No address selected');
        const addr = selectedAddress.address;
        const street = addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : addr.road || '';
        const city = addr.city || addr.town || addr.village || '';
        const state = addr.state || '';
        const stateAbbr = state.length > 2 ? state.substring(0, 2).toUpperCase() : state.toUpperCase();

        payload = {
          name: propertyName.trim(),
          type: propertyType,
          status: 'ACTIVE',
          address1: street,
          city,
          state: stateAbbr,
          zipCode: addr.postcode || '',
          country: 'US',
          totalUnits: parseInt(totalUnits) || 1,
          ...(yearBuilt && { yearBuilt: parseInt(yearBuilt) }),
          ...(squareFeet && { squareFeet: parseInt(squareFeet) }),
          ...(selectedAddress.latitude && { latitude: selectedAddress.latitude }),
          ...(selectedAddress.longitude && { longitude: selectedAddress.longitude }),
        };

        // Store amenities in settings if advanced mode
        if (mode === 'advanced' && amenities.length > 0) {
          payload.settings = { amenities, floors: floors ? parseInt(floors) : null, parkingSpaces: parkingSpaces ? parseInt(parkingSpaces) : null };
        }
      }

      const response = await api.post('/properties', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message;
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message || 'Failed to create property' });
    },
  });

  const handleNext = () => {
    if (step === 'express-details' || step === 'adv-review') {
      createMutation.mutate();
    } else if (step === 'adv-basics') {
      setStep('adv-building');
    } else if (step === 'adv-building') {
      setStep('adv-amenities');
    } else if (step === 'adv-amenities') {
      setStep('adv-review');
    }
  };

  const handleBack = () => {
    if (step === 'mode') setStep('address');
    else if (step === 'express-details' || step === 'adv-basics') setStep('mode');
    else if (step === 'adv-building') setStep('adv-basics');
    else if (step === 'adv-amenities') setStep('adv-building');
    else if (step === 'adv-review') setStep('adv-amenities');
    else if (step === 'manual') setStep('address');
  };

  const selectMode = (m: WizardMode) => {
    setMode(m);
    setStep(m === 'express' ? 'express-details' : 'adv-basics');
  };

  const getFormattedAddress = (s: AddressSuggestion) => {
    const addr = s.address;
    const street = addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : addr.road || '';
    const city = addr.city || addr.town || addr.village || '';
    return { street, city, state: addr.state || '', zip: addr.postcode || '' };
  };

  const canProceed = () => {
    if (step === 'express-details') return propertyName.trim().length >= 3 && parseInt(totalUnits) >= 1;
    if (step === 'adv-basics') return propertyName.trim().length >= 3;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header with Progress */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Add Property</h2>
                <p className="text-sm text-slate-400">{STEP_TITLES[step]}</p>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Address */}
          {step === 'address' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Where is your property?</h3>
                <p className="text-slate-600">Start typing the address and we'll find it for you</p>
              </div>

              <div className="relative" ref={suggestionsRef}>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={addressQuery}
                    onChange={(e) => handleAddressInput(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="e.g. 123 Main St, Boston MA"
                    className="w-full pl-14 pr-14 py-5 text-xl border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:outline-none transition-colors"
                    autoComplete="off"
                  />
                  {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-500 animate-spin" />}
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                    {suggestions.map((suggestion, index) => {
                      const { street, city, state, zip } = getFormattedAddress(suggestion);
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectAddress(suggestion)}
                          className="w-full text-left px-5 py-4 hover:bg-indigo-50 border-b border-slate-100 last:border-b-0 transition-colors group"
                        >
                          <div className="flex items-start gap-4">
                            <MapPin className="w-5 h-5 text-slate-400 mt-0.5 group-hover:text-indigo-500" />
                            <div>
                              <div className="font-semibold text-slate-900 text-lg">{street || 'Address'}</div>
                              <div className="text-slate-500">{[city, state, zip].filter(Boolean).join(', ')}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {addressQuery.length === 0 && (
                <p className="text-center text-slate-500">Include street number, city and state for best results</p>
              )}

              {searchError && (
                <div className="text-center space-y-3">
                  <p className="text-red-600">{searchError}</p>
                  <button onClick={() => setStep('manual')} className="text-indigo-600 hover:text-indigo-800 font-medium">
                    Enter address manually instead →
                  </button>
                </div>
              )}

              <div className="text-center pt-4">
                <button onClick={() => setStep('manual')} className="text-slate-500 hover:text-slate-700">
                  Or enter address manually
                </button>
              </div>
            </div>
          )}

          {/* Step: Mode Selection */}
          {step === 'mode' && selectedAddress && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">How much detail do you want to add?</h3>
                <p className="text-slate-600">You can always add more later</p>
              </div>

              {/* Selected address display */}
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-8">
                <Check className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">{getFormattedAddress(selectedAddress).street}</p>
                  <p className="text-sm text-green-700">
                    {[getFormattedAddress(selectedAddress).city, getFormattedAddress(selectedAddress).state, getFormattedAddress(selectedAddress).zip].filter(Boolean).join(', ')}
                  </p>
                </div>
                <button onClick={() => setStep('address')} className="text-sm text-green-700 hover:text-green-900 font-medium">Change</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Express Option */}
                <button
                  onClick={() => selectMode('express')}
                  className="group p-6 border-2 border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors">
                      <Zap className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">Express</h4>
                      <p className="text-sm text-slate-500">~30 seconds</p>
                    </div>
                  </div>
                  <p className="text-slate-600">Just the essentials: name, type, and unit count. Get started fast.</p>
                </button>

                {/* Advanced Option */}
                <button
                  onClick={() => selectMode('advanced')}
                  className="group p-6 border-2 border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-indigo-100 rounded-xl group-hover:bg-indigo-200 transition-colors">
                      <Settings2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">Advanced</h4>
                      <p className="text-sm text-slate-500">~2 minutes</p>
                    </div>
                  </div>
                  <p className="text-slate-600">Full setup: building details, amenities, and more for complete listings.</p>
                </button>
              </div>
            </div>
          )}

          {/* Step: Express Details */}
          {step === 'express-details' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Almost there!</h3>
                <p className="text-slate-600">Just a few quick details</p>
              </div>

              {/* Property Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Property Name</label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="e.g. Sunset Apartments"
                  className="w-full px-5 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">What type of property is this?</label>
                <div className="grid grid-cols-2 gap-3">
                  {PROPERTY_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = propertyType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setPropertyType(type.value)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                        </div>
                        <div>
                          <div className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>{type.label}</div>
                          <div className="text-sm text-slate-500">{type.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total Units */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">How many units?</label>
                <input
                  type="number"
                  min="1"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(e.target.value)}
                  className="w-full px-5 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errors.submit}</p>
                </div>
              )}
            </div>
          )}

          {/* Step: Advanced - Basics */}
          {step === 'adv-basics' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Let's start with the basics</h3>
                <p className="text-slate-600">Property name and type</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Property Name</label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="e.g. Sunset Apartments"
                  className="w-full px-5 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Property Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {PROPERTY_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = propertyType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setPropertyType(type.value)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                        </div>
                        <div>
                          <div className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>{type.label}</div>
                          <div className="text-sm text-slate-500">{type.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Total Units</label>
                <input
                  type="number"
                  min="1"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(e.target.value)}
                  className="w-full px-5 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Step: Advanced - Building Details */}
          {step === 'adv-building' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Building Details</h3>
                <p className="text-slate-600">Help tenants know what to expect</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <Calendar className="w-4 h-4" /> Year Built
                  </label>
                  <input
                    type="number"
                    value={yearBuilt}
                    onChange={(e) => setYearBuilt(e.target.value)}
                    placeholder="e.g. 1995"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <Ruler className="w-4 h-4" /> Square Feet
                  </label>
                  <input
                    type="number"
                    value={squareFeet}
                    onChange={(e) => setSquareFeet(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <Layers className="w-4 h-4" /> Number of Floors
                  </label>
                  <input
                    type="number"
                    value={floors}
                    onChange={(e) => setFloors(e.target.value)}
                    placeholder="e.g. 3"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <Car className="w-4 h-4" /> Parking Spaces
                  </label>
                  <input
                    type="number"
                    value={parkingSpaces}
                    onChange={(e) => setParkingSpaces(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Advanced - Amenities */}
          {step === 'adv-amenities' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">What amenities are available?</h3>
                <p className="text-slate-600">Select all that apply</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {AMENITIES.map((amenity) => {
                  const Icon = amenity.icon;
                  const isSelected = amenities.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{amenity.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Advanced - Review */}
          {step === 'adv-review' && selectedAddress && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Review Your Property</h3>
                <p className="text-slate-600">Make sure everything looks good</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-500">Property Name</p>
                    <p className="text-lg font-semibold text-slate-900">{propertyName}</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                    {PROPERTY_TYPES.find(t => t.value === propertyType)?.label}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Address</p>
                  <p className="text-slate-900">{getFormattedAddress(selectedAddress).street}</p>
                  <p className="text-slate-600">{[getFormattedAddress(selectedAddress).city, getFormattedAddress(selectedAddress).state, getFormattedAddress(selectedAddress).zip].filter(Boolean).join(', ')}</p>
                </div>

                <div className="grid grid-cols-4 gap-4 pt-2">
                  <div>
                    <p className="text-sm text-slate-500">Units</p>
                    <p className="font-semibold text-slate-900">{totalUnits}</p>
                  </div>
                  {yearBuilt && (
                    <div>
                      <p className="text-sm text-slate-500">Year Built</p>
                      <p className="font-semibold text-slate-900">{yearBuilt}</p>
                    </div>
                  )}
                  {squareFeet && (
                    <div>
                      <p className="text-sm text-slate-500">Sq Ft</p>
                      <p className="font-semibold text-slate-900">{parseInt(squareFeet).toLocaleString()}</p>
                    </div>
                  )}
                  {floors && (
                    <div>
                      <p className="text-sm text-slate-500">Floors</p>
                      <p className="font-semibold text-slate-900">{floors}</p>
                    </div>
                  )}
                </div>

                {amenities.length > 0 && (
                  <div className="pt-2">
                    <p className="text-sm text-slate-500 mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {amenities.map(id => {
                        const amenity = AMENITIES.find(a => a.id === id);
                        return amenity ? (
                          <span key={id} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-700">
                            {amenity.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errors.submit}</p>
                </div>
              )}
            </div>
          )}

          {/* Step: Manual Address */}
          {step === 'manual' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Enter Address Manually</h3>
                <p className="text-slate-600">Fill in the property details</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Street Address</label>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-3">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
                  <input
                    type="text"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    placeholder="New York"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">State</label>
                  <input
                    type="text"
                    value={manualState}
                    onChange={(e) => setManualState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="NY"
                    maxLength={2}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={manualZip}
                    onChange={(e) => setManualZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="10001"
                    maxLength={5}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Property Name</label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="e.g. Sunset Apartments"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Property Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {PROPERTY_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = propertyType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setPropertyType(type.value)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                        <span className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Units</label>
                <input
                  type="number"
                  min="1"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errors.submit}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'address' && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between">
            <Button variant="ghost" onClick={handleBack} disabled={createMutation.isPending}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            {(step === 'express-details' || step === 'adv-review' || step === 'manual') ? (
              <Button
                onClick={step === 'manual' ? () => createMutation.mutate() : handleNext}
                disabled={createMutation.isPending || !canProceed()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Check className="w-4 h-4 mr-2" /> Create Property</>
                )}
              </Button>
            ) : step !== 'mode' ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
