import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Loader2,
  Home,
  Briefcase,
  MapPin,
  X,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';

// Use backend proxy to avoid CORS issues with Nominatim

interface AddPropertyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AddressSuggestion {
  display_name: string;
  place_id?: string;  // Google Places ID for fetching details
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
  type?: string;
  class?: string;
}

type Step = 'address' | 'details' | 'manual';

const PROPERTY_TYPES = [
  { value: 'MULTIFAMILY', label: 'Multifamily', icon: Building2 },
  { value: 'SINGLE_FAMILY', label: 'Single Family', icon: Home },
  { value: 'COMMERCIAL', label: 'Commercial', icon: Briefcase },
  { value: 'MIXED_USE', label: 'Mixed Use', icon: Building2 },
];

export default function AddPropertyModal({ open, onOpenChange }: AddPropertyModalProps) {
  const queryClient = useQueryClient();

  // Step state
  const [step, setStep] = useState<Step>('address');

  // Address search state
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Form data
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [propertyName, setPropertyName] = useState('');
  const [propertyType, setPropertyType] = useState('MULTIFAMILY');
  const [totalUnits, setTotalUnits] = useState('1');
  const [showOptional, setShowOptional] = useState(false);
  const [yearBuilt, setYearBuilt] = useState('');
  const [squareFeet, setSquareFeet] = useState('');

  // Manual address entry fields
  const [manualAddress, setManualAddress] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualZip, setManualZip] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('address');
      setAddressQuery('');
      setSuggestions([]);
      setSelectedAddress(null);
      setPropertyName('');
      setPropertyType('MULTIFAMILY');
      setTotalUnits('1');
      setShowOptional(false);
      setYearBuilt('');
      setSquareFeet('');
      setManualAddress('');
      setManualCity('');
      setManualState('');
      setManualZip('');
      setErrors({});
      setTouched({});
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

  // Search error state
  const [searchError, setSearchError] = useState<string | null>(null);

  // Address search via backend proxy (avoids CORS issues)
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await api.get('/properties/address/search', {
        params: { q: query },
      });
      console.log('Address search response:', response.data);

      if (response.data.error) {
        setSearchError(response.data.error);
        setSuggestions([]);
      } else {
        const data = response.data.data || [];
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch (error: any) {
      console.error('Address search failed:', error);
      setSearchError(error.response?.data?.message || error.message || 'Search failed');
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddressInput = (value: string) => {
    setAddressQuery(value);
    setSelectedAddress(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(value);
    }, 600); // Longer debounce to let user type more
  };

  const selectAddress = async (suggestion: AddressSuggestion) => {
    setShowSuggestions(false);
    setIsSearching(true);

    try {
      let fullAddress = suggestion;

      // If we have a place_id (Google), fetch full details
      if (suggestion.place_id) {
        const response = await api.get(`/properties/address/details/${suggestion.place_id}`);
        if (response.data.success && response.data.data) {
          fullAddress = response.data.data;
        }
      }

      setSelectedAddress(fullAddress);

      const addr = fullAddress.address;
      const street = addr.house_number && addr.road
        ? `${addr.house_number} ${addr.road}`
        : addr.road || '';
      const city = addr.city || addr.town || addr.village || '';

      // Auto-generate property name
      const autoName = street ? `${street}${city ? `, ${city}` : ''}` : fullAddress.display_name.split(',')[0];
      setPropertyName(autoName);

      // Smart type detection based on address hints
      const displayLower = fullAddress.display_name.toLowerCase();
      if (displayLower.includes('apartment') || displayLower.includes('apt')) {
        setPropertyType('MULTIFAMILY');
      } else if (displayLower.includes('office') || displayLower.includes('commercial') || displayLower.includes('plaza')) {
        setPropertyType('COMMERCIAL');
      } else if (displayLower.includes('house') || displayLower.includes('residence')) {
        setPropertyType('SINGLE_FAMILY');
      }

      // Move to details step
      setStep('details');
      setErrors({});
    } catch (error) {
      console.error('Failed to fetch address details:', error);
      // Still use the basic suggestion if details fetch fails
      setSelectedAddress(suggestion);
      setPropertyName(suggestion.display_name.split(',')[0]);
      setStep('details');
    } finally {
      setIsSearching(false);
    }
  };

  // Validation
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'propertyName':
        if (!value.trim()) return 'Property name is required';
        if (value.length < 3) return 'Name must be at least 3 characters';
        break;
      case 'totalUnits':
        const units = parseInt(value);
        if (!value || isNaN(units)) return 'Number of units is required';
        if (units < 1) return 'Must have at least 1 unit';
        if (units > 10000) return 'That seems like a lot of units!';
        break;
      case 'yearBuilt':
        if (value) {
          const year = parseInt(value);
          if (isNaN(year)) return 'Invalid year';
          if (year < 1800) return 'Year must be after 1800';
          if (year > new Date().getFullYear()) return 'Year cannot be in the future';
        }
        break;
      case 'squareFeet':
        if (value) {
          const sqft = parseInt(value);
          if (isNaN(sqft) || sqft < 0) return 'Invalid square footage';
        }
        break;
    }
    return '';
  };

  const handleBlur = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    newErrors.propertyName = validateField('propertyName', propertyName);
    newErrors.totalUnits = validateField('totalUnits', totalUnits);
    if (yearBuilt) newErrors.yearBuilt = validateField('yearBuilt', yearBuilt);
    if (squareFeet) newErrors.squareFeet = validateField('squareFeet', squareFeet);

    // Filter out empty errors
    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([, v]) => v !== '')
    );

    setErrors(filteredErrors);
    setTouched({ propertyName: true, totalUnits: true, yearBuilt: true, squareFeet: true });

    return Object.keys(filteredErrors).length === 0;
  };

  // Submit mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      let payload;

      if (step === 'manual') {
        // Manual entry mode
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
        // Autocomplete mode
        if (!selectedAddress) throw new Error('No address selected');

        const addr = selectedAddress.address;
        const street = addr.house_number && addr.road
          ? `${addr.house_number} ${addr.road}`
          : addr.road || '';
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
          totalUnits: parseInt(totalUnits),
          ...(yearBuilt && { yearBuilt: parseInt(yearBuilt) }),
          ...(squareFeet && { squareFeet: parseInt(squareFeet) }),
        };
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
      setErrors({
        submit: Array.isArray(message) ? message.join(', ') : message || 'Failed to create property',
      });
    },
  });

  const handleSubmit = () => {
    // For manual step, validation is done in mutation
    if (step === 'details' && !validateAll()) return;
    createMutation.mutate();
  };

  const getFormattedAddress = (suggestion: AddressSuggestion) => {
    const addr = suggestion.address;
    const street = addr.house_number && addr.road
      ? `${addr.house_number} ${addr.road}`
      : addr.road || '';
    const city = addr.city || addr.town || addr.village || '';
    const state = addr.state || '';
    return { street, city, state, zip: addr.postcode || '' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Add Property</h2>
              <p className="text-sm text-slate-400">
                {step === 'address' ? 'Start with the address' : step === 'manual' ? 'Enter address details' : 'Confirm details'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Address */}
          {step === 'address' && (
            <div className="space-y-4">
              <div className="relative" ref={suggestionsRef}>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={addressQuery}
                    onChange={(e) => handleAddressInput(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="e.g. 123 Main St, Boston MA"
                    className="w-full pl-12 pr-12 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    autoComplete="off"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 animate-spin" />
                  )}
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map((suggestion, index) => {
                      const { street, city, state, zip } = getFormattedAddress(suggestion);
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectAddress(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-slate-100 last:border-b-0 transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 group-hover:text-indigo-500" />
                            <div>
                              <div className="font-medium text-slate-900">{street || 'Address'}</div>
                              <div className="text-sm text-slate-500">
                                {[city, state, zip].filter(Boolean).join(', ')}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {addressQuery.length === 0 && (
                <p className="text-sm text-slate-500 text-center">
                  Include street number, city and state for best results
                </p>
              )}

              {addressQuery.length > 0 && addressQuery.length < 3 && (
                <p className="text-sm text-slate-500 text-center">
                  Keep typing...
                </p>
              )}

              {searchError && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-red-600">{searchError}</p>
                  <button
                    type="button"
                    onClick={() => setStep('manual')}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Enter address manually instead
                  </button>
                </div>
              )}

              {addressQuery.length >= 3 && !isSearching && !searchError && suggestions.length === 0 && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-slate-500">No addresses found.</p>
                  <button
                    type="button"
                    onClick={() => setStep('manual')}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Enter address manually
                  </button>
                </div>
              )}

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setStep('manual')}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Or enter address manually
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Details (after address autocomplete) */}
          {step === 'details' && selectedAddress && (
            <div className="space-y-5">
              {/* Selected address display */}
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">
                    {getFormattedAddress(selectedAddress).street}
                  </p>
                  <p className="text-sm text-green-700">
                    {[
                      getFormattedAddress(selectedAddress).city,
                      getFormattedAddress(selectedAddress).state,
                      getFormattedAddress(selectedAddress).zip,
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => setStep('address')}
                  className="text-sm text-green-700 hover:text-green-900 font-medium"
                >
                  Change
                </button>
              </div>

              {/* Property Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Property Name
                </label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => {
                    setPropertyName(e.target.value);
                    if (touched.propertyName) {
                      setErrors(prev => ({ ...prev, propertyName: validateField('propertyName', e.target.value) }));
                    }
                  }}
                  onBlur={() => handleBlur('propertyName', propertyName)}
                  placeholder="e.g. Sunset Apartments"
                  className={`w-full px-4 py-3 border-2 rounded-xl transition-colors focus:outline-none ${
                    errors.propertyName && touched.propertyName
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-slate-200 focus:border-indigo-500'
                  }`}
                />
                {errors.propertyName && touched.propertyName && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.propertyName}
                  </p>
                )}
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Property Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PROPERTY_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = propertyType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setPropertyType(type.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total Units */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Number of Units
                </label>
                <input
                  type="number"
                  min="1"
                  value={totalUnits}
                  onChange={(e) => {
                    setTotalUnits(e.target.value);
                    if (touched.totalUnits) {
                      setErrors(prev => ({ ...prev, totalUnits: validateField('totalUnits', e.target.value) }));
                    }
                  }}
                  onBlur={() => handleBlur('totalUnits', totalUnits)}
                  placeholder="1"
                  className={`w-full px-4 py-3 border-2 rounded-xl transition-colors focus:outline-none ${
                    errors.totalUnits && touched.totalUnits
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-slate-200 focus:border-indigo-500'
                  }`}
                />
                {errors.totalUnits && touched.totalUnits && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.totalUnits}
                  </p>
                )}
              </div>

              {/* Optional Details Toggle */}
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                {showOptional ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span>Additional details (optional)</span>
              </button>

              {/* Optional Fields */}
              {showOptional && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Year Built
                    </label>
                    <input
                      type="number"
                      value={yearBuilt}
                      onChange={(e) => setYearBuilt(e.target.value)}
                      onBlur={() => handleBlur('yearBuilt', yearBuilt)}
                      placeholder="e.g. 1995"
                      className={`w-full px-4 py-3 border-2 rounded-xl transition-colors focus:outline-none ${
                        errors.yearBuilt && touched.yearBuilt
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                    {errors.yearBuilt && touched.yearBuilt && (
                      <p className="mt-1 text-xs text-red-600">{errors.yearBuilt}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Square Feet
                    </label>
                    <input
                      type="number"
                      value={squareFeet}
                      onChange={(e) => setSquareFeet(e.target.value)}
                      onBlur={() => handleBlur('squareFeet', squareFeet)}
                      placeholder="e.g. 50000"
                      className={`w-full px-4 py-3 border-2 rounded-xl transition-colors focus:outline-none ${
                        errors.squareFeet && touched.squareFeet
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                    {errors.squareFeet && touched.squareFeet && (
                      <p className="mt-1 text-xs text-red-600">{errors.squareFeet}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Error */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.submit}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual Address Entry Step */}
          {step === 'manual' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                <button
                  type="button"
                  onClick={() => setStep('address')}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  ← Back to search
                </button>
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* City, State, Zip */}
              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    placeholder="New York"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    State *
                  </label>
                  <input
                    type="text"
                    value={manualState}
                    onChange={(e) => setManualState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="NY"
                    maxLength={2}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={manualZip}
                    onChange={(e) => setManualZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="10001"
                    maxLength={5}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Property Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="e.g. Sunset Apartments"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Property Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PROPERTY_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = propertyType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setPropertyType(type.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total Units */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Number of Units *
                </label>
                <input
                  type="number"
                  min="1"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(e.target.value)}
                  placeholder="1"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.submit}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'details' || step === 'manual') && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Property'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
