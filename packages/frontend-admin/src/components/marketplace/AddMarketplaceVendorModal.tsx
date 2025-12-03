import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  Shield,
  FileCheck,
  Award,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  FileText,
  AlertTriangle,
  Home,
  Building,
  Car,
  Key,
  Lock,
  Wrench,
  Droplet,
  Flame,
  Zap,
  Snowflake,
  Wind,
  Lightbulb,
  Plug,
  Pipette,
  DollarSign,
  Star,
  Clock,
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

type Step =
  | 'specialty'
  | 'business_identity'
  | 'licensing'
  | 'insurance'
  | 'tax_payment'
  | 'background_check'
  | 'services_coverage'
  | 'trust_experience'
  | 'review';

type VendorSpecialty = 'locksmith' | 'plumber' | 'electrician' | 'hvac' | '';

// Service definitions by specialty
const SPECIALTY_SERVICES = {
  locksmith: [
    { id: 'residential_lockout', name: 'Residential Lockout', category: 'Emergency', typical: '$75-150' },
    { id: 'commercial_lockout', name: 'Commercial Lockout', category: 'Emergency', typical: '$100-200' },
    { id: 'automotive_lockout', name: 'Automotive Lockout', category: 'Emergency', typical: '$75-175' },
    { id: 'rekey_locks', name: 'Rekey Locks', category: 'Residential', typical: '$20-30/lock' },
    { id: 'lock_replacement', name: 'Lock Replacement', category: 'Residential', typical: '$75-250' },
    { id: 'deadbolt_install', name: 'Deadbolt Installation', category: 'Residential', typical: '$100-200' },
    { id: 'high_security_locks', name: 'High Security Locks', category: 'Commercial', typical: '$150-400' },
    { id: 'master_key_system', name: 'Master Key System', category: 'Commercial', typical: '$200-500+' },
    { id: 'access_control', name: 'Access Control Systems', category: 'Commercial', typical: '$500-2000+' },
    { id: 'key_duplication', name: 'Key Duplication', category: 'General', typical: '$3-25/key' },
    { id: 'safe_opening', name: 'Safe Opening/Repair', category: 'Specialty', typical: '$150-400' },
    { id: 'ignition_repair', name: 'Ignition Repair/Replace', category: 'Automotive', typical: '$150-350' },
    { id: 'transponder_keys', name: 'Transponder Key Programming', category: 'Automotive', typical: '$100-300' },
  ],
  plumber: [
    { id: 'emergency_leak', name: 'Emergency Leak Repair', category: 'Emergency', typical: '$150-400' },
    { id: 'burst_pipe', name: 'Burst Pipe Repair', category: 'Emergency', typical: '$200-600' },
    { id: 'clogged_drain', name: 'Clogged Drain/Toilet', category: 'Emergency', typical: '$100-300' },
    { id: 'water_heater_repair', name: 'Water Heater Repair', category: 'Repair', typical: '$200-500' },
    { id: 'water_heater_install', name: 'Water Heater Installation', category: 'Installation', typical: '$800-2500' },
    { id: 'faucet_repair', name: 'Faucet Repair/Replace', category: 'Repair', typical: '$100-300' },
    { id: 'toilet_repair', name: 'Toilet Repair/Replace', category: 'Repair', typical: '$150-500' },
    { id: 'drain_cleaning', name: 'Professional Drain Cleaning', category: 'Maintenance', typical: '$150-400' },
    { id: 'sewer_line', name: 'Sewer Line Repair', category: 'Major', typical: '$1500-5000' },
    { id: 'repiping', name: 'Repiping', category: 'Major', typical: '$2000-10000' },
    { id: 'water_line', name: 'Water Line Repair', category: 'Major', typical: '$500-3000' },
    { id: 'sump_pump', name: 'Sump Pump Install/Repair', category: 'Installation', typical: '$500-1500' },
  ],
  electrician: [
    { id: 'power_outage', name: 'Power Outage Emergency', category: 'Emergency', typical: '$150-500' },
    { id: 'sparking_outlet', name: 'Sparking Outlet Emergency', category: 'Emergency', typical: '$100-300' },
    { id: 'breaker_trip', name: 'Circuit Breaker Repair', category: 'Repair', typical: '$100-400' },
    { id: 'outlet_install', name: 'Outlet Installation', category: 'Installation', typical: '$75-200' },
    { id: 'light_fixture', name: 'Light Fixture Installation', category: 'Installation', typical: '$100-300' },
    { id: 'ceiling_fan', name: 'Ceiling Fan Installation', category: 'Installation', typical: '$150-400' },
    { id: 'panel_upgrade', name: 'Electrical Panel Upgrade', category: 'Major', typical: '$1000-3000' },
    { id: 'rewiring', name: 'Home/Unit Rewiring', category: 'Major', typical: '$1500-6000' },
    { id: 'smoke_detector', name: 'Smoke Detector Install', category: 'Safety', typical: '$50-150' },
    { id: 'gfci_outlet', name: 'GFCI Outlet Installation', category: 'Safety', typical: '$100-250' },
    { id: 'ev_charger', name: 'EV Charger Installation', category: 'Installation', typical: '$500-1500' },
    { id: 'generator_install', name: 'Generator Installation', category: 'Installation', typical: '$2000-5000' },
  ],
  hvac: [
    { id: 'no_heat_emergency', name: 'No Heat Emergency', category: 'Emergency', typical: '$150-500' },
    { id: 'no_cooling_emergency', name: 'No A/C Emergency', category: 'Emergency', typical: '$150-500' },
    { id: 'gas_leak', name: 'Gas Leak Emergency', category: 'Emergency', typical: '$200-600' },
    { id: 'ac_repair', name: 'A/C Repair', category: 'Repair', typical: '$200-800' },
    { id: 'furnace_repair', name: 'Furnace Repair', category: 'Repair', typical: '$200-800' },
    { id: 'ac_install', name: 'A/C Installation', category: 'Installation', typical: '$2500-7000' },
    { id: 'furnace_install', name: 'Furnace Installation', category: 'Installation', typical: '$2500-6000' },
    { id: 'hvac_maintenance', name: 'HVAC Maintenance', category: 'Maintenance', typical: '$100-300' },
    { id: 'duct_cleaning', name: 'Duct Cleaning', category: 'Maintenance', typical: '$300-500' },
    { id: 'thermostat_install', name: 'Thermostat Installation', category: 'Installation', typical: '$100-300' },
    { id: 'air_quality', name: 'Air Quality Systems', category: 'Installation', typical: '$500-2000' },
    { id: 'heat_pump', name: 'Heat Pump Install/Repair', category: 'Major', typical: '$3000-8000' },
  ],
};

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

const BUSINESS_ENTITY_TYPES = [
  'LLC',
  'Corporation',
  'Partnership',
  'Sole Proprietor',
  'Other',
];

const INSURANCE_CARRIERS = [
  'State Farm',
  'Allstate',
  'Progressive',
  'Geico',
  'Liberty Mutual',
  'Travelers',
  'Hartford',
  'Nationwide',
  'CNA',
  'Zurich',
  'Other',
];

interface FormData {
  // Specialty
  specialty: VendorSpecialty;

  // Business Identity
  legalBusinessName: string;
  dbaName: string;
  businessEntityType: string;
  ein: string;
  stateOfIncorporation: string;
  businessRegistrationNumber: string;
  yearsInBusiness: string;

  // Contact Information
  businessAddress1: string;
  businessAddress2: string;
  businessCity: string;
  businessState: string;
  businessZipCode: string;
  businessPhone: string;
  email: string;
  website: string;

  // Licensing
  licenseState: string;
  licenseNumber: string;
  licenseType: string;
  licenseClassification: string;
  licenseHolderName: string;
  licenseExpiryDate: string;
  licensePhotoUrl: string;

  // Trade-specific certifications
  aloaMemberNumber: string;  // Locksmith
  bondCompany: string;
  bondAmount: string;
  bondExpiryDate: string;
  epaCertificationNumber: string;  // HVAC

  // Insurance
  coiUrl: string;
  insuranceCarrier: string;
  insurancePolicyNumber: string;
  insuranceCoverageAmount: string;
  insuranceExpiryDate: string;
  insuranceAgentName: string;
  insuranceAgentPhone: string;
  hasEmployees: boolean;
  workersCompCarrier: string;
  workersCompPolicyNumber: string;
  workersCompExpiryDate: string;

  // Tax & Payment
  w9Url: string;
  taxLegalName: string;
  taxEin: string;
  taxEntityType: string;
  taxMailingAddress: string;
  bankVerificationMethod: 'plaid' | 'manual' | '';
  bankName: string;
  bankRoutingNumber: string;
  bankAccountNumber: string;
  bankAccountType: string;

  // Background Check
  ownerFirstName: string;
  ownerMiddleName: string;
  ownerLastName: string;
  ownerDateOfBirth: string;
  ownerSsnLast4: string;
  ownerDriverLicenseNumber: string;
  ownerDriverLicenseState: string;
  backgroundCheckConsent: boolean;
  technicianBackgroundCheckConsent: boolean;

  // Services & Coverage
  selectedServices: string[];
  serviceRadius: string;
  serviceZipCodes: string;
  emergencyAvailable: boolean;
  standardResponseTime: string;

  // Trust & Experience
  aloaMemberNumber: string;
  phccMemberNumber: string;
  necaMemberNumber: string;
  accaMemberNumber: string;
  bbbProfileUrl: string;
  googleBusinessUrl: string;
  references: Array<{
    company: string;
    contact: string;
    phone: string;
    email: string;
  }>;
  portfolioUrls: string[];
}

const initialFormData: FormData = {
  specialty: '',
  legalBusinessName: '',
  dbaName: '',
  businessEntityType: '',
  ein: '',
  stateOfIncorporation: '',
  businessRegistrationNumber: '',
  yearsInBusiness: '',
  businessAddress1: '',
  businessAddress2: '',
  businessCity: '',
  businessState: '',
  businessZipCode: '',
  businessPhone: '',
  email: '',
  website: '',
  licenseState: '',
  licenseNumber: '',
  licenseType: '',
  licenseClassification: '',
  licenseHolderName: '',
  licenseExpiryDate: '',
  licensePhotoUrl: '',
  aloaMemberNumber: '',
  bondCompany: '',
  bondAmount: '',
  bondExpiryDate: '',
  epaCertificationNumber: '',
  coiUrl: '',
  insuranceCarrier: '',
  insurancePolicyNumber: '',
  insuranceCoverageAmount: '',
  insuranceExpiryDate: '',
  insuranceAgentName: '',
  insuranceAgentPhone: '',
  hasEmployees: false,
  workersCompCarrier: '',
  workersCompPolicyNumber: '',
  workersCompExpiryDate: '',
  w9Url: '',
  taxLegalName: '',
  taxEin: '',
  taxEntityType: '',
  taxMailingAddress: '',
  bankVerificationMethod: '',
  bankName: '',
  bankRoutingNumber: '',
  bankAccountNumber: '',
  bankAccountType: '',
  ownerFirstName: '',
  ownerMiddleName: '',
  ownerLastName: '',
  ownerDateOfBirth: '',
  ownerSsnLast4: '',
  ownerDriverLicenseNumber: '',
  ownerDriverLicenseState: '',
  backgroundCheckConsent: false,
  technicianBackgroundCheckConsent: false,
  selectedServices: [],
  serviceRadius: '25',
  serviceZipCodes: '',
  emergencyAvailable: true,
  standardResponseTime: '60',
  aloaMemberNumber: '',
  phccMemberNumber: '',
  necaMemberNumber: '',
  accaMemberNumber: '',
  bbbProfileUrl: '',
  googleBusinessUrl: '',
  references: [],
  portfolioUrls: [],
};

export default function AddMarketplaceVendorModal({
  open,
  onOpenChange,
}: AddMarketplaceVendorModalProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<Step>('specialty');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createVendorMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Map frontend specialty to backend VendorType enum
      const typeMapping: Record<string, string> = {
        locksmith: 'LOCKSMITH',
        plumber: 'PLUMBING',
        electrician: 'ELECTRICAL',
        hvac: 'HVAC',
      };

      const payload = {
        companyName: data.legalBusinessName,
        dbaName: data.dbaName,
        contactName: `${data.ownerFirstName} ${data.ownerLastName}`.trim(),
        email: data.email,
        phone: data.businessPhone,
        website: data.website,
        type: typeMapping[data.specialty] || 'OTHER',
        status: 'PENDING_APPROVAL',
        yearsInBusiness: data.yearsInBusiness,
        numberOfTechnicians: '1',
        address1: data.businessAddress1,
        address2: data.businessAddress2,
        city: data.businessCity,
        state: data.businessState,
        zipCode: data.businessZipCode,
        businessEntityType: data.businessEntityType,
        taxId: data.ein,
        w9Url: data.w9Url,
        insuranceCarrier: data.insuranceCarrier,
        insurancePolicyNumber: data.insurancePolicyNumber,
        insuranceCoverageAmount: data.insuranceCoverageAmount,
        insuranceExpiryDate: data.insuranceExpiryDate,
        insuranceCertUrl: data.coiUrl,
        insuranceAgentName: data.insuranceAgentName,
        insuranceAgentPhone: data.insuranceAgentPhone,
        licenseNumber: data.licenseNumber,
        licenseState: data.licenseState,
        licenseType: data.licenseType,
        licenseExpiryDate: data.licenseExpiryDate,
        certificationNumber: data.aloaMemberNumber || data.epaCertificationNumber,
        bondCompany: data.bondCompany,
        bondAmount: data.bondAmount,
        bondExpiryDate: data.bondExpiryDate,
        backgroundCheckConsent: data.backgroundCheckConsent,
        servicesOffered: data.selectedServices,
        serviceZipCodes: data.serviceZipCodes.split(',').map((z) => z.trim()).filter(Boolean),
        serviceRadius: parseInt(data.serviceRadius) || 25,
        emergencyAvailable: data.emergencyAvailable,
        emergencyResponseTime: parseInt(data.standardResponseTime) || 60,
      };

      const response = await api.post('/vendors', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setFormData(initialFormData);
      setCurrentStep('specialty');
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error creating vendor:', error);
      alert(`Error creating vendor: ${error.response?.data?.message || error.message}`);
    },
  });

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'specialty':
        if (!formData.specialty) newErrors.specialty = 'Please select a specialty';
        break;

      case 'business_identity':
        if (!formData.legalBusinessName) newErrors.legalBusinessName = 'Required';
        if (!formData.businessEntityType) newErrors.businessEntityType = 'Required';
        if (!formData.ein) newErrors.ein = 'Required';
        if (formData.ein && !/^\d{2}-?\d{7}$/.test(formData.ein)) {
          newErrors.ein = 'Invalid EIN format (XX-XXXXXXX)';
        }
        if (!formData.stateOfIncorporation) newErrors.stateOfIncorporation = 'Required';
        if (!formData.yearsInBusiness) newErrors.yearsInBusiness = 'Required';
        if (!formData.businessAddress1) newErrors.businessAddress1 = 'Required';
        if (!formData.businessCity) newErrors.businessCity = 'Required';
        if (!formData.businessState) newErrors.businessState = 'Required';
        if (!formData.businessZipCode) newErrors.businessZipCode = 'Required';
        if (!formData.businessPhone) newErrors.businessPhone = 'Required';
        if (!formData.email) newErrors.email = 'Required';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
        break;

      case 'licensing':
        if (!formData.licenseState) newErrors.licenseState = 'Required';
        if (!formData.licenseNumber) newErrors.licenseNumber = 'Required';
        if (!formData.licenseType) newErrors.licenseType = 'Required';
        if (!formData.licenseHolderName) newErrors.licenseHolderName = 'Required';
        if (!formData.licenseExpiryDate) newErrors.licenseExpiryDate = 'Required';
        break;

      case 'insurance':
        if (!formData.insuranceCarrier) newErrors.insuranceCarrier = 'Required';
        if (!formData.insurancePolicyNumber) newErrors.insurancePolicyNumber = 'Required';
        if (!formData.insuranceCoverageAmount) newErrors.insuranceCoverageAmount = 'Required';
        if (!formData.insuranceExpiryDate) newErrors.insuranceExpiryDate = 'Required';
        if (formData.hasEmployees) {
          if (!formData.workersCompCarrier) newErrors.workersCompCarrier = 'Required for employees';
          if (!formData.workersCompPolicyNumber) newErrors.workersCompPolicyNumber = 'Required';
          if (!formData.workersCompExpiryDate) newErrors.workersCompExpiryDate = 'Required';
        }
        break;

      case 'background_check':
        if (!formData.ownerFirstName) newErrors.ownerFirstName = 'Required';
        if (!formData.ownerLastName) newErrors.ownerLastName = 'Required';
        if (!formData.ownerDateOfBirth) newErrors.ownerDateOfBirth = 'Required';
        if (!formData.ownerSsnLast4) newErrors.ownerSsnLast4 = 'Required';
        if (formData.ownerSsnLast4 && !/^\d{4}$/.test(formData.ownerSsnLast4)) {
          newErrors.ownerSsnLast4 = 'Must be 4 digits';
        }
        if (!formData.ownerDriverLicenseNumber) newErrors.ownerDriverLicenseNumber = 'Required';
        if (!formData.ownerDriverLicenseState) newErrors.ownerDriverLicenseState = 'Required';
        if (!formData.backgroundCheckConsent) {
          newErrors.backgroundCheckConsent = 'You must authorize background check';
        }
        if (!formData.technicianBackgroundCheckConsent) {
          newErrors.technicianBackgroundCheckConsent = 'You must ensure technician checks';
        }
        break;

      case 'services_coverage':
        if (formData.selectedServices.length < 3) {
          newErrors.selectedServices = 'Please select at least 3 services';
        }
        if (!formData.standardResponseTime) newErrors.standardResponseTime = 'Required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    const stepOrder: Step[] = [
      'specialty',
      'business_identity',
      'licensing',
      'insurance',
      'tax_payment',
      'background_check',
      'services_coverage',
      'trust_experience',
      'review',
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: Step[] = [
      'specialty',
      'business_identity',
      'licensing',
      'insurance',
      'tax_payment',
      'background_check',
      'services_coverage',
      'trust_experience',
      'review',
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSubmit = () => {
    if (validateStep('review')) {
      createVendorMutation.mutate(formData);
    }
  };

  const getStepTitle = (step: Step): string => {
    switch (step) {
      case 'specialty':
        return 'Select Specialty';
      case 'business_identity':
        return 'Business Identity';
      case 'licensing':
        return 'Contractor License';
      case 'insurance':
        return 'Insurance Coverage';
      case 'tax_payment':
        return 'Tax Information & Payment';
      case 'background_check':
        return 'Background Check Authorization';
      case 'services_coverage':
        return 'Services & Coverage';
      case 'trust_experience':
        return 'Build Your Credibility';
      case 'review':
        return 'Application Review';
      default:
        return '';
    }
  };

  const getStepDescription = (step: Step): string => {
    switch (step) {
      case 'specialty':
        return 'Choose your primary service specialty';
      case 'business_identity':
        return 'We will verify your business with government databases';
      case 'licensing':
        return 'We verify all licenses with state contractor boards';
      case 'insurance':
        return 'Upload your Certificate of Insurance - we will read it for you';
      case 'tax_payment':
        return 'For 1099 reporting and fast payouts';
      case 'background_check':
        return 'For platform safety, all vendors must authorize a background check';
      case 'services_coverage':
        return 'Define what you offer and where';
      case 'trust_experience':
        return 'Optional but recommended - helps with approval';
      case 'review':
        return 'Review your application and verification status';
      default:
        return '';
    }
  };

  const renderSpecialtySelection = () => {
    const specialties = [
      {
        id: 'locksmith',
        name: 'Locksmith',
        icon: Key,
        description: 'Residential, commercial & automotive locksmith services',
      },
      {
        id: 'plumber',
        name: 'Plumbing',
        icon: Droplet,
        description: 'Plumbing repairs, installations & emergency services',
      },
      {
        id: 'electrician',
        name: 'Electrical',
        icon: Zap,
        description: 'Electrical repairs, installations & panel upgrades',
      },
      {
        id: 'hvac',
        name: 'HVAC',
        icon: Snowflake,
        description: 'Heating, cooling & ventilation services',
      },
    ];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {specialties.map((specialty) => {
            const Icon = specialty.icon;
            const isSelected = formData.specialty === specialty.id;

            return (
              <button
                key={specialty.id}
                type="button"
                onClick={() => updateFormData('specialty', specialty.id)}
                className={`
                  flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all
                  ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-indigo-300'
                  }
                `}
              >
                <div
                  className={`
                  p-3 rounded-lg
                  ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}
                `}
                >
                  <Icon className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{specialty.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{specialty.description}</div>
                </div>
              </button>
            );
          })}
        </div>
        {errors.specialty && <div className="text-sm text-red-600">{errors.specialty}</div>}
      </div>
    );
  };

  const renderBusinessIdentity = () => (
    <div className="space-y-6">
      {/* Legal Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-900 font-medium">
          <Building2 className="w-5 h-5" />
          <span>Legal Information</span>
        </div>
        <p className="text-sm text-gray-600">
          Must match your state registration exactly
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="legalBusinessName">
              Legal Business Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="legalBusinessName"
              value={formData.legalBusinessName}
              onChange={(e) => updateFormData('legalBusinessName', e.target.value)}
              placeholder="ABC Locksmith LLC"
              className={errors.legalBusinessName ? 'border-red-500' : ''}
            />
            {errors.legalBusinessName && (
              <div className="text-sm text-red-600 mt-1">{errors.legalBusinessName}</div>
            )}
          </div>

          <div className="col-span-2">
            <Label htmlFor="dbaName">DBA/Trade Name (if different)</Label>
            <Input
              id="dbaName"
              value={formData.dbaName}
              onChange={(e) => updateFormData('dbaName', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <Label htmlFor="businessEntityType">
              Business Entity Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.businessEntityType}
              onValueChange={(value) => updateFormData('businessEntityType', value)}
            >
              <SelectTrigger className={errors.businessEntityType ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select entity type" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_ENTITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.businessEntityType && (
              <div className="text-sm text-red-600 mt-1">{errors.businessEntityType}</div>
            )}
          </div>

          <div>
            <Label htmlFor="ein">
              EIN (Employer ID Number) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ein"
              value={formData.ein}
              onChange={(e) => updateFormData('ein', e.target.value)}
              placeholder="12-3456789"
              maxLength={10}
              className={errors.ein ? 'border-red-500' : ''}
            />
            {errors.ein && <div className="text-sm text-red-600 mt-1">{errors.ein}</div>}
            <div className="text-xs text-gray-500 mt-1">9 digits (XX-XXXXXXX)</div>
          </div>

          <div>
            <Label htmlFor="stateOfIncorporation">
              State of Incorporation <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.stateOfIncorporation}
              onValueChange={(value) => updateFormData('stateOfIncorporation', value)}
            >
              <SelectTrigger className={errors.stateOfIncorporation ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.stateOfIncorporation && (
              <div className="text-sm text-red-600 mt-1">{errors.stateOfIncorporation}</div>
            )}
          </div>

          <div>
            <Label htmlFor="businessRegistrationNumber">State Business Registration Number</Label>
            <Input
              id="businessRegistrationNumber"
              value={formData.businessRegistrationNumber}
              onChange={(e) => updateFormData('businessRegistrationNumber', e.target.value)}
              placeholder="e.g., CA SOS# C1234567"
            />
            <div className="text-xs text-gray-500 mt-1">Optional but helpful for verification</div>
          </div>

          <div className="col-span-2">
            <Label htmlFor="yearsInBusiness">
              Years in Business <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.yearsInBusiness}
              onValueChange={(value) => updateFormData('yearsInBusiness', value)}
            >
              <SelectTrigger className={errors.yearsInBusiness ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<1">Less than 1 year</SelectItem>
                <SelectItem value="1-3">1-3 years</SelectItem>
                <SelectItem value="3-5">3-5 years</SelectItem>
                <SelectItem value="5-10">5-10 years</SelectItem>
                <SelectItem value="10+">10+ years</SelectItem>
              </SelectContent>
            </Select>
            {errors.yearsInBusiness && (
              <div className="text-sm text-red-600 mt-1">{errors.yearsInBusiness}</div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              We will cross-check with your state filing date
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center gap-2 text-gray-900 font-medium">
          <Phone className="w-5 h-5" />
          <span>Contact Information</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="businessAddress1">
              Business Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="businessAddress1"
              value={formData.businessAddress1}
              onChange={(e) => updateFormData('businessAddress1', e.target.value)}
              placeholder="Street address"
              className={errors.businessAddress1 ? 'border-red-500' : ''}
            />
            {errors.businessAddress1 && (
              <div className="text-sm text-red-600 mt-1">{errors.businessAddress1}</div>
            )}
            <div className="flex items-center gap-2 text-xs text-amber-600 mt-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Cannot use PO Box - physical address required</span>
            </div>
          </div>

          <div className="col-span-2">
            <Label htmlFor="businessAddress2">Address Line 2</Label>
            <Input
              id="businessAddress2"
              value={formData.businessAddress2}
              onChange={(e) => updateFormData('businessAddress2', e.target.value)}
              placeholder="Suite, unit, etc. (optional)"
            />
          </div>

          <div>
            <Label htmlFor="businessCity">
              City <span className="text-red-500">*</span>
            </Label>
            <Input
              id="businessCity"
              value={formData.businessCity}
              onChange={(e) => updateFormData('businessCity', e.target.value)}
              placeholder="City"
              className={errors.businessCity ? 'border-red-500' : ''}
            />
            {errors.businessCity && (
              <div className="text-sm text-red-600 mt-1">{errors.businessCity}</div>
            )}
          </div>

          <div>
            <Label htmlFor="businessState">
              State <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.businessState}
              onValueChange={(value) => updateFormData('businessState', value)}
            >
              <SelectTrigger className={errors.businessState ? 'border-red-500' : ''}>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.businessState && (
              <div className="text-sm text-red-600 mt-1">{errors.businessState}</div>
            )}
          </div>

          <div className="col-span-2">
            <Label htmlFor="businessZipCode">
              ZIP Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="businessZipCode"
              value={formData.businessZipCode}
              onChange={(e) => updateFormData('businessZipCode', e.target.value)}
              placeholder="ZIP code"
              maxLength={10}
              className={errors.businessZipCode ? 'border-red-500' : ''}
            />
            {errors.businessZipCode && (
              <div className="text-sm text-red-600 mt-1">{errors.businessZipCode}</div>
            )}
          </div>

          <div>
            <Label htmlFor="businessPhone">
              Business Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="businessPhone"
              value={formData.businessPhone}
              onChange={(e) => updateFormData('businessPhone', e.target.value)}
              placeholder="(555) 123-4567"
              type="tel"
              className={errors.businessPhone ? 'border-red-500' : ''}
            />
            {errors.businessPhone && (
              <div className="text-sm text-red-600 mt-1">{errors.businessPhone}</div>
            )}
            <div className="text-xs text-gray-500 mt-1">Landline preferred</div>
          </div>

          <div>
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              placeholder="contact@company.com"
              type="email"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <div className="text-sm text-red-600 mt-1">{errors.email}</div>}
          </div>

          <div className="col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => updateFormData('website', e.target.value)}
              placeholder="https://www.yourcompany.com"
              type="url"
            />
            <div className="text-xs text-gray-500 mt-1">
              Optional but helps verify legitimacy
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLicensing = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-900 font-medium">
          <Award className="w-5 h-5" />
          <span>Contractor License</span>
        </div>
        <p className="text-sm text-gray-600">
          We verify all licenses with state contractor boards
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="licenseState">
              License State <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.licenseState}
              onValueChange={(value) => updateFormData('licenseState', value)}
            >
              <SelectTrigger className={errors.licenseState ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.licenseState && (
              <div className="text-sm text-red-600 mt-1">{errors.licenseState}</div>
            )}
          </div>

          <div>
            <Label htmlFor="licenseNumber">
              License Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="licenseNumber"
              value={formData.licenseNumber}
              onChange={(e) => updateFormData('licenseNumber', e.target.value)}
              placeholder="Enter exactly as shown on license"
              className={errors.licenseNumber ? 'border-red-500' : ''}
            />
            {errors.licenseNumber && (
              <div className="text-sm text-red-600 mt-1">{errors.licenseNumber}</div>
            )}
          </div>

          <div>
            <Label htmlFor="licenseType">
              License Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.licenseType}
              onValueChange={(value) => updateFormData('licenseType', value)}
            >
              <SelectTrigger className={errors.licenseType ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Master">Master</SelectItem>
                <SelectItem value="Journeyman">Journeyman</SelectItem>
                <SelectItem value="Apprentice">Apprentice</SelectItem>
                <SelectItem value="Registered">Registered</SelectItem>
                <SelectItem value="Certified">Certified</SelectItem>
              </SelectContent>
            </Select>
            {errors.licenseType && (
              <div className="text-sm text-red-600 mt-1">{errors.licenseType}</div>
            )}
          </div>

          <div>
            <Label htmlFor="licenseClassification">License Classification</Label>
            <Input
              id="licenseClassification"
              value={formData.licenseClassification}
              onChange={(e) => updateFormData('licenseClassification', e.target.value)}
              placeholder="e.g., C-10 Electrical (CA)"
            />
            <div className="text-xs text-gray-500 mt-1">Varies by state</div>
          </div>

          <div className="col-span-2">
            <Label htmlFor="licenseHolderName">
              License Holder Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="licenseHolderName"
              value={formData.licenseHolderName}
              onChange={(e) => updateFormData('licenseHolderName', e.target.value)}
              placeholder="Must match business owner or designated supervisor"
              className={errors.licenseHolderName ? 'border-red-500' : ''}
            />
            {errors.licenseHolderName && (
              <div className="text-sm text-red-600 mt-1">{errors.licenseHolderName}</div>
            )}
          </div>

          <div className="col-span-2">
            <Label htmlFor="licenseExpiryDate">
              Expiration Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="licenseExpiryDate"
              type="date"
              value={formData.licenseExpiryDate}
              onChange={(e) => updateFormData('licenseExpiryDate', e.target.value)}
              className={errors.licenseExpiryDate ? 'border-red-500' : ''}
            />
            {errors.licenseExpiryDate && (
              <div className="text-sm text-red-600 mt-1">{errors.licenseExpiryDate}</div>
            )}
          </div>

          <div className="col-span-2">
            <Label htmlFor="licensePhoto">Upload License Photo</Label>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  // In real implementation, this would trigger file upload
                  alert('File upload would be implemented here');
                }}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 transition-colors"
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">Click to upload license photo</span>
              </button>
              <div className="text-xs text-gray-500 mt-1">
                We will extract the number using OCR
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trade-specific certifications */}
      {formData.specialty === 'locksmith' && (
        <div className="space-y-4 pt-6 border-t">
          <div className="flex items-center gap-2 text-gray-900 font-medium">
            <Shield className="w-5 h-5" />
            <span>Locksmith Certifications</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="aloaMemberNumber">ALOA Member Number</Label>
              <Input
                id="aloaMemberNumber"
                value={formData.aloaMemberNumber}
                onChange={(e) => updateFormData('aloaMemberNumber', e.target.value)}
                placeholder="Optional - we will verify with ALOA"
              />
            </div>

            <div>
              <Label htmlFor="bondCompany">Surety Bond Company</Label>
              <Input
                id="bondCompany"
                value={formData.bondCompany}
                onChange={(e) => updateFormData('bondCompany', e.target.value)}
                placeholder="Optional but recommended"
              />
            </div>

            <div>
              <Label htmlFor="bondAmount">Bond Amount</Label>
              <Input
                id="bondAmount"
                value={formData.bondAmount}
                onChange={(e) => updateFormData('bondAmount', e.target.value)}
                placeholder="$10,000"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="bondExpiryDate">Bond Expiration Date</Label>
              <Input
                id="bondExpiryDate"
                type="date"
                value={formData.bondExpiryDate}
                onChange={(e) => updateFormData('bondExpiryDate', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {formData.specialty === 'hvac' && (
        <div className="space-y-4 pt-6 border-t">
          <div className="flex items-center gap-2 text-gray-900 font-medium">
            <Snowflake className="w-5 h-5" />
            <span>EPA Certification</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="epaCertificationNumber">
                EPA Section 608 Certification Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="epaCertificationNumber"
                value={formData.epaCertificationNumber}
                onChange={(e) => updateFormData('epaCertificationNumber', e.target.value)}
                placeholder="Required for refrigerant handling"
              />
              <div className="text-xs text-gray-500 mt-1">We will verify with EPA database</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderInsurance = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-900 font-medium">
          <Shield className="w-5 h-5" />
          <span>Insurance Coverage</span>
        </div>
        <p className="text-sm text-gray-600">
          Upload your Certificate of Insurance - we will read it for you
        </p>

        <div className="space-y-4">
          <div>
            <Label>Certificate of Insurance (COI)</Label>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  alert('COI upload would be implemented here with OCR parsing');
                }}
                className="flex items-center gap-3 w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 transition-colors"
              >
                <Upload className="w-6 h-6 text-gray-400" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-700">
                    Drag & Drop or Click to Upload PDF
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    We will auto-extract carrier, policy #, dates, and coverage
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="insuranceCarrier">
                Insurance Carrier <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.insuranceCarrier}
                onValueChange={(value) => updateFormData('insuranceCarrier', value)}
              >
                <SelectTrigger className={errors.insuranceCarrier ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_CARRIERS.map((carrier) => (
                    <SelectItem key={carrier} value={carrier}>
                      {carrier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.insuranceCarrier && (
                <div className="text-sm text-red-600 mt-1">{errors.insuranceCarrier}</div>
              )}
            </div>

            <div>
              <Label htmlFor="insurancePolicyNumber">
                Policy Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="insurancePolicyNumber"
                value={formData.insurancePolicyNumber}
                onChange={(e) => updateFormData('insurancePolicyNumber', e.target.value)}
                placeholder="GL-987654321"
                className={errors.insurancePolicyNumber ? 'border-red-500' : ''}
              />
              {errors.insurancePolicyNumber && (
                <div className="text-sm text-red-600 mt-1">{errors.insurancePolicyNumber}</div>
              )}
            </div>

            <div>
              <Label htmlFor="insuranceCoverageAmount">
                Coverage Amount <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.insuranceCoverageAmount}
                onValueChange={(value) => updateFormData('insuranceCoverageAmount', value)}
              >
                <SelectTrigger className={errors.insuranceCoverageAmount ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select amount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="$300,000">$300,000</SelectItem>
                  <SelectItem value="$500,000">$500,000</SelectItem>
                  <SelectItem value="$1,000,000">$1,000,000</SelectItem>
                  <SelectItem value="$2,000,000+">$2,000,000+</SelectItem>
                </SelectContent>
              </Select>
              {errors.insuranceCoverageAmount && (
                <div className="text-sm text-red-600 mt-1">{errors.insuranceCoverageAmount}</div>
              )}
              <div className="flex items-center gap-2 text-xs text-amber-600 mt-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Minimum $500k required for platform</span>
              </div>
            </div>

            <div>
              <Label htmlFor="insuranceExpiryDate">
                Expiration Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="insuranceExpiryDate"
                type="date"
                value={formData.insuranceExpiryDate}
                onChange={(e) => updateFormData('insuranceExpiryDate', e.target.value)}
                className={errors.insuranceExpiryDate ? 'border-red-500' : ''}
              />
              {errors.insuranceExpiryDate && (
                <div className="text-sm text-red-600 mt-1">{errors.insuranceExpiryDate}</div>
              )}
            </div>

            <div>
              <Label htmlFor="insuranceAgentName">Insurance Agent Name</Label>
              <Input
                id="insuranceAgentName"
                value={formData.insuranceAgentName}
                onChange={(e) => updateFormData('insuranceAgentName', e.target.value)}
                placeholder="For verification"
              />
              <div className="text-xs text-gray-500 mt-1">We may call to verify if needed</div>
            </div>

            <div>
              <Label htmlFor="insuranceAgentPhone">Insurance Agent Phone</Label>
              <Input
                id="insuranceAgentPhone"
                type="tel"
                value={formData.insuranceAgentPhone}
                onChange={(e) => updateFormData('insuranceAgentPhone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Workers Comp Section */}
      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center gap-2 text-gray-900 font-medium">
          <Users className="w-5 h-5" />
          <span>Workers Compensation Insurance</span>
        </div>
        <p className="text-sm text-gray-600">Required if you have employees</p>

        <div className="space-y-4">
          <div>
            <Label>Do you have employees?</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasEmployees"
                  checked={formData.hasEmployees === true}
                  onChange={() => updateFormData('hasEmployees', true)}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm text-gray-700">Yes, I have W-2 employees</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasEmployees"
                  checked={formData.hasEmployees === false}
                  onChange={() => updateFormData('hasEmployees', false)}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm text-gray-700">No, owner-operator only</span>
              </label>
            </div>
          </div>

          {formData.hasEmployees && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="col-span-2">
                <div className="flex items-center gap-2 text-sm text-amber-800 mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Workers Comp coverage required</span>
                </div>
              </div>

              <div>
                <Label htmlFor="workersCompCarrier">
                  Workers Comp Carrier <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="workersCompCarrier"
                  value={formData.workersCompCarrier}
                  onChange={(e) => updateFormData('workersCompCarrier', e.target.value)}
                  placeholder="Carrier name"
                  className={errors.workersCompCarrier ? 'border-red-500' : ''}
                />
                {errors.workersCompCarrier && (
                  <div className="text-sm text-red-600 mt-1">{errors.workersCompCarrier}</div>
                )}
              </div>

              <div>
                <Label htmlFor="workersCompPolicyNumber">
                  Policy Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="workersCompPolicyNumber"
                  value={formData.workersCompPolicyNumber}
                  onChange={(e) => updateFormData('workersCompPolicyNumber', e.target.value)}
                  placeholder="Policy number"
                  className={errors.workersCompPolicyNumber ? 'border-red-500' : ''}
                />
                {errors.workersCompPolicyNumber && (
                  <div className="text-sm text-red-600 mt-1">{errors.workersCompPolicyNumber}</div>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="workersCompExpiryDate">
                  Expiration Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="workersCompExpiryDate"
                  type="date"
                  value={formData.workersCompExpiryDate}
                  onChange={(e) => updateFormData('workersCompExpiryDate', e.target.value)}
                  className={errors.workersCompExpiryDate ? 'border-red-500' : ''}
                />
                {errors.workersCompExpiryDate && (
                  <div className="text-sm text-red-600 mt-1">{errors.workersCompExpiryDate}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTaxPayment = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-900 font-medium">
          <FileText className="w-5 h-5" />
          <span>Tax Information</span>
        </div>
        <p className="text-sm text-gray-600">For 1099 reporting</p>

        <div className="space-y-4">
          <div>
            <Label>Upload W-9 Form</Label>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  alert('W-9 upload would be implemented here with parsing');
                }}
                className="flex items-center gap-3 w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 transition-colors"
              >
                <Upload className="w-6 h-6 text-gray-400" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-700">
                    Drag & Drop or Click to Upload PDF
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    We will auto-extract legal name, EIN, entity type, and address
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center gap-2 text-gray-900 font-medium">
          <DollarSign className="w-5 h-5" />
          <span>Payment Setup</span>
        </div>
        <p className="text-sm text-gray-600">For fast payouts</p>

        <div className="space-y-4">
          <div>
            <Label>How would you like to receive payment?</Label>
            <div className="mt-3 space-y-3">
              <button
                type="button"
                onClick={() => {
                  alert('Plaid bank connection would be implemented here');
                  updateFormData('bankVerificationMethod', 'plaid');
                }}
                className="flex items-center gap-3 w-full p-4 border-2 border-indigo-200 bg-indigo-50 rounded-lg hover:border-indigo-300 transition-colors"
              >
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">
                    Instant Verification (Recommended)
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Connect Bank Account with Plaid
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <div className="flex items-center gap-1 text-xs text-green-700">
                      <CheckCircle className="w-3 h-3" />
                      <span>Instant verification</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-green-700">
                      <CheckCircle className="w-3 h-3" />
                      <span>Faster payouts</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-green-700">
                      <CheckCircle className="w-3 h-3" />
                      <span>Most secure</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <div className="text-center text-sm text-gray-500">or</div>

              <div className="p-4 border-2 border-gray-200 rounded-lg">
                <div className="font-medium text-gray-900 mb-3">Manual Entry</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => {
                        updateFormData('bankName', e.target.value);
                        updateFormData('bankVerificationMethod', 'manual');
                      }}
                      placeholder="Your bank name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankRoutingNumber">Routing Number</Label>
                    <Input
                      id="bankRoutingNumber"
                      value={formData.bankRoutingNumber}
                      onChange={(e) => {
                        updateFormData('bankRoutingNumber', e.target.value);
                        updateFormData('bankVerificationMethod', 'manual');
                      }}
                      placeholder="9 digits"
                      maxLength={9}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankAccountNumber">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      type="password"
                      value={formData.bankAccountNumber}
                      onChange={(e) => {
                        updateFormData('bankAccountNumber', e.target.value);
                        updateFormData('bankVerificationMethod', 'manual');
                      }}
                      placeholder="Account number"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="bankAccountType">Account Type</Label>
                    <Select
                      value={formData.bankAccountType}
                      onValueChange={(value) => {
                        updateFormData('bankAccountType', value);
                        updateFormData('bankVerificationMethod', 'manual');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Checking">Checking</SelectItem>
                        <SelectItem value="Savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-600 mt-3">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Requires micro-deposit verification (2-3 days)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackgroundCheck = () => (
    <div className="space-y-6">
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-2">For platform safety, all vendors must authorize a background check.</p>
            <p className="mb-2">We use professional background check services to verify:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Criminal history (7 years)</li>
              <li>Sex offender registry</li>
              <li>SSN verification</li>
            </ul>
            <p className="mt-2">
              This check will be run on you (business owner) and any technicians who will enter properties.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-900 font-medium">
          <User className="w-5 h-5" />
          <span>Owner Information</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="ownerFirstName">
              Legal First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ownerFirstName"
              value={formData.ownerFirstName}
              onChange={(e) => updateFormData('ownerFirstName', e.target.value)}
              placeholder="First name"
              className={errors.ownerFirstName ? 'border-red-500' : ''}
            />
            {errors.ownerFirstName && (
              <div className="text-sm text-red-600 mt-1">{errors.ownerFirstName}</div>
            )}
          </div>

          <div>
            <Label htmlFor="ownerMiddleName">Middle Name</Label>
            <Input
              id="ownerMiddleName"
              value={formData.ownerMiddleName}
              onChange={(e) => updateFormData('ownerMiddleName', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <Label htmlFor="ownerLastName">
              Legal Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ownerLastName"
              value={formData.ownerLastName}
              onChange={(e) => updateFormData('ownerLastName', e.target.value)}
              placeholder="Last name"
              className={errors.ownerLastName ? 'border-red-500' : ''}
            />
            {errors.ownerLastName && (
              <div className="text-sm text-red-600 mt-1">{errors.ownerLastName}</div>
            )}
          </div>

          <div>
            <Label htmlFor="ownerDateOfBirth">
              Date of Birth <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ownerDateOfBirth"
              type="date"
              value={formData.ownerDateOfBirth}
              onChange={(e) => updateFormData('ownerDateOfBirth', e.target.value)}
              className={errors.ownerDateOfBirth ? 'border-red-500' : ''}
            />
            {errors.ownerDateOfBirth && (
              <div className="text-sm text-red-600 mt-1">{errors.ownerDateOfBirth}</div>
            )}
          </div>

          <div>
            <Label htmlFor="ownerSsnLast4">
              SSN (Last 4) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ownerSsnLast4"
              value={formData.ownerSsnLast4}
              onChange={(e) => updateFormData('ownerSsnLast4', e.target.value)}
              placeholder="1234"
              maxLength={4}
              className={errors.ownerSsnLast4 ? 'border-red-500' : ''}
            />
            {errors.ownerSsnLast4 && (
              <div className="text-sm text-red-600 mt-1">{errors.ownerSsnLast4}</div>
            )}
          </div>

          <div>
            <Label htmlFor="ownerDriverLicenseState">
              Driver License State <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.ownerDriverLicenseState}
              onValueChange={(value) => updateFormData('ownerDriverLicenseState', value)}
            >
              <SelectTrigger className={errors.ownerDriverLicenseState ? 'border-red-500' : ''}>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ownerDriverLicenseState && (
              <div className="text-sm text-red-600 mt-1">{errors.ownerDriverLicenseState}</div>
            )}
          </div>

          <div className="col-span-3">
            <Label htmlFor="ownerDriverLicenseNumber">
              Driver License Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ownerDriverLicenseNumber"
              value={formData.ownerDriverLicenseNumber}
              onChange={(e) => updateFormData('ownerDriverLicenseNumber', e.target.value)}
              placeholder="License number"
              className={errors.ownerDriverLicenseNumber ? 'border-red-500' : ''}
            />
            {errors.ownerDriverLicenseNumber && (
              <div className="text-sm text-red-600 mt-1">{errors.ownerDriverLicenseNumber}</div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.backgroundCheckConsent}
              onChange={(e) => updateFormData('backgroundCheckConsent', e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <span className="text-sm text-gray-900">
                I authorize PropertyMaster to conduct a background check as described above{' '}
                <span className="text-red-500">*</span>
              </span>
              {errors.backgroundCheckConsent && (
                <div className="text-sm text-red-600 mt-1">{errors.backgroundCheckConsent}</div>
              )}
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.technicianBackgroundCheckConsent}
              onChange={(e) => updateFormData('technicianBackgroundCheckConsent', e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <span className="text-sm text-gray-900">
                I will ensure all technicians pass background checks before they perform services{' '}
                <span className="text-red-500">*</span>
              </span>
              {errors.technicianBackgroundCheckConsent && (
                <div className="text-sm text-red-600 mt-1">
                  {errors.technicianBackgroundCheckConsent}
                </div>
              )}
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderServicesCoverage = () => {
    const services = formData.specialty ? SPECIALTY_SERVICES[formData.specialty] : [];

    // Group services by category
    const servicesByCategory = services.reduce((acc: Record<string, typeof services>, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-medium">
            <Wrench className="w-5 h-5" />
            <span>Services You Offer</span>
          </div>
          <p className="text-sm text-gray-600">Select all services you can provide (minimum 3)</p>

          <div className="space-y-4">
            {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
              <div key={category} className="space-y-2">
                <div className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                  {category}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {categoryServices.map((service) => {
                    const isSelected = formData.selectedServices.includes(service.id);
                    return (
                      <label
                        key={service.id}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-gray-200 hover:border-indigo-300'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFormData('selectedServices', [
                                ...formData.selectedServices,
                                service.id,
                              ]);
                            } else {
                              updateFormData(
                                'selectedServices',
                                formData.selectedServices.filter((id) => id !== service.id),
                              );
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {service.name}
                          </div>
                          <div className="text-xs text-gray-500">{service.typical}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {errors.selectedServices && (
            <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errors.selectedServices}</span>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-6 border-t">
          <div className="flex items-center gap-2 text-gray-900 font-medium">
            <MapPin className="w-5 h-5" />
            <span>Service Area</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="serviceRadius">Service Radius (miles)</Label>
              <Input
                id="serviceRadius"
                type="number"
                value={formData.serviceRadius}
                onChange={(e) => updateFormData('serviceRadius', e.target.value)}
                placeholder="25"
                min="1"
                max="100"
              />
              <div className="text-xs text-gray-500 mt-1">
                How far from your base location will you travel?
              </div>
            </div>

            <div className="col-span-2">
              <Label htmlFor="serviceZipCodes">Service ZIP Codes (optional)</Label>
              <Input
                id="serviceZipCodes"
                value={formData.serviceZipCodes}
                onChange={(e) => updateFormData('serviceZipCodes', e.target.value)}
                placeholder="90210, 90211, 90212"
              />
              <div className="text-xs text-gray-500 mt-1">
                Comma-separated list of ZIP codes you serve
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t">
          <div className="flex items-center gap-2 text-gray-900 font-medium">
            <Clock className="w-5 h-5" />
            <span>Availability</span>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.emergencyAvailable}
                onChange={(e) => updateFormData('emergencyAvailable', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600"
              />
              <span className="text-sm text-gray-900">Available 24/7 for emergencies</span>
            </label>

            <div>
              <Label htmlFor="standardResponseTime">
                Typical Response Time for Emergencies <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.standardResponseTime}
                onValueChange={(value) => updateFormData('standardResponseTime', value)}
              >
                <SelectTrigger className={errors.standardResponseTime ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select response time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Less than 30 minutes</SelectItem>
                  <SelectItem value="60">30-60 minutes</SelectItem>
                  <SelectItem value="120">1-2 hours</SelectItem>
                  <SelectItem value="240">Same day</SelectItem>
                </SelectContent>
              </Select>
              {errors.standardResponseTime && (
                <div className="text-sm text-red-600 mt-1">{errors.standardResponseTime}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrustExperience = () => (
    <div className="space-y-6">
      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="flex items-start gap-3">
          <Star className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">Optional but Recommended</p>
            <p>
              Providing professional associations, reviews, and references helps build credibility
              and speeds up approval.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-900 font-medium">
          <Award className="w-5 h-5" />
          <span>Professional Associations</span>
        </div>
        <p className="text-sm text-gray-600">We verify all memberships</p>

        <div className="grid grid-cols-2 gap-4">
          {formData.specialty === 'locksmith' && (
            <div>
              <Label htmlFor="aloaMemberNumber">ALOA Member Number</Label>
              <Input
                id="aloaMemberNumber"
                value={formData.aloaMemberNumber}
                onChange={(e) => updateFormData('aloaMemberNumber', e.target.value)}
                placeholder="Associated Locksmiths of America"
              />
            </div>
          )}
          {formData.specialty === 'plumber' && (
            <div>
              <Label htmlFor="phccMemberNumber">PHCC Member Number</Label>
              <Input
                id="phccMemberNumber"
                value={formData.phccMemberNumber}
                onChange={(e) => updateFormData('phccMemberNumber', e.target.value)}
                placeholder="Plumbing-Heating-Cooling Contractors"
              />
            </div>
          )}
          {formData.specialty === 'electrician' && (
            <div>
              <Label htmlFor="necaMemberNumber">NECA Member Number</Label>
              <Input
                id="necaMemberNumber"
                value={formData.necaMemberNumber}
                onChange={(e) => updateFormData('necaMemberNumber', e.target.value)}
                placeholder="National Electrical Contractors Association"
              />
            </div>
          )}
          {formData.specialty === 'hvac' && (
            <div>
              <Label htmlFor="accaMemberNumber">ACCA Member Number</Label>
              <Input
                id="accaMemberNumber"
                value={formData.accaMemberNumber}
                onChange={(e) => updateFormData('accaMemberNumber', e.target.value)}
                placeholder="Air Conditioning Contractors of America"
              />
            </div>
          )}

          <div className="col-span-2">
            <Label htmlFor="bbbProfileUrl">Better Business Bureau Profile URL</Label>
            <Input
              id="bbbProfileUrl"
              value={formData.bbbProfileUrl}
              onChange={(e) => updateFormData('bbbProfileUrl', e.target.value)}
              placeholder="https://www.bbb.org/..."
              type="url"
            />
            <div className="text-xs text-gray-500 mt-1">
              We will pull your BBB rating automatically
            </div>
          </div>

          <div className="col-span-2">
            <Label htmlFor="googleBusinessUrl">Google Business Profile URL</Label>
            <Input
              id="googleBusinessUrl"
              value={formData.googleBusinessUrl}
              onChange={(e) => updateFormData('googleBusinessUrl', e.target.value)}
              placeholder="https://g.page/..."
              type="url"
            />
            <div className="text-xs text-gray-500 mt-1">
              We will pull your reviews and rating
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center gap-2 text-gray-900 font-medium">
          <Building className="w-5 h-5" />
          <span>Property Manager References</span>
        </div>
        <p className="text-sm text-gray-600">
          Provide 2-3 references from property management companies (optional)
        </p>

        <div className="text-sm text-gray-500">
          Reference management would be implemented here with dynamic add/remove functionality
        </div>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium text-gray-900 mb-3">Verification Status</div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            {formData.legalBusinessName && formData.ein ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Business Identity</div>
              {formData.legalBusinessName && (
                <div className="text-sm text-gray-600">
                  {formData.legalBusinessName} - {formData.businessState}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            {formData.licenseNumber ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">License</div>
              {formData.licenseNumber && (
                <div className="text-sm text-gray-600">
                  {formData.licenseState} License {formData.licenseNumber}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            {formData.insuranceCarrier && formData.insuranceCoverageAmount ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Insurance</div>
              {formData.insuranceCoverageAmount && (
                <div className="text-sm text-gray-600">
                  {formData.insuranceCoverageAmount} General Liability
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            {formData.backgroundCheckConsent ? (
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Background Check Pending</div>
                  <div className="text-sm">Will be completed within 48 hours</div>
                </div>
              </div>
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            )}
          </div>

          <div className="flex items-start gap-3">
            {formData.selectedServices.length >= 3 ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Services</div>
              {formData.selectedServices.length > 0 && (
                <div className="text-sm text-gray-600">
                  {formData.selectedServices.length} services selected
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">Next Steps</p>
            <p>
              Once submitted, we will review your application within 24-48 hours. You will receive
              an email when approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'specialty':
        return renderSpecialtySelection();
      case 'business_identity':
        return renderBusinessIdentity();
      case 'licensing':
        return renderLicensing();
      case 'insurance':
        return renderInsurance();
      case 'tax_payment':
        return renderTaxPayment();
      case 'background_check':
        return renderBackgroundCheck();
      case 'services_coverage':
        return renderServicesCoverage();
      case 'trust_experience':
        return renderTrustExperience();
      case 'review':
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{getStepTitle(currentStep)}</h2>
            <p className="text-sm text-gray-600 mt-1">{getStepDescription(currentStep)}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="py-6">{renderStepContent()}</div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 'specialty'}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          {currentStep === 'review' ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createVendorMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {createVendorMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
