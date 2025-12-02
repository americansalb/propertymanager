import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  FileCheck,
  Award,
  Key,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Clock,
  DollarSign,
  Users,
  Globe,
  Lock,
  Car,
  Home,
  Building,
  Wrench,
} from 'lucide-react';
import api from '../../services/api';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface AddMarketplaceVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'category' | 'business' | 'credentials' | 'insurance' | 'services' | 'review';

// Locksmith-specific services
const LOCKSMITH_SERVICES = [
  {
    id: 'residential_lockout',
    name: 'Residential Lockout',
    category: 'Emergency',
    icon: Home,
    typical: '$75-150',
  },
  {
    id: 'commercial_lockout',
    name: 'Commercial Lockout',
    category: 'Emergency',
    icon: Building,
    typical: '$100-200',
  },
  {
    id: 'automotive_lockout',
    name: 'Automotive Lockout',
    category: 'Emergency',
    icon: Car,
    typical: '$75-175',
  },
  {
    id: 'rekey_locks',
    name: 'Rekey Locks',
    category: 'Residential',
    icon: Key,
    typical: '$20-30/lock',
  },
  {
    id: 'lock_replacement',
    name: 'Lock Replacement',
    category: 'Residential',
    icon: Lock,
    typical: '$75-250',
  },
  {
    id: 'deadbolt_install',
    name: 'Deadbolt Installation',
    category: 'Residential',
    icon: Shield,
    typical: '$100-200',
  },
  {
    id: 'high_security_locks',
    name: 'High Security Locks',
    category: 'Commercial',
    icon: Shield,
    typical: '$150-400',
  },
  {
    id: 'master_key_system',
    name: 'Master Key System',
    category: 'Commercial',
    icon: Key,
    typical: '$200-500+',
  },
  {
    id: 'access_control',
    name: 'Access Control Systems',
    category: 'Commercial',
    icon: Lock,
    typical: '$500-2000+',
  },
  {
    id: 'key_duplication',
    name: 'Key Duplication',
    category: 'General',
    icon: Key,
    typical: '$3-25/key',
  },
  {
    id: 'safe_opening',
    name: 'Safe Opening/Repair',
    category: 'Specialty',
    icon: Lock,
    typical: '$150-400',
  },
  {
    id: 'ignition_repair',
    name: 'Ignition Repair/Replace',
    category: 'Automotive',
    icon: Car,
    typical: '$150-350',
  },
  {
    id: 'transponder_keys',
    name: 'Transponder Key Programming',
    category: 'Automotive',
    icon: Car,
    typical: '$100-300',
  },
];

// States that require locksmith licensing
const LICENSED_STATES = [
  'AL',
  'CA',
  'CT',
  'IL',
  'LA',
  'MD',
  'NC',
  'NJ',
  'NV',
  'OK',
  'OR',
  'TN',
  'TX',
  'VA',
];

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

interface FormData {
  // Business Info
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  website: string;
  yearsInBusiness: string;
  numberOfTechnicians: string;
  emergencyAvailable: boolean;

  // Credentials
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: string;
  alcaNumber: string; // Associated Locksmiths of America
  bondAmount: string;
  bondCompany: string;
  bondExpiry: string;
  backgroundCheckConsent: boolean;

  // Insurance
  insuranceCarrier: string;
  insurancePolicyNumber: string;
  insuranceCoverageAmount: string;
  insuranceExpiry: string;
  workersCompCarrier: string;
  workersCompPolicyNumber: string;
  workersCompExpiry: string;

  // Services
  selectedServices: string[];
  serviceRadius: string;
  serviceZipCodes: string;
  responseTime: string;

  // Pricing
  servicePricing: Record<string, { min: string; max: string }>;
}

const initialFormData: FormData = {
  companyName: '',
  contactFirstName: '',
  contactLastName: '',
  email: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zipCode: '',
  website: '',
  yearsInBusiness: '',
  numberOfTechnicians: '1',
  emergencyAvailable: true,

  licenseNumber: '',
  licenseState: '',
  licenseExpiry: '',
  alcaNumber: '',
  bondAmount: '',
  bondCompany: '',
  bondExpiry: '',
  backgroundCheckConsent: false,

  insuranceCarrier: '',
  insurancePolicyNumber: '',
  insuranceCoverageAmount: '',
  insuranceExpiry: '',
  workersCompCarrier: '',
  workersCompPolicyNumber: '',
  workersCompExpiry: '',

  selectedServices: [],
  serviceRadius: '25',
  serviceZipCodes: '',
  responseTime: '60',

  servicePricing: {},
};

export default function AddMarketplaceVendorModal({
  open,
  onOpenChange,
}: AddMarketplaceVendorModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('category');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLDivElement>(null);

  const requiresLicense = LICENSED_STATES.includes(formData.state);

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const toggleService = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter((id) => id !== serviceId)
        : [...prev.selectedServices, serviceId],
    }));
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'business':
        if (!formData.companyName.trim()) {
          newErrors.companyName = 'Company name is required';
        }
        if (!formData.contactFirstName.trim()) {
          newErrors.contactFirstName = 'First name is required';
        }
        if (!formData.contactLastName.trim()) {
          newErrors.contactLastName = 'Last name is required';
        }
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone is required';
        }
        if (!formData.address1.trim()) {
          newErrors.address1 = 'Address is required';
        }
        if (!formData.city.trim()) {
          newErrors.city = 'City is required';
        }
        if (!formData.state) {
          newErrors.state = 'State is required';
        }
        if (!formData.zipCode.trim()) {
          newErrors.zipCode = 'ZIP code is required';
        }
        if (!formData.yearsInBusiness) {
          newErrors.yearsInBusiness = 'Years in business is required';
        }
        break;

      case 'credentials':
        if (requiresLicense) {
          if (!formData.licenseNumber.trim()) {
            newErrors.licenseNumber = 'License number is required in your state';
          }
          if (!formData.licenseExpiry) {
            newErrors.licenseExpiry = 'License expiry date is required';
          }
        }
        if (!formData.backgroundCheckConsent) {
          newErrors.backgroundCheckConsent = 'Background check consent is required';
        }
        break;

      case 'insurance':
        if (!formData.insuranceCarrier.trim()) {
          newErrors.insuranceCarrier = 'Insurance carrier is required';
        }
        if (!formData.insurancePolicyNumber.trim()) {
          newErrors.insurancePolicyNumber = 'Policy number is required';
        }
        if (!formData.insuranceCoverageAmount.trim()) {
          newErrors.insuranceCoverageAmount = 'Coverage amount is required';
        }
        if (!formData.insuranceExpiry) {
          newErrors.insuranceExpiry = 'Insurance expiry date is required';
        }
        break;

      case 'services':
        if (formData.selectedServices.length === 0) {
          newErrors.selectedServices = 'Please select at least one service';
        }
        if (!formData.serviceRadius && !formData.serviceZipCodes.trim()) {
          newErrors.serviceArea = 'Please specify service radius or ZIP codes';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) {
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const steps: Step[] = [
      'category',
      'business',
      'credentials',
      'insurance',
      'services',
      'review',
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    const steps: Step[] = [
      'category',
      'business',
      'credentials',
      'insurance',
      'services',
      'review',
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const createVendorMutation = useMutation({
    mutationFn: async () => {
      // First create the vendor
      const vendorResponse = await api.post('/vendors', {
        companyName: formData.companyName,
        contactName: `${formData.contactFirstName} ${formData.contactLastName}`,
        email: formData.email,
        phone: formData.phone,
        address1: formData.address1,
        address2: formData.address2 || undefined,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        type: 'PROFESSIONAL_SERVICES', // Changed from 'LOCKSMITH' to valid enum value
        status: 'ACTIVE',
        licenseNumber: formData.licenseNumber || undefined,
        insuranceExpiryDate: formData.insuranceExpiry || undefined,
        // Note: Backend doesn't support insuranceProvider or insurancePolicyNumber fields
        // These fields are collected but not stored in the current vendor schema
      });

      const vendorId = vendorResponse.data.data.id;

      // Then create marketplace profile
      const profileResponse = await api.post('/marketplace/vendors', {
        vendorId,
        tier: 'STANDARD',
        isMarketplaceActive: true,
        acceptingJobs: true,
        serviceRadius: parseInt(formData.serviceRadius) || 25,
        serviceZipCodes: formData.serviceZipCodes
          ? formData.serviceZipCodes.split(',').map((z) => z.trim())
          : [],
        maxConcurrentJobs: 5,
      });

      return { vendor: vendorResponse.data, profile: profileResponse.data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-vendor-profiles'] });
      handleClose();
    },
  });

  const handleSubmit = () => {
    if (!validateStep()) {
      return;
    }
    createVendorMutation.mutate();
  };

  const handleClose = () => {
    setStep('category');
    setFormData(initialFormData);
    setErrors({});
    onOpenChange(false);
  };

  const getProgress = () => {
    const steps: Step[] = [
      'category',
      'business',
      'credentials',
      'insurance',
      'services',
      'review',
    ];
    const currentIndex = steps.indexOf(step);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const getStepTitle = () => {
    switch (step) {
      case 'category':
        return 'Select Vendor Category';
      case 'business':
        return 'Business Information';
      case 'credentials':
        return 'Licensing & Credentials';
      case 'insurance':
        return 'Insurance & Bonding';
      case 'services':
        return 'Services & Coverage';
      case 'review':
        return 'Review & Submit';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'category':
        return 'Choose the type of vendor to add';
      case 'business':
        return 'Tell us about the business';
      case 'credentials':
        return 'Professional licensing and certifications';
      case 'insurance':
        return 'Insurance coverage details';
      case 'services':
        return 'Services offered and service area';
      case 'review':
        return 'Review all information before submitting';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{getStepTitle()}</h2>
                <p className="text-sm text-slate-400">{getStepDescription()}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div ref={formRef} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Category Selection */}
          {step === 'category' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  What type of vendor are you adding?
                </h3>
                <p className="text-gray-500">
                  Select a category to see specific onboarding questions
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setStep('business')}
                  className="p-6 border-2 border-indigo-500 bg-indigo-50 rounded-xl text-left group hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-200 rounded-xl">
                      <Key className="w-8 h-8 text-indigo-700" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-gray-900">Locksmith</span>
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          Available
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Residential, commercial, and automotive locksmith services
                      </p>
                      <ul className="mt-3 text-sm text-gray-500 space-y-1">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" /> Emergency lockouts
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" /> Lock installation &
                          repair
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" /> Key duplication &
                          rekeying
                        </li>
                      </ul>
                    </div>
                    <ChevronRight className="w-5 h-5 text-indigo-500" />
                  </div>
                </button>

                {/* Coming Soon Categories */}
                {[
                  { name: 'Plumber', icon: Wrench, desc: 'Plumbing repairs and installations' },
                  {
                    name: 'Electrician',
                    icon: Wrench,
                    desc: 'Electrical repairs and installations',
                  },
                  { name: 'HVAC', icon: Wrench, desc: 'Heating and cooling services' },
                ].map((cat) => (
                  <div
                    key={cat.name}
                    className="p-6 border-2 border-gray-200 rounded-xl text-left opacity-60 cursor-not-allowed"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-100 rounded-xl">
                        <cat.icon className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-500">{cat.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{cat.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Business Information */}
          {step === 'business' && (
            <div className="space-y-6">
              {/* Company Info */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Company Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => updateField('companyName', e.target.value)}
                      placeholder="ABC Locksmith Services"
                      className={errors.companyName ? 'border-red-500' : ''}
                    />
                    {errors.companyName && (
                      <p className="text-sm text-red-600 mt-1">{errors.companyName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="yearsInBusiness">Years in Business *</Label>
                    <Select
                      value={formData.yearsInBusiness}
                      onValueChange={(v) => updateField('yearsInBusiness', v)}
                    >
                      <SelectTrigger className={errors.yearsInBusiness ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-1">Less than 1 year</SelectItem>
                        <SelectItem value="1-3">1-3 years</SelectItem>
                        <SelectItem value="3-5">3-5 years</SelectItem>
                        <SelectItem value="5-10">5-10 years</SelectItem>
                        <SelectItem value="10+">10+ years</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.yearsInBusiness && (
                      <p className="text-sm text-red-600 mt-1">{errors.yearsInBusiness}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="numberOfTechnicians">Number of Technicians</Label>
                    <Select
                      value={formData.numberOfTechnicians}
                      onValueChange={(v) => updateField('numberOfTechnicians', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 (Owner-operator)</SelectItem>
                        <SelectItem value="2-5">2-5</SelectItem>
                        <SelectItem value="6-10">6-10</SelectItem>
                        <SelectItem value="11-25">11-25</SelectItem>
                        <SelectItem value="25+">25+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  Primary Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactFirstName">First Name *</Label>
                    <Input
                      id="contactFirstName"
                      value={formData.contactFirstName}
                      onChange={(e) => updateField('contactFirstName', e.target.value)}
                      placeholder="John"
                      className={errors.contactFirstName ? 'border-red-500' : ''}
                    />
                    {errors.contactFirstName && (
                      <p className="text-sm text-red-600 mt-1">{errors.contactFirstName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="contactLastName">Last Name *</Label>
                    <Input
                      id="contactLastName"
                      value={formData.contactLastName}
                      onChange={(e) => updateField('contactLastName', e.target.value)}
                      placeholder="Smith"
                      className={errors.contactLastName ? 'border-red-500' : ''}
                    />
                    {errors.contactLastName && (
                      <p className="text-sm text-red-600 mt-1">{errors.contactLastName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="john@abclocksmith.com"
                        className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="(555) 123-4567"
                        className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => updateField('website', e.target.value)}
                        placeholder="https://www.abclocksmith.com"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Business Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="address1">Street Address *</Label>
                    <Input
                      id="address1"
                      value={formData.address1}
                      onChange={(e) => updateField('address1', e.target.value)}
                      placeholder="123 Main Street"
                      className={errors.address1 ? 'border-red-500' : ''}
                    />
                    {errors.address1 && (
                      <p className="text-sm text-red-600 mt-1">{errors.address1}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address2">Suite/Unit</Label>
                    <Input
                      id="address2"
                      value={formData.address2}
                      onChange={(e) => updateField('address2', e.target.value)}
                      placeholder="Suite 100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="Chicago"
                      className={errors.city ? 'border-red-500' : ''}
                    />
                    {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Select value={formData.state} onValueChange={(v) => updateField('state', v)}>
                        <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state.code} value={state.code}>
                              {state.code} - {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.state && <p className="text-sm text-red-600 mt-1">{errors.state}</p>}
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => updateField('zipCode', e.target.value)}
                        placeholder="60601"
                        className={errors.zipCode ? 'border-red-500' : ''}
                      />
                      {errors.zipCode && (
                        <p className="text-sm text-red-600 mt-1">{errors.zipCode}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Availability */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.emergencyAvailable}
                    onChange={(e) => updateField('emergencyAvailable', e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-medium text-amber-900 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      24/7 Emergency Service Available
                    </span>
                    <p className="text-sm text-amber-700 mt-1">
                      Check this if you offer emergency lockout services outside regular business
                      hours. Emergency vendors are prioritized for urgent dispatches.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Credentials */}
          {step === 'credentials' && (
            <div className="space-y-6">
              {/* License Info */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-600" />
                  State Licensing
                </h3>

                {requiresLicense ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-900">
                          {US_STATES.find((s) => s.code === formData.state)?.name} requires
                          locksmith licensing
                        </p>
                        <p className="text-sm text-amber-700 mt-1">
                          A valid state license is required to operate as a locksmith in this state.
                          We will verify your license with the state licensing board.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : formData.state ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900">
                          {US_STATES.find((s) => s.code === formData.state)?.name} does not require
                          state licensing
                        </p>
                        <p className="text-sm text-green-700 mt-1">
                          While not required, you may still enter any certifications or local
                          permits.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="licenseNumber">License Number {requiresLicense && '*'}</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => updateField('licenseNumber', e.target.value)}
                      placeholder="e.g., LK-123456"
                      className={errors.licenseNumber ? 'border-red-500' : ''}
                    />
                    {errors.licenseNumber && (
                      <p className="text-sm text-red-600 mt-1">{errors.licenseNumber}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="licenseExpiry">
                      License Expiration {requiresLicense && '*'}
                    </Label>
                    <Input
                      id="licenseExpiry"
                      type="date"
                      value={formData.licenseExpiry}
                      onChange={(e) => updateField('licenseExpiry', e.target.value)}
                      className={errors.licenseExpiry ? 'border-red-500' : ''}
                    />
                    {errors.licenseExpiry && (
                      <p className="text-sm text-red-600 mt-1">{errors.licenseExpiry}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Certifications */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Professional Certifications
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  ALOA (Associated Locksmiths of America) certification is not required but helps
                  establish credibility and may qualify you for premium vendor status.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="alcaNumber">ALOA Member Number</Label>
                    <Input
                      id="alcaNumber"
                      value={formData.alcaNumber}
                      onChange={(e) => updateField('alcaNumber', e.target.value)}
                      placeholder="e.g., 12345"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank if not an ALOA member</p>
                  </div>
                </div>
              </div>

              {/* Bonding */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Surety Bond
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  A surety bond provides protection for your customers. While not always required,
                  bonded locksmiths are more trusted by property managers.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="bondCompany">Bond Company</Label>
                    <Input
                      id="bondCompany"
                      value={formData.bondCompany}
                      onChange={(e) => updateField('bondCompany', e.target.value)}
                      placeholder="e.g., Surety One"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bondAmount">Bond Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="bondAmount"
                        value={formData.bondAmount}
                        onChange={(e) => updateField('bondAmount', e.target.value)}
                        placeholder="10,000"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bondExpiry">Bond Expiration</Label>
                    <Input
                      id="bondExpiry"
                      type="date"
                      value={formData.bondExpiry}
                      onChange={(e) => updateField('bondExpiry', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Background Check Consent */}
              <div
                className={`rounded-xl p-6 ${errors.backgroundCheckConsent ? 'bg-red-50 border border-red-200' : 'bg-indigo-50 border border-indigo-200'}`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.backgroundCheckConsent}
                    onChange={(e) => updateField('backgroundCheckConsent', e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-medium text-indigo-900 flex items-center gap-2">
                      Background Check Authorization *
                    </span>
                    <p className="text-sm text-indigo-700 mt-1">
                      I authorize PropertyMaster to conduct a background check on myself and/or my
                      employees who will be performing locksmith services. I understand that all
                      technicians must pass a background check before being dispatched to
                      properties.
                    </p>
                    {errors.backgroundCheckConsent && (
                      <p className="text-sm text-red-600 mt-2">{errors.backgroundCheckConsent}</p>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Insurance */}
          {step === 'insurance' && (
            <div className="space-y-6">
              {/* General Liability */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  General Liability Insurance *
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  General liability insurance is required to operate on the marketplace. Minimum
                  coverage of $500,000 is recommended for property management work.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="insuranceCarrier">Insurance Carrier *</Label>
                    <Input
                      id="insuranceCarrier"
                      value={formData.insuranceCarrier}
                      onChange={(e) => updateField('insuranceCarrier', e.target.value)}
                      placeholder="e.g., State Farm, Progressive"
                      className={errors.insuranceCarrier ? 'border-red-500' : ''}
                    />
                    {errors.insuranceCarrier && (
                      <p className="text-sm text-red-600 mt-1">{errors.insuranceCarrier}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="insurancePolicyNumber">Policy Number *</Label>
                    <Input
                      id="insurancePolicyNumber"
                      value={formData.insurancePolicyNumber}
                      onChange={(e) => updateField('insurancePolicyNumber', e.target.value)}
                      placeholder="e.g., GL-123456789"
                      className={errors.insurancePolicyNumber ? 'border-red-500' : ''}
                    />
                    {errors.insurancePolicyNumber && (
                      <p className="text-sm text-red-600 mt-1">{errors.insurancePolicyNumber}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="insuranceCoverageAmount">Coverage Amount *</Label>
                    <Select
                      value={formData.insuranceCoverageAmount}
                      onValueChange={(v) => updateField('insuranceCoverageAmount', v)}
                    >
                      <SelectTrigger
                        className={errors.insuranceCoverageAmount ? 'border-red-500' : ''}
                      >
                        <SelectValue placeholder="Select coverage amount" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300000">$300,000</SelectItem>
                        <SelectItem value="500000">$500,000</SelectItem>
                        <SelectItem value="1000000">$1,000,000</SelectItem>
                        <SelectItem value="2000000">$2,000,000+</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.insuranceCoverageAmount && (
                      <p className="text-sm text-red-600 mt-1">{errors.insuranceCoverageAmount}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="insuranceExpiry">Policy Expiration Date *</Label>
                    <Input
                      id="insuranceExpiry"
                      type="date"
                      value={formData.insuranceExpiry}
                      onChange={(e) => updateField('insuranceExpiry', e.target.value)}
                      className={errors.insuranceExpiry ? 'border-red-500' : ''}
                    />
                    {errors.insuranceExpiry && (
                      <p className="text-sm text-red-600 mt-1">{errors.insuranceExpiry}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Workers Comp */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Workers&apos; Compensation Insurance
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Required if you have employees. Owner-operators without employees may be exempt in
                  some states.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="workersCompCarrier">Insurance Carrier</Label>
                    <Input
                      id="workersCompCarrier"
                      value={formData.workersCompCarrier}
                      onChange={(e) => updateField('workersCompCarrier', e.target.value)}
                      placeholder="e.g., The Hartford"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workersCompPolicyNumber">Policy Number</Label>
                    <Input
                      id="workersCompPolicyNumber"
                      value={formData.workersCompPolicyNumber}
                      onChange={(e) => updateField('workersCompPolicyNumber', e.target.value)}
                      placeholder="e.g., WC-123456789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workersCompExpiry">Expiration Date</Label>
                    <Input
                      id="workersCompExpiry"
                      type="date"
                      value={formData.workersCompExpiry}
                      onChange={(e) => updateField('workersCompExpiry', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Insurance Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Certificate of Insurance</p>
                    <p className="text-sm text-blue-700 mt-1">
                      After approval, we&apos;ll request a Certificate of Insurance (COI) naming
                      PropertyMaster as an additional insured. This protects both parties during
                      service calls.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Services */}
          {step === 'services' && (
            <div className="space-y-6">
              {/* Service Selection */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-indigo-600" />
                  Services Offered *
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select all services you can provide. This helps us match you with relevant job
                  requests.
                </p>
                {errors.selectedServices && (
                  <p className="text-sm text-red-600 mb-4">{errors.selectedServices}</p>
                )}

                <div className="space-y-6">
                  {[
                    'Emergency',
                    'Residential',
                    'Commercial',
                    'Automotive',
                    'Specialty',
                    'General',
                  ].map((category) => {
                    const categoryServices = LOCKSMITH_SERVICES.filter(
                      (s) => s.category === category,
                    );
                    if (categoryServices.length === 0) {
                      return null;
                    }

                    return (
                      <div key={category}>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {categoryServices.map((service) => {
                            const Icon = service.icon;
                            const isSelected = formData.selectedServices.includes(service.id);
                            return (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => toggleService(service.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                                  isSelected
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                }`}
                              >
                                <div
                                  className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-200' : 'bg-gray-100'}`}
                                >
                                  <Icon
                                    className={`w-4 h-4 ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`font-medium text-sm ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}
                                  >
                                    {service.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Typical: {service.typical}
                                  </p>
                                </div>
                                {isSelected && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Service Area */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Service Area *
                </h3>
                {errors.serviceArea && (
                  <p className="text-sm text-red-600 mb-4">{errors.serviceArea}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="serviceRadius">Service Radius (miles)</Label>
                    <Select
                      value={formData.serviceRadius}
                      onValueChange={(v) => updateField('serviceRadius', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select radius" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 miles</SelectItem>
                        <SelectItem value="15">15 miles</SelectItem>
                        <SelectItem value="25">25 miles</SelectItem>
                        <SelectItem value="50">50 miles</SelectItem>
                        <SelectItem value="100">100 miles</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Distance from your business address
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="serviceZipCodes">Or Specific ZIP Codes</Label>
                    <Input
                      id="serviceZipCodes"
                      value={formData.serviceZipCodes}
                      onChange={(e) => updateField('serviceZipCodes', e.target.value)}
                      placeholder="60601, 60602, 60603..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated list of ZIP codes</p>
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Average Response Time
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="responseTime">Typical Response Time</Label>
                    <Select
                      value={formData.responseTime}
                      onValueChange={(v) => updateField('responseTime', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select response time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">Under 15 minutes</SelectItem>
                        <SelectItem value="30">15-30 minutes</SelectItem>
                        <SelectItem value="60">30-60 minutes</SelectItem>
                        <SelectItem value="120">1-2 hours</SelectItem>
                        <SelectItem value="240">Same day</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      How quickly you can typically arrive for emergency calls
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Ready to Submit!</p>
                    <p className="text-sm text-green-700 mt-1">
                      Please review all information below before submitting. You can go back to any
                      step to make changes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Summary */}
              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    Business Information
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setStep('business')}>
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Company Name</p>
                    <p className="font-medium">{formData.companyName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Contact</p>
                    <p className="font-medium">
                      {formData.contactFirstName} {formData.contactLastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium">{formData.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Address</p>
                    <p className="font-medium">
                      {formData.address1}
                      {formData.address2 && `, ${formData.address2}`}, {formData.city},{' '}
                      {formData.state} {formData.zipCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Years in Business</p>
                    <p className="font-medium">{formData.yearsInBusiness}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">24/7 Emergency</p>
                    <p className="font-medium">{formData.emergencyAvailable ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Credentials Summary */}
              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-indigo-600" />
                    Licensing & Credentials
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setStep('credentials')}>
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">State License</p>
                    <p className="font-medium">{formData.licenseNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">License Expiry</p>
                    <p className="font-medium">{formData.licenseExpiry || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">ALOA Member</p>
                    <p className="font-medium">{formData.alcaNumber || 'No'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Background Check</p>
                    <p className="font-medium text-green-600">Authorized</p>
                  </div>
                </div>
              </div>

              {/* Insurance Summary */}
              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Insurance
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setStep('insurance')}>
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Carrier</p>
                    <p className="font-medium">{formData.insuranceCarrier}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Coverage</p>
                    <p className="font-medium">
                      ${parseInt(formData.insuranceCoverageAmount).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Policy Number</p>
                    <p className="font-medium">{formData.insurancePolicyNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Expires</p>
                    <p className="font-medium">{formData.insuranceExpiry}</p>
                  </div>
                </div>
              </div>

              {/* Services Summary */}
              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-indigo-600" />
                    Services & Coverage
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setStep('services')}>
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-500">Service Radius</p>
                    <p className="font-medium">{formData.serviceRadius} miles</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Response Time</p>
                    <p className="font-medium">{formData.responseTime} minutes</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 mb-2">
                    Services ({formData.selectedServices.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.selectedServices.map((serviceId) => {
                      const service = LOCKSMITH_SERVICES.find((s) => s.id === serviceId);
                      return service ? (
                        <span
                          key={serviceId}
                          className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs"
                        >
                          {service.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>

              {createVendorMutation.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Error Creating Vendor</p>
                      <p className="text-sm text-red-700 mt-1">
                        {(createVendorMutation.error as any)?.response?.data?.message ||
                          'An error occurred. Please try again.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <div>
            {step !== 'category' && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={createVendorMutation.isPending}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={createVendorMutation.isPending}
            >
              Cancel
            </Button>
            {step !== 'category' && step !== 'review' && (
              <Button onClick={handleNext}>
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {step === 'review' && (
              <Button onClick={handleSubmit} disabled={createVendorMutation.isPending}>
                {createVendorMutation.isPending ? (
                  'Creating Vendor...'
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Add to Marketplace
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
