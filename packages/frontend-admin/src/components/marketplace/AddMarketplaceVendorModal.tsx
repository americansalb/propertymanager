import { useState, useRef, useEffect } from 'react';
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
  Sparkles,
  TrendingUp,
  Zap,
  Star,
  Droplet,
  Flame,
  Wind,
  Pipette,
  Plug,
  Lightbulb,
  Snowflake,
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
    earnings: 'High demand',
  },
  {
    id: 'commercial_lockout',
    name: 'Commercial Lockout',
    category: 'Emergency',
    icon: Building,
    typical: '$100-200',
    earnings: 'High demand',
  },
  {
    id: 'automotive_lockout',
    name: 'Automotive Lockout',
    category: 'Emergency',
    icon: Car,
    typical: '$75-175',
    earnings: 'High demand',
  },
  {
    id: 'rekey_locks',
    name: 'Rekey Locks',
    category: 'Residential',
    icon: Key,
    typical: '$20-30/lock',
    earnings: 'Steady work',
  },
  {
    id: 'lock_replacement',
    name: 'Lock Replacement',
    category: 'Residential',
    icon: Lock,
    typical: '$75-250',
    earnings: 'Steady work',
  },
  {
    id: 'deadbolt_install',
    name: 'Deadbolt Installation',
    category: 'Residential',
    icon: Shield,
    typical: '$100-200',
    earnings: 'Steady work',
  },
  {
    id: 'high_security_locks',
    name: 'High Security Locks',
    category: 'Commercial',
    icon: Shield,
    typical: '$150-400',
    earnings: 'Premium pricing',
  },
  {
    id: 'master_key_system',
    name: 'Master Key System',
    category: 'Commercial',
    icon: Key,
    typical: '$200-500+',
    earnings: 'Premium pricing',
  },
  {
    id: 'access_control',
    name: 'Access Control Systems',
    category: 'Commercial',
    icon: Lock,
    typical: '$500-2000+',
    earnings: 'Premium pricing',
  },
  {
    id: 'key_duplication',
    name: 'Key Duplication',
    category: 'General',
    icon: Key,
    typical: '$3-25/key',
    earnings: 'Quick jobs',
  },
  {
    id: 'safe_opening',
    name: 'Safe Opening/Repair',
    category: 'Specialty',
    icon: Lock,
    typical: '$150-400',
    earnings: 'Premium pricing',
  },
  {
    id: 'ignition_repair',
    name: 'Ignition Repair/Replace',
    category: 'Automotive',
    icon: Car,
    typical: '$150-350',
    earnings: 'High demand',
  },
  {
    id: 'transponder_keys',
    name: 'Transponder Key Programming',
    category: 'Automotive',
    icon: Car,
    typical: '$100-300',
    earnings: 'High demand',
  },
];

// Plumber services
const PLUMBER_SERVICES = [
  {
    id: 'emergency_leak',
    name: 'Emergency Leak Repair',
    category: 'Emergency',
    icon: Droplet,
    typical: '$150-400',
    earnings: 'High demand',
  },
  {
    id: 'burst_pipe',
    name: 'Burst Pipe Repair',
    category: 'Emergency',
    icon: Droplet,
    typical: '$200-600',
    earnings: 'High demand',
  },
  {
    id: 'clogged_drain',
    name: 'Clogged Drain/Toilet',
    category: 'Emergency',
    icon: Pipette,
    typical: '$100-300',
    earnings: 'High demand',
  },
  {
    id: 'water_heater_repair',
    name: 'Water Heater Repair',
    category: 'Repair',
    icon: Flame,
    typical: '$200-500',
    earnings: 'Steady work',
  },
  {
    id: 'water_heater_install',
    name: 'Water Heater Installation',
    category: 'Installation',
    icon: Flame,
    typical: '$800-2000',
    earnings: 'Premium pricing',
  },
  {
    id: 'faucet_repair',
    name: 'Faucet Repair/Replacement',
    category: 'Repair',
    icon: Droplet,
    typical: '$150-350',
    earnings: 'Steady work',
  },
  {
    id: 'toilet_repair',
    name: 'Toilet Repair/Replacement',
    category: 'Repair',
    icon: Home,
    typical: '$150-400',
    earnings: 'Steady work',
  },
  {
    id: 'garbage_disposal',
    name: 'Garbage Disposal Repair',
    category: 'Repair',
    icon: Wrench,
    typical: '$100-300',
    earnings: 'Steady work',
  },
  {
    id: 'sewer_line',
    name: 'Sewer Line Repair',
    category: 'Major',
    icon: Pipette,
    typical: '$500-3000',
    earnings: 'Premium pricing',
  },
  {
    id: 'pipe_replacement',
    name: 'Pipe Replacement',
    category: 'Major',
    icon: Pipette,
    typical: '$300-1500',
    earnings: 'Premium pricing',
  },
  {
    id: 'sump_pump',
    name: 'Sump Pump Install/Repair',
    category: 'Installation',
    icon: Droplet,
    typical: '$400-1200',
    earnings: 'Seasonal demand',
  },
  {
    id: 'backflow_prevention',
    name: 'Backflow Prevention',
    category: 'Commercial',
    icon: Shield,
    typical: '$300-800',
    earnings: 'Steady work',
  },
];

// Electrician services
const ELECTRICIAN_SERVICES = [
  {
    id: 'power_outage',
    name: 'Power Outage Emergency',
    category: 'Emergency',
    icon: Zap,
    typical: '$150-500',
    earnings: 'High demand',
  },
  {
    id: 'electrical_fire_hazard',
    name: 'Electrical Fire Hazard',
    category: 'Emergency',
    icon: Flame,
    typical: '$200-600',
    earnings: 'High demand',
  },
  {
    id: 'circuit_breaker_trip',
    name: 'Circuit Breaker Issues',
    category: 'Emergency',
    icon: Zap,
    typical: '$100-350',
    earnings: 'High demand',
  },
  {
    id: 'outlet_repair',
    name: 'Outlet Repair/Replacement',
    category: 'Repair',
    icon: Plug,
    typical: '$75-200',
    earnings: 'Steady work',
  },
  {
    id: 'light_fixture',
    name: 'Light Fixture Installation',
    category: 'Installation',
    icon: Lightbulb,
    typical: '$100-300',
    earnings: 'Steady work',
  },
  {
    id: 'ceiling_fan',
    name: 'Ceiling Fan Installation',
    category: 'Installation',
    icon: Wind,
    typical: '$150-400',
    earnings: 'Steady work',
  },
  {
    id: 'panel_upgrade',
    name: 'Electrical Panel Upgrade',
    category: 'Major',
    icon: Building,
    typical: '$1000-3000',
    earnings: 'Premium pricing',
  },
  {
    id: 'rewiring',
    name: 'Home/Unit Rewiring',
    category: 'Major',
    icon: Zap,
    typical: '$1500-6000',
    earnings: 'Premium pricing',
  },
  {
    id: 'smoke_detector',
    name: 'Smoke Detector Install',
    category: 'Safety',
    icon: Shield,
    typical: '$50-150',
    earnings: 'Quick jobs',
  },
  {
    id: 'gfci_outlet',
    name: 'GFCI Outlet Installation',
    category: 'Safety',
    icon: Plug,
    typical: '$100-250',
    earnings: 'Steady work',
  },
  {
    id: 'ev_charger',
    name: 'EV Charger Installation',
    category: 'Installation',
    icon: Plug,
    typical: '$500-1500',
    earnings: 'Growing demand',
  },
  {
    id: 'generator_install',
    name: 'Generator Installation',
    category: 'Installation',
    icon: Zap,
    typical: '$2000-5000',
    earnings: 'Premium pricing',
  },
];

// HVAC services
const HVAC_SERVICES = [
  {
    id: 'no_heat_emergency',
    name: 'No Heat Emergency',
    category: 'Emergency',
    icon: Flame,
    typical: '$150-500',
    earnings: 'High demand',
  },
  {
    id: 'no_cooling_emergency',
    name: 'No A/C Emergency',
    category: 'Emergency',
    icon: Snowflake,
    typical: '$150-500',
    earnings: 'High demand',
  },
  {
    id: 'gas_leak',
    name: 'Gas Leak Emergency',
    category: 'Emergency',
    icon: Flame,
    typical: '$200-600',
    earnings: 'High demand',
  },
  {
    id: 'ac_repair',
    name: 'A/C Repair',
    category: 'Repair',
    icon: Snowflake,
    typical: '$200-800',
    earnings: 'Seasonal demand',
  },
  {
    id: 'furnace_repair',
    name: 'Furnace Repair',
    category: 'Repair',
    icon: Flame,
    typical: '$200-800',
    earnings: 'Seasonal demand',
  },
  {
    id: 'ac_install',
    name: 'A/C Installation',
    category: 'Installation',
    icon: Snowflake,
    typical: '$2500-7000',
    earnings: 'Premium pricing',
  },
  {
    id: 'furnace_install',
    name: 'Furnace Installation',
    category: 'Installation',
    icon: Flame,
    typical: '$2500-6000',
    earnings: 'Premium pricing',
  },
  {
    id: 'hvac_maintenance',
    name: 'HVAC Maintenance',
    category: 'Maintenance',
    icon: Wrench,
    typical: '$100-300',
    earnings: 'Recurring work',
  },
  {
    id: 'duct_cleaning',
    name: 'Duct Cleaning',
    category: 'Maintenance',
    icon: Wind,
    typical: '$300-500',
    earnings: 'Seasonal demand',
  },
  {
    id: 'thermostat_install',
    name: 'Thermostat Installation',
    category: 'Installation',
    icon: DollarSign,
    typical: '$100-300',
    earnings: 'Quick jobs',
  },
  {
    id: 'air_quality',
    name: 'Air Quality Systems',
    category: 'Installation',
    icon: Wind,
    typical: '$500-2000',
    earnings: 'Growing demand',
  },
  {
    id: 'heat_pump',
    name: 'Heat Pump Install/Repair',
    category: 'Major',
    icon: Flame,
    typical: '$3000-8000',
    earnings: 'Premium pricing',
  },
];

type VendorType = 'locksmith' | 'plumber' | 'electrician' | 'hvac';

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
  // Vendor Type
  vendorType: VendorType | '';

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
  vendorType: '',
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
  const [showConfetti, setShowConfetti] = useState(false);
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

  const getCurrentServices = () => {
    switch (formData.vendorType) {
      case 'locksmith':
        return LOCKSMITH_SERVICES;
      case 'plumber':
        return PLUMBER_SERVICES;
      case 'electrician':
        return ELECTRICIAN_SERVICES;
      case 'hvac':
        return HVAC_SERVICES;
      default:
        return LOCKSMITH_SERVICES;
    }
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
        type: 'PROFESSIONAL_SERVICES', // Locksmith category mapped to PROFESSIONAL_SERVICES
        // status defaults to PENDING_APPROVAL in backend
        licenseNumber: formData.licenseNumber || undefined,
        insuranceExpiryDate: formData.insuranceExpiry || undefined,
        // Note: insuranceProvider and insurancePolicyNumber are collected but not yet stored
        // These fields are part of the onboarding flow for future verification
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
      setShowConfetti(true);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['vendors'] });
        queryClient.invalidateQueries({ queryKey: ['marketplace-vendors'] });
        queryClient.invalidateQueries({ queryKey: ['marketplace-vendor-profiles'] });
        handleClose();
      }, 3000);
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
    setShowConfetti(false);
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

  const getStepNumber = () => {
    const steps: Step[] = [
      'category',
      'business',
      'credentials',
      'insurance',
      'services',
      'review',
    ];
    return steps.indexOf(step) + 1;
  };

  const getStepTitle = () => {
    switch (step) {
      case 'category':
        return '🎯 Choose Your Path';
      case 'business':
        return '🏢 Tell Us About Your Business';
      case 'credentials':
        return '🏆 Show Your Credentials';
      case 'insurance':
        return '🛡️ Protection & Coverage';
      case 'services':
        return '⚡ Your Services & Reach';
      case 'review':
        return '🚀 Ready to Launch!';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'category':
        return 'Select your specialty to get started';
      case 'business':
        return "Let's get to know your company";
      case 'credentials':
        return 'Build trust with verified credentials';
      case 'insurance':
        return 'Protect yourself and your clients';
      case 'services':
        return 'Choose services and define your territory';
      case 'review':
        return 'Review and submit - you're almost there!';
    }
  };

  const calculatePotentialEarnings = () => {
    let minEarnings = 0;
    let maxEarnings = 0;
    const currentServices = getCurrentServices();

    formData.selectedServices.forEach((serviceId) => {
      const service = currentServices.find((s) => s.id === serviceId);
      if (service) {
        // Parse typical pricing (e.g., "$75-150" or "$20-30/lock")
        const match = service.typical.match(/\$(\d+)-(\d+)/);
        if (match) {
          minEarnings += parseInt(match[1]);
          maxEarnings += parseInt(match[2]);
        }
      }
    });

    return { min: minEarnings, max: maxEarnings };
  };

  const earnings = calculatePotentialEarnings();

  // Confetti effect
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        {/* Confetti Overlay */}
        {showConfetti && (
          <div className="absolute inset-0 z-50 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-pink-400/20 to-purple-400/20 animate-pulse" />
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                }}
              >
                <Sparkles
                  className="w-6 h-6"
                  style={{
                    color: ['#fbbf24', '#ec4899', '#8b5cf6', '#3b82f6'][Math.floor(Math.random() * 4)],
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Animated Header with Step Indicators */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />

          <div className="relative flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl animate-pulse">
                <Store className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {getStepTitle()}
                </h2>
                <p className="text-indigo-100 text-sm mt-1">{getStepDescription()}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Step Progress Indicators */}
          <div className="relative flex items-center justify-between mb-4">
            {['category', 'business', 'credentials', 'insurance', 'services', 'review'].map(
              (s, index) => {
                const steps: Step[] = [
                  'category',
                  'business',
                  'credentials',
                  'insurance',
                  'services',
                  'review',
                ];
                const currentIndex = steps.indexOf(step);
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;

                return (
                  <div key={s} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                          isCompleted
                            ? 'bg-green-400 text-white scale-110 shadow-lg'
                            : isCurrent
                              ? 'bg-white text-indigo-600 scale-125 shadow-2xl ring-4 ring-white/50'
                              : 'bg-white/30 text-white/70'
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="w-6 h-6" /> : index + 1}
                      </div>
                      <span className="text-xs text-white/80 mt-1 hidden md:block">
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </span>
                    </div>
                    {index < 5 && (
                      <div className="flex-1 h-1 mx-2 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isCompleted ? 'bg-green-400 w-full' : 'bg-transparent w-0'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>

          {/* Animated Progress Bar */}
          <div className="h-2 bg-white/20 backdrop-blur-sm rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div ref={formRef} className="p-8 overflow-y-auto max-h-[calc(95vh-280px)]">
          {/* Category Selection */}
          {step === 'category' && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full mb-4">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-700">Join Our Marketplace</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">
                  What's Your Superpower?
                </h3>
                <p className="text-lg text-gray-600">
                  Select your specialty and let's get you earning in no time! 💪
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Locksmith */}
                <button
                  onClick={() => {
                    updateField('vendorType', 'locksmith');
                    setStep('business');
                  }}
                  className="group relative p-8 border-3 border-transparent bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-left overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="flex items-start gap-6">
                      <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <Key className="w-12 h-12 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold text-white">🔐 Locksmith</span>
                          <span className="px-3 py-1 bg-green-400 text-green-900 rounded-full text-xs font-bold animate-pulse">
                            High Demand
                          </span>
                        </div>
                        <p className="text-indigo-100 mb-4 text-sm">
                          Emergency services, commercial & residential locksmith work
                        </p>
                        <ul className="space-y-2 text-sm text-white/90">
                          <li className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-300" /> Emergency lockouts (24/7 calls)
                          </li>
                          <li className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-300" /> Average $100-300 per job
                          </li>
                          <li className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-300" /> Build your reputation fast
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-white/80 text-sm font-medium">Get Started →</span>
                      <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-2 transition-transform duration-300" />
                    </div>
                  </div>
                </button>

                {/* Plumber */}
                <button
                  onClick={() => {
                    updateField('vendorType', 'plumber');
                    setStep('business');
                  }}
                  className="group relative p-8 border-3 border-transparent bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl text-left overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="flex items-start gap-6">
                      <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <Droplet className="w-12 h-12 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold text-white">💧 Plumber</span>
                          <span className="px-3 py-1 bg-green-400 text-green-900 rounded-full text-xs font-bold animate-pulse">
                            High Demand
                          </span>
                        </div>
                        <p className="text-blue-100 mb-4 text-sm">
                          Emergency repairs, installations, and water heater services
                        </p>
                        <ul className="space-y-2 text-sm text-white/90">
                          <li className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-300" /> Emergency leaks & bursts
                          </li>
                          <li className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-300" /> Average $200-500 per job
                          </li>
                          <li className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-300" /> Year-round demand
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-white/80 text-sm font-medium">Get Started →</span>
                      <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-2 transition-transform duration-300" />
                    </div>
                  </div>
                </button>

                {/* Electrician */}
                <button
                  onClick={() => {
                    updateField('vendorType', 'electrician');
                    setStep('business');
                  }}
                  className="group relative p-8 border-3 border-transparent bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-left overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="flex items-start gap-6">
                      <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <Zap className="w-12 h-12 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold text-white">⚡ Electrician</span>
                          <span className="px-3 py-1 bg-green-400 text-green-900 rounded-full text-xs font-bold animate-pulse">
                            High Demand
                          </span>
                        </div>
                        <p className="text-amber-100 mb-4 text-sm">
                          Emergency repairs, panel upgrades, and safety inspections
                        </p>
                        <ul className="space-y-2 text-sm text-white/90">
                          <li className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-300" /> Power outage emergencies
                          </li>
                          <li className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-300" /> Average $200-600 per job
                          </li>
                          <li className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-300" /> Safety-critical work
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-white/80 text-sm font-medium">Get Started →</span>
                      <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-2 transition-transform duration-300" />
                    </div>
                  </div>
                </button>

                {/* HVAC */}
                <button
                  onClick={() => {
                    updateField('vendorType', 'hvac');
                    setStep('business');
                  }}
                  className="group relative p-8 border-3 border-transparent bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl text-left overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="flex items-start gap-6">
                      <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <Wind className="w-12 h-12 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold text-white">❄️ HVAC</span>
                          <span className="px-3 py-1 bg-green-400 text-green-900 rounded-full text-xs font-bold animate-pulse">
                            High Demand
                          </span>
                        </div>
                        <p className="text-red-100 mb-4 text-sm">
                          Heating, cooling emergencies, and seasonal maintenance
                        </p>
                        <ul className="space-y-2 text-sm text-white/90">
                          <li className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-300" /> No heat/AC emergencies
                          </li>
                          <li className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-300" /> Average $300-800 per job
                          </li>
                          <li className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-300" /> Recurring contracts
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-white/80 text-sm font-medium">Get Started →</span>
                      <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-2 transition-transform duration-300" />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Business Information */}
          {step === 'business' && (
            <div className="space-y-6 animate-slide-in">
              {/* Company Info */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 rounded-xl">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  Company Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <Label htmlFor="companyName" className="text-gray-700 font-semibold mb-2">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => updateField('companyName', e.target.value)}
                      placeholder="ABC Locksmith Services"
                      className={`transition-all duration-200 ${errors.companyName ? 'border-red-500 shake' : 'focus:ring-2 focus:ring-indigo-500'}`}
                    />
                    {errors.companyName && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {errors.companyName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="yearsInBusiness" className="text-gray-700 font-semibold mb-2">Years in Business *</Label>
                    <Select
                      value={formData.yearsInBusiness}
                      onValueChange={(v) => updateField('yearsInBusiness', v)}
                    >
                      <SelectTrigger className={errors.yearsInBusiness ? 'border-red-500' : 'focus:ring-2 focus:ring-indigo-500'}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-1">Less than 1 year</SelectItem>
                        <SelectItem value="1-3">1-3 years</SelectItem>
                        <SelectItem value="3-5">3-5 years</SelectItem>
                        <SelectItem value="5-10">5-10 years</SelectItem>
                        <SelectItem value="10+">10+ years ⭐</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.yearsInBusiness && (
                      <p className="text-sm text-red-600 mt-1">{errors.yearsInBusiness}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="numberOfTechnicians" className="text-gray-700 font-semibold mb-2">Number of Technicians</Label>
                    <Select
                      value={formData.numberOfTechnicians}
                      onValueChange={(v) => updateField('numberOfTechnicians', v)}
                    >
                      <SelectTrigger className="focus:ring-2 focus:ring-indigo-500">
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
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-xl">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  Primary Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="contactFirstName" className="text-gray-700 font-semibold mb-2">First Name *</Label>
                    <Input
                      id="contactFirstName"
                      value={formData.contactFirstName}
                      onChange={(e) => updateField('contactFirstName', e.target.value)}
                      placeholder="John"
                      className={errors.contactFirstName ? 'border-red-500' : 'focus:ring-2 focus:ring-purple-500'}
                    />
                    {errors.contactFirstName && (
                      <p className="text-sm text-red-600 mt-1">{errors.contactFirstName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="contactLastName" className="text-gray-700 font-semibold mb-2">Last Name *</Label>
                    <Input
                      id="contactLastName"
                      value={formData.contactLastName}
                      onChange={(e) => updateField('contactLastName', e.target.value)}
                      placeholder="Smith"
                      className={errors.contactLastName ? 'border-red-500' : 'focus:ring-2 focus:ring-purple-500'}
                    />
                    {errors.contactLastName && (
                      <p className="text-sm text-red-600 mt-1">{errors.contactLastName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-gray-700 font-semibold mb-2">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="john@abclocksmith.com"
                        className={`pl-11 ${errors.email ? 'border-red-500' : 'focus:ring-2 focus:ring-purple-500'}`}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-gray-700 font-semibold mb-2">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="(555) 123-4567"
                        className={`pl-11 ${errors.phone ? 'border-red-500' : 'focus:ring-2 focus:ring-purple-500'}`}
                      />
                    </div>
                    {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="website" className="text-gray-700 font-semibold mb-2">Website (Optional)</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => updateField('website', e.target.value)}
                        placeholder="https://www.abclocksmith.com"
                        className="pl-11 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-xl">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  Business Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <Label htmlFor="address1" className="text-gray-700 font-semibold mb-2">Street Address *</Label>
                    <Input
                      id="address1"
                      value={formData.address1}
                      onChange={(e) => updateField('address1', e.target.value)}
                      placeholder="123 Main Street"
                      className={errors.address1 ? 'border-red-500' : 'focus:ring-2 focus:ring-green-500'}
                    />
                    {errors.address1 && (
                      <p className="text-sm text-red-600 mt-1">{errors.address1}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address2" className="text-gray-700 font-semibold mb-2">Suite/Unit (Optional)</Label>
                    <Input
                      id="address2"
                      value={formData.address2}
                      onChange={(e) => updateField('address2', e.target.value)}
                      placeholder="Suite 100"
                      className="focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-gray-700 font-semibold mb-2">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="Chicago"
                      className={errors.city ? 'border-red-500' : 'focus:ring-2 focus:ring-green-500'}
                    />
                    {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="state" className="text-gray-700 font-semibold mb-2">State *</Label>
                      <Select value={formData.state} onValueChange={(v) => updateField('state', v)}>
                        <SelectTrigger className={errors.state ? 'border-red-500' : 'focus:ring-2 focus:ring-green-500'}>
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
                      <Label htmlFor="zipCode" className="text-gray-700 font-semibold mb-2">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => updateField('zipCode', e.target.value)}
                        placeholder="60601"
                        className={errors.zipCode ? 'border-red-500' : 'focus:ring-2 focus:ring-green-500'}
                      />
                      {errors.zipCode && (
                        <p className="text-sm text-red-600 mt-1">{errors.zipCode}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Availability */}
              <div className="bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-300 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.emergencyAvailable}
                    onChange={(e) => updateField('emergencyAvailable', e.target.checked)}
                    className="mt-1 w-6 h-6 rounded-lg border-amber-400 text-amber-600 focus:ring-amber-500 focus:ring-2 transition-all duration-200"
                  />
                  <div>
                    <span className="font-bold text-amber-900 flex items-center gap-2 text-lg">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      24/7 Emergency Service Available
                    </span>
                    <p className="text-sm text-amber-800 mt-2 leading-relaxed">
                      🔥 Boost your earnings! Emergency vendors earn <span className="font-bold">2-3x more</span> and get prioritized for urgent dispatches. Stand out from the competition!
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Credentials */}
          {step === 'credentials' && (
            <div className="space-y-6 animate-slide-in">
              {/* License Info */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 rounded-xl">
                    <FileCheck className="w-6 h-6 text-white" />
                  </div>
                  State Licensing
                </h3>

                {requiresLicense ? (
                  <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4 mb-4 animate-pulse">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-900">
                          ⚠️ {US_STATES.find((s) => s.code === formData.state)?.name} requires
                          locksmith licensing
                        </p>
                        <p className="text-sm text-amber-800 mt-2">
                          A valid state license is required to operate as a locksmith in this state.
                          Our team will review and verify your license information during the approval process.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : formData.state ? (
                  <div className="bg-green-100 border-2 border-green-300 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-bold text-green-900">
                          ✅ {US_STATES.find((s) => s.code === formData.state)?.name} does not require
                          state licensing
                        </p>
                        <p className="text-sm text-green-800 mt-2">
                          While not required, you may still enter any certifications or local
                          permits.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="licenseNumber" className="text-gray-700 font-semibold mb-2">License Number {requiresLicense && '*'}</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => updateField('licenseNumber', e.target.value)}
                      placeholder="e.g., LK-123456"
                      className={errors.licenseNumber ? 'border-red-500' : 'focus:ring-2 focus:ring-indigo-500'}
                    />
                    {errors.licenseNumber && (
                      <p className="text-sm text-red-600 mt-1">{errors.licenseNumber}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="licenseExpiry" className="text-gray-700 font-semibold mb-2">
                      License Expiration {requiresLicense && '*'}
                    </Label>
                    <Input
                      id="licenseExpiry"
                      type="date"
                      value={formData.licenseExpiry}
                      onChange={(e) => updateField('licenseExpiry', e.target.value)}
                      className={errors.licenseExpiry ? 'border-red-500' : 'focus:ring-2 focus:ring-indigo-500'}
                    />
                    {errors.licenseExpiry && (
                      <p className="text-sm text-red-600 mt-1">{errors.licenseExpiry}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Certifications */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-xl">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  Professional Certifications
                </h3>
                <p className="text-sm text-gray-700 mb-4 bg-purple-100 p-3 rounded-lg">
                  🏆 <span className="font-semibold">Pro Tip:</span> ALOA certification isn't required, but it <span className="font-bold">boosts your credibility</span> and may qualify you for <span className="font-bold text-purple-700">premium vendor status</span> with higher pay rates!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="alcaNumber" className="text-gray-700 font-semibold mb-2">ALOA Member Number</Label>
                    <Input
                      id="alcaNumber"
                      value={formData.alcaNumber}
                      onChange={(e) => updateField('alcaNumber', e.target.value)}
                      placeholder="e.g., 12345"
                      className="focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank if not an ALOA member</p>
                  </div>
                </div>
              </div>

              {/* Bonding */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-xl">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  Surety Bond
                </h3>
                <p className="text-sm text-gray-700 mb-4 bg-blue-100 p-3 rounded-lg">
                  🛡️ A surety bond provides protection for your customers. While not always required,
                  <span className="font-bold"> bonded locksmiths are more trusted</span> by property managers and command higher rates!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <Label htmlFor="bondCompany" className="text-gray-700 font-semibold mb-2">Bond Company</Label>
                    <Input
                      id="bondCompany"
                      value={formData.bondCompany}
                      onChange={(e) => updateField('bondCompany', e.target.value)}
                      placeholder="e.g., Surety One"
                      className="focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bondAmount" className="text-gray-700 font-semibold mb-2">Bond Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                      <Input
                        id="bondAmount"
                        value={formData.bondAmount}
                        onChange={(e) => updateField('bondAmount', e.target.value)}
                        placeholder="10,000"
                        className="pl-11 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bondExpiry" className="text-gray-700 font-semibold mb-2">Bond Expiration</Label>
                    <Input
                      id="bondExpiry"
                      type="date"
                      value={formData.bondExpiry}
                      onChange={(e) => updateField('bondExpiry', e.target.value)}
                      className="focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Background Check Consent */}
              <div
                className={`rounded-2xl p-6 border-2 ${errors.backgroundCheckConsent ? 'bg-red-50 border-red-300 animate-pulse' : 'bg-gradient-to-r from-indigo-100 to-purple-100 border-indigo-300'} shadow-lg`}
              >
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.backgroundCheckConsent}
                    onChange={(e) => updateField('backgroundCheckConsent', e.target.checked)}
                    className="mt-1 w-6 h-6 rounded-lg border-indigo-400 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                  />
                  <div>
                    <span className="font-bold text-indigo-900 flex items-center gap-2 text-lg">
                      Background Check Authorization *
                    </span>
                    <p className="text-sm text-indigo-800 mt-2 leading-relaxed">
                      I authorize PropertyMaster to conduct a background check on myself and/or my
                      employees who will be performing locksmith services. I understand that my application will be reviewed and that all
                      technicians must pass a background check before being approved for dispatch.
                    </p>
                    {errors.backgroundCheckConsent && (
                      <p className="text-sm text-red-600 mt-2 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {errors.backgroundCheckConsent}
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Insurance */}
          {step === 'insurance' && (
            <div className="space-y-6 animate-slide-in">
              {/* General Liability */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-xl">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  General Liability Insurance *
                </h3>
                <p className="text-sm text-gray-700 mb-4 bg-green-100 p-3 rounded-lg">
                  🛡️ General liability insurance is <span className="font-bold">required</span> to operate on the marketplace. Minimum
                  coverage of <span className="font-bold text-green-700">$500,000</span> is recommended for property management work.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="insuranceCarrier" className="text-gray-700 font-semibold mb-2">Insurance Carrier *</Label>
                    <Input
                      id="insuranceCarrier"
                      value={formData.insuranceCarrier}
                      onChange={(e) => updateField('insuranceCarrier', e.target.value)}
                      placeholder="e.g., State Farm, Progressive"
                      className={errors.insuranceCarrier ? 'border-red-500' : 'focus:ring-2 focus:ring-green-500'}
                    />
                    {errors.insuranceCarrier && (
                      <p className="text-sm text-red-600 mt-1">{errors.insuranceCarrier}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="insurancePolicyNumber" className="text-gray-700 font-semibold mb-2">Policy Number *</Label>
                    <Input
                      id="insurancePolicyNumber"
                      value={formData.insurancePolicyNumber}
                      onChange={(e) => updateField('insurancePolicyNumber', e.target.value)}
                      placeholder="e.g., GL-123456789"
                      className={errors.insurancePolicyNumber ? 'border-red-500' : 'focus:ring-2 focus:ring-green-500'}
                    />
                    {errors.insurancePolicyNumber && (
                      <p className="text-sm text-red-600 mt-1">{errors.insurancePolicyNumber}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="insuranceCoverageAmount" className="text-gray-700 font-semibold mb-2">Coverage Amount *</Label>
                    <Select
                      value={formData.insuranceCoverageAmount}
                      onValueChange={(v) => updateField('insuranceCoverageAmount', v)}
                    >
                      <SelectTrigger
                        className={errors.insuranceCoverageAmount ? 'border-red-500' : 'focus:ring-2 focus:ring-green-500'}
                      >
                        <SelectValue placeholder="Select coverage amount" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300000">$300,000</SelectItem>
                        <SelectItem value="500000">$500,000 (Recommended)</SelectItem>
                        <SelectItem value="1000000">$1,000,000 ⭐</SelectItem>
                        <SelectItem value="2000000">$2,000,000+ 🌟</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.insuranceCoverageAmount && (
                      <p className="text-sm text-red-600 mt-1">{errors.insuranceCoverageAmount}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="insuranceExpiry" className="text-gray-700 font-semibold mb-2">Policy Expiration Date *</Label>
                    <Input
                      id="insuranceExpiry"
                      type="date"
                      value={formData.insuranceExpiry}
                      onChange={(e) => updateField('insuranceExpiry', e.target.value)}
                      className={errors.insuranceExpiry ? 'border-red-500' : 'focus:ring-2 focus:ring-green-500'}
                    />
                    {errors.insuranceExpiry && (
                      <p className="text-sm text-red-600 mt-1">{errors.insuranceExpiry}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Workers Comp */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  Workers' Compensation Insurance
                </h3>
                <p className="text-sm text-gray-700 mb-4 bg-blue-100 p-3 rounded-lg">
                  👷 Required if you have employees. Owner-operators without employees may be exempt in
                  some states.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <Label htmlFor="workersCompCarrier" className="text-gray-700 font-semibold mb-2">Insurance Carrier</Label>
                    <Input
                      id="workersCompCarrier"
                      value={formData.workersCompCarrier}
                      onChange={(e) => updateField('workersCompCarrier', e.target.value)}
                      placeholder="e.g., The Hartford"
                      className="focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workersCompPolicyNumber" className="text-gray-700 font-semibold mb-2">Policy Number</Label>
                    <Input
                      id="workersCompPolicyNumber"
                      value={formData.workersCompPolicyNumber}
                      onChange={(e) => updateField('workersCompPolicyNumber', e.target.value)}
                      placeholder="e.g., WC-123456789"
                      className="focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workersCompExpiry" className="text-gray-700 font-semibold mb-2">Expiration Date</Label>
                    <Input
                      id="workersCompExpiry"
                      type="date"
                      value={formData.workersCompExpiry}
                      onChange={(e) => updateField('workersCompExpiry', e.target.value)}
                      className="focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Insurance Info */}
              <div className="bg-gradient-to-r from-cyan-100 to-blue-100 border-2 border-cyan-300 rounded-2xl p-5 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-cyan-500 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-cyan-900 text-lg">What Happens Next?</p>
                    <p className="text-sm text-cyan-800 mt-2 leading-relaxed">
                      After approval, we'll request a <span className="font-bold">Certificate of Insurance (COI)</span> naming
                      PropertyMaster as an additional insured. This protects both parties during
                      service calls and ensures you're covered for all marketplace jobs! 🤝
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Services */}
          {step === 'services' && (
            <div className="space-y-6 animate-slide-in">
              {/* Earnings Potential Banner */}
              {formData.selectedServices.length > 0 && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-2xl animate-pulse">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold opacity-90">💰 Your Potential Per-Job Earnings</p>
                      <p className="text-4xl font-bold mt-2">
                        ${earnings.min} - ${earnings.max}
                      </p>
                      <p className="text-sm opacity-90 mt-1">Based on {formData.selectedServices.length} selected services</p>
                    </div>
                    <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                      <TrendingUp className="w-16 h-16" />
                    </div>
                  </div>
                </div>
              )}

              {/* Service Selection */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 rounded-xl">
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                  Services Offered *
                </h3>
                <p className="text-sm text-gray-700 mb-4 bg-indigo-100 p-3 rounded-lg">
                  ⚡ Select all services you can provide. More services = more job opportunities! Each service card shows typical pricing and demand level.
                </p>
                {errors.selectedServices && (
                  <p className="text-sm text-red-600 mb-4 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.selectedServices}
                  </p>
                )}

                <div className="space-y-6">
                  {(() => {
                    const currentServices = getCurrentServices();
                    const categories = [...new Set(currentServices.map((s) => s.category))];

                    return categories.map((category) => {
                      const categoryServices = currentServices.filter(
                        (s) => s.category === category,
                      );
                      if (categoryServices.length === 0) {
                        return null;
                      }

                      return (
                        <div key={category}>
                          <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                            {category === 'Emergency' && '🚨'}
                            {category === 'Residential' && '🏠'}
                            {category === 'Commercial' && '🏢'}
                            {category === 'Automotive' && '🚗'}
                            {category === 'Specialty' && '⭐'}
                            {category === 'General' && '🔧'}
                            {category === 'Repair' && '🔧'}
                            {category === 'Installation' && '⚙️'}
                            {category === 'Major' && '🏗️'}
                            {category === 'Maintenance' && '🛠️'}
                            {category === 'Safety' && '🛡️'}
                            {category}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {categoryServices.map((service) => {
                              const Icon = service.icon;
                              const isSelected = formData.selectedServices.includes(service.id);
                              return (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() => toggleService(service.id)}
                                  className={`group relative flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-300 transform ${
                                    isSelected
                                      ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 scale-105 shadow-xl'
                                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gradient-to-br hover:from-gray-50 hover:to-indigo-50 hover:scale-102 hover:shadow-lg'
                                  }`}
                                >
                                  <div
                                    className={`p-3 rounded-xl transition-all duration-300 ${isSelected ? 'bg-indigo-500 shadow-lg' : 'bg-gray-100 group-hover:bg-indigo-100'}`}
                                  >
                                    <Icon
                                      className={`w-6 h-6 transition-colors duration-300 ${isSelected ? 'text-white' : 'text-gray-500 group-hover:text-indigo-600'}`}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`font-bold text-sm ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}
                                    >
                                      {service.name}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                      💵 {service.typical}
                                    </p>
                                    <p className={`text-xs mt-0.5 font-medium ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>
                                      {service.earnings}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <div className="absolute -top-2 -right-2 p-1 bg-green-500 rounded-full shadow-lg animate-bounce">
                                      <CheckCircle className="w-5 h-5 text-white" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Service Area */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-xl">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  Service Area *
                </h3>
                {errors.serviceArea && (
                  <p className="text-sm text-red-600 mb-4">{errors.serviceArea}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="serviceRadius" className="text-gray-700 font-semibold mb-2">Service Radius (miles)</Label>
                    <Select
                      value={formData.serviceRadius}
                      onValueChange={(v) => updateField('serviceRadius', v)}
                    >
                      <SelectTrigger className="focus:ring-2 focus:ring-green-500">
                        <SelectValue placeholder="Select radius" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 miles</SelectItem>
                        <SelectItem value="15">15 miles</SelectItem>
                        <SelectItem value="25">25 miles (Recommended)</SelectItem>
                        <SelectItem value="50">50 miles 📍</SelectItem>
                        <SelectItem value="100">100 miles 🌎</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-2 bg-green-100 p-2 rounded">
                      💡 <span className="font-semibold">Pro tip:</span> Larger radius = more job opportunities!
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="serviceZipCodes" className="text-gray-700 font-semibold mb-2">Or Specific ZIP Codes</Label>
                    <Input
                      id="serviceZipCodes"
                      value={formData.serviceZipCodes}
                      onChange={(e) => updateField('serviceZipCodes', e.target.value)}
                      placeholder="60601, 60602, 60603..."
                      className="focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-2">Comma-separated list of ZIP codes</p>
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-xl">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  Average Response Time
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="responseTime" className="text-gray-700 font-semibold mb-2">Typical Response Time</Label>
                    <Select
                      value={formData.responseTime}
                      onValueChange={(v) => updateField('responseTime', v)}
                    >
                      <SelectTrigger className="focus:ring-2 focus:ring-orange-500">
                        <SelectValue placeholder="Select response time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">Under 15 minutes ⚡</SelectItem>
                        <SelectItem value="30">15-30 minutes 🏃</SelectItem>
                        <SelectItem value="60">30-60 minutes</SelectItem>
                        <SelectItem value="120">1-2 hours</SelectItem>
                        <SelectItem value="240">Same day</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-2 bg-orange-100 p-2 rounded">
                      ⏱️ <span className="font-semibold">Faster response time</span> = priority in dispatch queue!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Review */}
          {step === 'review' && (
            <div className="space-y-6 animate-slide-in">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 border-2 border-blue-400 rounded-2xl p-6 mb-6 text-white shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-bold text-2xl mb-2">🎉 You're Almost There!</p>
                    <p className="text-blue-100 leading-relaxed">
                      Review all information below before submitting. Our team will review your application and verify your credentials within <span className="font-bold">24-48 hours</span>. Once approved, you'll start receiving job opportunities right away! 🚀
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-indigo-500 rounded-xl">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    Business Information
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setStep('business')} className="hover:bg-indigo-100">
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-5 text-sm">
                  <div>
                    <p className="text-gray-500 font-semibold">Company Name</p>
                    <p className="font-bold text-gray-900">{formData.companyName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">Contact</p>
                    <p className="font-bold text-gray-900">
                      {formData.contactFirstName} {formData.contactLastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">Email</p>
                    <p className="font-bold text-gray-900">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">Phone</p>
                    <p className="font-bold text-gray-900">{formData.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 font-semibold">Address</p>
                    <p className="font-bold text-gray-900">
                      {formData.address1}
                      {formData.address2 && `, ${formData.address2}`}, {formData.city},{' '}
                      {formData.state} {formData.zipCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">Years in Business</p>
                    <p className="font-bold text-gray-900">{formData.yearsInBusiness}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">24/7 Emergency</p>
                    <p className="font-bold text-gray-900">{formData.emergencyAvailable ? '✅ Yes' : '❌ No'}</p>
                  </div>
                </div>
              </div>

              {/* Credentials Summary */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-purple-500 rounded-xl">
                      <FileCheck className="w-6 h-6 text-white" />
                    </div>
                    Licensing & Credentials
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setStep('credentials')} className="hover:bg-purple-100">
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-5 text-sm">
                  <div>
                    <p className="text-gray-500 font-semibold">State License</p>
                    <p className="font-bold text-gray-900">{formData.licenseNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">License Expiry</p>
                    <p className="font-bold text-gray-900">{formData.licenseExpiry || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">ALOA Member</p>
                    <p className="font-bold text-gray-900">{formData.alcaNumber || 'No'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">Background Check</p>
                    <p className="font-bold text-green-600">✅ Authorized</p>
                  </div>
                </div>
              </div>

              {/* Insurance Summary */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-xl">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    Insurance
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setStep('insurance')} className="hover:bg-green-100">
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-5 text-sm">
                  <div>
                    <p className="text-gray-500 font-semibold">Carrier</p>
                    <p className="font-bold text-gray-900">{formData.insuranceCarrier}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">Coverage</p>
                    <p className="font-bold text-gray-900">
                      ${parseInt(formData.insuranceCoverageAmount).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">Policy Number</p>
                    <p className="font-bold text-gray-900">{formData.insurancePolicyNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">Expires</p>
                    <p className="font-bold text-gray-900">{formData.insuranceExpiry}</p>
                  </div>
                </div>
              </div>

              {/* Services Summary */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-orange-500 rounded-xl">
                      <Wrench className="w-6 h-6 text-white" />
                    </div>
                    Services & Coverage
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setStep('services')} className="hover:bg-orange-100">
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-5 text-sm mb-4">
                  <div>
                    <p className="text-gray-500 font-semibold">Service Radius</p>
                    <p className="font-bold text-gray-900">{formData.serviceRadius} miles 📍</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">Response Time</p>
                    <p className="font-bold text-gray-900">{formData.responseTime} minutes ⏱️</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 mb-2 font-semibold">
                    Services ({formData.selectedServices.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.selectedServices.map((serviceId) => {
                      const currentServices = getCurrentServices();
                      const service = currentServices.find((s) => s.id === serviceId);
                      return service ? (
                        <span
                          key={serviceId}
                          className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-xs font-semibold shadow-lg"
                        >
                          {service.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>

              {createVendorMutation.error && (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 shadow-lg animate-pulse">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-900 text-lg">Error Creating Vendor</p>
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
        <div className="flex items-center justify-between px-8 py-5 border-t-2 bg-gradient-to-r from-gray-50 to-slate-50">
          <div>
            {step !== 'category' && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={createVendorMutation.isPending}
                className="hover:bg-gray-100 transition-all duration-200"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={createVendorMutation.isPending}
              className="hover:bg-gray-100 transition-all duration-200"
            >
              Cancel
            </Button>
            {step !== 'category' && step !== 'review' && (
              <Button onClick={handleNext} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg transition-all duration-200 hover:scale-105">
                Continue
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            )}
            {step === 'review' && (
              <Button
                onClick={handleSubmit}
                disabled={createVendorMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-2xl transition-all duration-200 hover:scale-110 px-8"
              >
                {createVendorMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting Application...
                  </span>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Submit for Approval
                    <ChevronRight className="w-5 h-5 ml-2" />
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
