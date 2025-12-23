import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ChevronRight, X, Shield, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface AddMarketplaceVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Quiz funnel steps - one question at a time!
type QuizStep =
  | 'welcome'
  | 'specialty'
  | 'business_name'
  | 'owner_name'
  | 'experience'
  | 'contact_email'
  | 'contact_phone'
  | 'business_address'
  | 'entity_type'
  | 'ein'
  | 'state_incorporation'
  | 'license_state'
  | 'license_number'
  | 'license_expiry'
  | 'insurance_carrier'
  | 'insurance_policy'
  | 'insurance_amount'
  | 'insurance_expiry'
  | 'insurance_agent'
  | 'services'
  | 'service_area'
  | 'emergency'
  | 'legal_terms'
  | 'submitting'
  | 'success';

type VendorSpecialty = 'locksmith' | 'plumber' | 'electrician' | 'hvac' | '';

// Specialty definitions with emojis and fun descriptions
const SPECIALTIES = [
  {
    id: 'locksmith',
    emoji: '🔐',
    title: 'Locksmith',
    tagline: 'Keys to success',
    description: 'Locks, keys, access control',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'plumber',
    emoji: '🚰',
    title: 'Plumber',
    tagline: 'Flow master',
    description: 'Pipes, drains, water heaters',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'electrician',
    emoji: '⚡',
    title: 'Electrician',
    tagline: 'Power player',
    description: 'Wiring, panels, lighting',
    color: 'from-yellow-500 to-amber-500',
  },
  {
    id: 'hvac',
    emoji: '❄️',
    title: 'HVAC',
    tagline: 'Climate control expert',
    description: 'Heating, cooling, air quality',
    color: 'from-cyan-500 to-blue-500',
  },
];

const EXPERIENCE_OPTIONS = [
  { value: '<1', emoji: '🌱', label: 'Just started', subtext: 'Less than 1 year' },
  { value: '1-3', emoji: '🚀', label: 'Getting established', subtext: '1-3 years' },
  { value: '3-5', emoji: '⭐', label: 'Experienced', subtext: '3-5 years' },
  { value: '5-10', emoji: '🏆', label: 'Veteran', subtext: '5-10 years' },
  { value: '10+', emoji: '👑', label: 'Industry expert', subtext: '10+ years' },
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

const ENTITY_TYPES = [
  { value: 'LLC', emoji: '🏢', label: 'LLC', description: 'Limited Liability Company' },
  { value: 'Corporation', emoji: '🏛️', label: 'Corporation', description: 'Inc or Corp' },
  { value: 'Partnership', emoji: '🤝', label: 'Partnership', description: 'General or Limited' },
  {
    value: 'Sole Proprietor',
    emoji: '👤',
    label: 'Sole Proprietor',
    description: 'Individual owner',
  },
];

const LOCKSMITH_SERVICES = [
  { id: 'lockout', name: 'Lockout Service', emoji: '🚪' },
  { id: 'rekey', name: 'Rekey Locks', emoji: '🔑' },
  { id: 'install', name: 'Lock Installation', emoji: '🔧' },
  { id: 'commercial', name: 'Commercial Systems', emoji: '🏢' },
  { id: 'automotive', name: 'Automotive', emoji: '🚗' },
  { id: 'safe', name: 'Safe Services', emoji: '🔒' },
];

const PLUMBER_SERVICES = [
  { id: 'emergency', name: 'Emergency Repairs', emoji: '🚨' },
  { id: 'drain', name: 'Drain Cleaning', emoji: '🌊' },
  { id: 'water_heater', name: 'Water Heaters', emoji: '🔥' },
  { id: 'leaks', name: 'Leak Repair', emoji: '💧' },
  { id: 'install', name: 'Fixture Installation', emoji: '🚽' },
  { id: 'sewer', name: 'Sewer Line', emoji: '🔧' },
];

const ELECTRICIAN_SERVICES = [
  { id: 'emergency', name: 'Emergency Service', emoji: '⚡' },
  { id: 'panel', name: 'Panel Upgrades', emoji: '📊' },
  { id: 'outlets', name: 'Outlets & Switches', emoji: '🔌' },
  { id: 'lighting', name: 'Lighting', emoji: '💡' },
  { id: 'wiring', name: 'Rewiring', emoji: '🔧' },
  { id: 'ev', name: 'EV Chargers', emoji: '🔋' },
];

const HVAC_SERVICES = [
  { id: 'emergency', name: 'Emergency HVAC', emoji: '🚨' },
  { id: 'ac_repair', name: 'A/C Repair', emoji: '❄️' },
  { id: 'heating', name: 'Heating Repair', emoji: '🔥' },
  { id: 'install', name: 'System Installation', emoji: '🏗️' },
  { id: 'maintenance', name: 'Maintenance', emoji: '🔧' },
  { id: 'duct', name: 'Duct Cleaning', emoji: '🌬️' },
];

interface FormData {
  specialty: VendorSpecialty;
  legalBusinessName: string;
  dbaName: string;
  ownerFirstName: string;
  ownerLastName: string;
  yearsInBusiness: string;
  email: string;
  businessPhone: string;
  businessAddress1: string;
  businessAddress2: string;
  businessCity: string;
  businessState: string;
  businessZipCode: string;
  businessEntityType: string;
  ein: string;
  stateOfIncorporation: string;
  licenseState: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  insuranceCarrier: string;
  insurancePolicyNumber: string;
  insuranceCoverageAmount: string;
  insuranceExpiryDate: string;
  insuranceAgentName: string;
  insuranceAgentPhone: string;
  selectedServices: string[];
  serviceRadius: string;
  serviceZipCodes: string;
  emergencyAvailable: boolean;
  standardResponseTime: string;
  independentContractorAcknowledgment: boolean;
  stateLicensingCompliance: boolean;
  insuranceRequirementAcknowledgment: boolean;
  indemnificationAgreement: boolean;
  termsOfServiceAcceptance: boolean;
}

const initialFormData: FormData = {
  specialty: '',
  legalBusinessName: '',
  dbaName: '',
  ownerFirstName: '',
  ownerLastName: '',
  yearsInBusiness: '',
  email: '',
  businessPhone: '',
  businessAddress1: '',
  businessAddress2: '',
  businessCity: '',
  businessState: '',
  businessZipCode: '',
  businessEntityType: '',
  ein: '',
  stateOfIncorporation: '',
  licenseState: '',
  licenseNumber: '',
  licenseExpiryDate: '',
  insuranceCarrier: '',
  insurancePolicyNumber: '',
  insuranceCoverageAmount: '',
  insuranceExpiryDate: '',
  insuranceAgentName: '',
  insuranceAgentPhone: '',
  selectedServices: [],
  serviceRadius: '25',
  serviceZipCodes: '',
  emergencyAvailable: true,
  standardResponseTime: '60',
  independentContractorAcknowledgment: false,
  stateLicensingCompliance: false,
  insuranceRequirementAcknowledgment: false,
  indemnificationAgreement: false,
  termsOfServiceAcceptance: false,
};

// All quiz steps in order
const QUIZ_FLOW: QuizStep[] = [
  'welcome',
  'specialty',
  'business_name',
  'owner_name',
  'experience',
  'contact_email',
  'contact_phone',
  'business_address',
  'entity_type',
  'ein',
  'state_incorporation',
  'license_state',
  'license_number',
  'license_expiry',
  'insurance_carrier',
  'insurance_policy',
  'insurance_amount',
  'insurance_expiry',
  'insurance_agent',
  'services',
  'service_area',
  'emergency',
  'legal_terms',
];

export default function AddMarketplaceVendorModal({
  open,
  onOpenChange,
  onSuccess,
}: AddMarketplaceVendorModalProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<QuizStep>('welcome');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showConfetti, setShowConfetti] = useState(false);

  const createVendorMutation = useMutation({
    mutationFn: async (data: FormData) => {
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
        insuranceCarrier: data.insuranceCarrier,
        insurancePolicyNumber: data.insurancePolicyNumber,
        insuranceCoverageAmount: data.insuranceCoverageAmount,
        insuranceExpiryDate: data.insuranceExpiryDate,
        insuranceAgentName: data.insuranceAgentName,
        insuranceAgentPhone: data.insuranceAgentPhone,
        licenseNumber: data.licenseNumber,
        licenseState: data.licenseState,
        licenseExpiryDate: data.licenseExpiryDate,
        servicesOffered: data.selectedServices,
        serviceZipCodes: data.serviceZipCodes
          .split(',')
          .map((z) => z.trim())
          .filter(Boolean),
        serviceRadius: parseInt(data.serviceRadius) || 25,
        emergencyAvailable: data.emergencyAvailable,
        emergencyResponseTime: parseInt(data.standardResponseTime) || 60,
      };

      const response = await api.post('/vendors', payload);
      return response.data;
    },
    onSuccess: () => {
      setCurrentStep('success');
      setShowConfetti(true);
      onSuccess?.();
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['vendors'] });
        setFormData(initialFormData);
        setCurrentStep('welcome');
        setShowConfetti(false);
        onOpenChange(false);
      }, 3000);
    },
    onError: (error: unknown) => {
      console.error('Error creating vendor:', error);
      alert(`Oops! ${error.response?.data?.message || error.message}`);
      setCurrentStep('legal_terms');
    },
  });

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getCurrentStepIndex = () => QUIZ_FLOW.indexOf(currentStep);
  const getProgress = () => Math.round((getCurrentStepIndex() / QUIZ_FLOW.length) * 100);

  const goNext = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < QUIZ_FLOW.length - 1) {
      setCurrentStep(QUIZ_FLOW[currentIndex + 1]);
    }
  };

  const goBack = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(QUIZ_FLOW[currentIndex - 1]);
    }
  };

  const handleSubmit = () => {
    setCurrentStep('submitting');
    createVendorMutation.mutate(formData);
  };

  const getServicesForSpecialty = () => {
    switch (formData.specialty) {
      case 'locksmith':
        return LOCKSMITH_SERVICES;
      case 'plumber':
        return PLUMBER_SERVICES;
      case 'electrician':
        return ELECTRICIAN_SERVICES;
      case 'hvac':
        return HVAC_SERVICES;
      default:
        return [];
    }
  };

  const toggleService = (serviceId: string) => {
    setFormData((prev) => {
      const isSelected = prev.selectedServices.includes(serviceId);
      return {
        ...prev,
        selectedServices: isSelected
          ? prev.selectedServices.filter((s) => s !== serviceId)
          : [...prev.selectedServices, serviceId],
      };
    });
  };

  // Confetti effect
  useEffect(() => {
    if (showConfetti) {
      const confettiCount = 50;
      const container = document.getElementById('confetti-container');
      if (!container) {
        return;
      }

      for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.animationDelay = `${Math.random() * 3}s`;
        confetti.style.backgroundColor = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][
          Math.floor(Math.random() * 5)
        ];
        container.appendChild(confetti);
      }

      return () => {
        if (container) {
          container.innerHTML = '';
        }
      };
    }
  }, [showConfetti]);

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center space-y-8 py-12 px-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4 animate-bounce">
              <Sparkles className="w-12 h-12" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome to PropertyMaster!
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join the marketplace that connects you with property managers who need your skills.
              Let's get you set up in just a few minutes!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200">
                <div className="text-4xl mb-3">💼</div>
                <h3 className="font-bold text-lg mb-2">More Jobs</h3>
                <p className="text-sm text-gray-600">
                  Get matched with property managers in your area
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl border-2 border-blue-200">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="font-bold text-lg mb-2">Fast Payouts</h3>
                <p className="text-sm text-gray-600">Get paid quickly for completed work</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-200">
                <div className="text-4xl mb-3">⭐</div>
                <h3 className="font-bold text-lg mb-2">Build Your Rep</h3>
                <p className="text-sm text-gray-600">Earn reviews and grow your business</p>
              </div>
            </div>
            <Button
              onClick={goNext}
              size="lg"
              className="mt-8 text-lg px-12 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Let's Go! <ChevronRight className="ml-2" />
            </Button>
          </div>
        );

      case 'specialty':
        return (
          <div className="space-y-8 py-8">
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-bold">What's your superpower?</h2>
              <p className="text-xl text-gray-600">Pick your specialty</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {SPECIALTIES.map((specialty) => (
                <button
                  key={specialty.id}
                  onClick={() => {
                    updateFormData('specialty', specialty.id);
                    setTimeout(goNext, 400);
                  }}
                  className={`group relative overflow-hidden p-8 rounded-3xl border-4 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                    formData.specialty === specialty.id
                      ? `border-blue-600 bg-gradient-to-br ${specialty.color}`
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`text-7xl mb-4 transition-transform duration-300 group-hover:scale-110 ${
                      formData.specialty === specialty.id ? 'animate-bounce' : ''
                    }`}
                  >
                    {specialty.emoji}
                  </div>
                  <h3
                    className={`text-2xl font-bold mb-2 ${
                      formData.specialty === specialty.id ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {specialty.title}
                  </h3>
                  <p
                    className={`text-sm font-semibold mb-3 ${
                      formData.specialty === specialty.id ? 'text-white/90' : 'text-gray-600'
                    }`}
                  >
                    {specialty.tagline}
                  </p>
                  <p
                    className={`text-sm ${
                      formData.specialty === specialty.id ? 'text-white/80' : 'text-gray-500'
                    }`}
                  >
                    {specialty.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'business_name':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">🏢</div>
              <h2 className="text-4xl font-bold">What's your business called?</h2>
              <p className="text-lg text-gray-600">Your legal business name</p>
            </div>
            <div className="space-y-6">
              <div>
                <Input
                  value={formData.legalBusinessName}
                  onChange={(e) => updateFormData('legalBusinessName', e.target.value)}
                  placeholder="ABC Plumbing LLC"
                  className="text-2xl p-8 text-center border-4 rounded-2xl"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">
                  DBA / Trade Name (optional)
                </Label>
                <Input
                  value={formData.dbaName}
                  onChange={(e) => updateFormData('dbaName', e.target.value)}
                  placeholder="Pete's Plumbing"
                  className="text-xl p-6 text-center border-2 rounded-xl"
                />
              </div>
              <Button
                onClick={goNext}
                disabled={!formData.legalBusinessName}
                size="lg"
                className="w-full py-6 text-xl"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'owner_name':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">👤</div>
              <h2 className="text-4xl font-bold">Nice to meet you!</h2>
              <p className="text-lg text-gray-600">What's your name?</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">First Name</Label>
                <Input
                  value={formData.ownerFirstName}
                  onChange={(e) => updateFormData('ownerFirstName', e.target.value)}
                  placeholder="John"
                  className="text-2xl p-6 border-2 rounded-xl"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Last Name</Label>
                <Input
                  value={formData.ownerLastName}
                  onChange={(e) => updateFormData('ownerLastName', e.target.value)}
                  placeholder="Smith"
                  className="text-2xl p-6 border-2 rounded-xl"
                />
              </div>
              <Button
                onClick={goNext}
                disabled={!formData.ownerFirstName || !formData.ownerLastName}
                size="lg"
                className="w-full py-6 text-xl mt-6"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'experience':
        return (
          <div className="space-y-8 py-8">
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-bold">How long have you been doing this?</h2>
              <p className="text-xl text-gray-600">Years of experience</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {EXPERIENCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateFormData('yearsInBusiness', option.value);
                    setTimeout(goNext, 400);
                  }}
                  className={`p-8 rounded-2xl border-4 transition-all duration-300 hover:scale-105 ${
                    formData.yearsInBusiness === option.value
                      ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-purple-50 shadow-xl'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-5xl mb-3">{option.emoji}</div>
                  <h3 className="text-xl font-bold mb-1">{option.label}</h3>
                  <p className="text-sm text-gray-600">{option.subtext}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'contact_email':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-4xl font-bold">Where can we reach you?</h2>
              <p className="text-lg text-gray-600">Your business email</p>
            </div>
            <div className="space-y-6">
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="john@abcplumbing.com"
                className="text-2xl p-8 text-center border-4 rounded-2xl"
                autoFocus
              />
              <Button
                onClick={goNext}
                disabled={!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)}
                size="lg"
                className="w-full py-6 text-xl"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'contact_phone':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">📱</div>
              <h2 className="text-4xl font-bold">Your phone number?</h2>
              <p className="text-lg text-gray-600">So property managers can call you</p>
            </div>
            <div className="space-y-6">
              <Input
                type="tel"
                value={formData.businessPhone}
                onChange={(e) => updateFormData('businessPhone', e.target.value)}
                placeholder="(555) 123-4567"
                className="text-2xl p-8 text-center border-4 rounded-2xl"
                autoFocus
              />
              <Button
                onClick={goNext}
                disabled={!formData.businessPhone}
                size="lg"
                className="w-full py-6 text-xl"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'business_address':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">📍</div>
              <h2 className="text-4xl font-bold">Where are you based?</h2>
              <p className="text-lg text-gray-600">Your business address</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Street Address</Label>
                <Input
                  value={formData.businessAddress1}
                  onChange={(e) => updateFormData('businessAddress1', e.target.value)}
                  placeholder="123 Main St"
                  className="text-xl p-4 border-2 rounded-xl"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Suite/Unit (optional)</Label>
                <Input
                  value={formData.businessAddress2}
                  onChange={(e) => updateFormData('businessAddress2', e.target.value)}
                  placeholder="Suite 100"
                  className="text-xl p-4 border-2 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">City</Label>
                  <Input
                    value={formData.businessCity}
                    onChange={(e) => updateFormData('businessCity', e.target.value)}
                    placeholder="Austin"
                    className="text-xl p-4 border-2 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">State</Label>
                  <select
                    value={formData.businessState}
                    onChange={(e) => updateFormData('businessState', e.target.value)}
                    className="w-full text-xl p-4 border-2 rounded-xl bg-white"
                  >
                    <option value="">Select...</option>
                    {US_STATES.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">ZIP Code</Label>
                <Input
                  value={formData.businessZipCode}
                  onChange={(e) => updateFormData('businessZipCode', e.target.value)}
                  placeholder="78701"
                  className="text-xl p-4 border-2 rounded-xl"
                />
              </div>
              <Button
                onClick={goNext}
                disabled={
                  !formData.businessAddress1 ||
                  !formData.businessCity ||
                  !formData.businessState ||
                  !formData.businessZipCode
                }
                size="lg"
                className="w-full py-6 text-xl mt-6"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'entity_type':
        return (
          <div className="space-y-8 py-8">
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-bold">What type of business entity?</h2>
              <p className="text-xl text-gray-600">Your legal structure</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {ENTITY_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    updateFormData('businessEntityType', type.value);
                    setTimeout(goNext, 400);
                  }}
                  className={`p-8 rounded-2xl border-4 transition-all duration-300 hover:scale-105 ${
                    formData.businessEntityType === type.value
                      ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-purple-50 shadow-xl'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-5xl mb-3">{type.emoji}</div>
                  <h3 className="text-xl font-bold mb-1">{type.label}</h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'ein':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">🔢</div>
              <h2 className="text-4xl font-bold">What's your EIN?</h2>
              <p className="text-lg text-gray-600">Employer Identification Number</p>
              <p className="text-sm text-gray-500">Format: XX-XXXXXXX</p>
            </div>
            <div className="space-y-6">
              <Input
                value={formData.ein}
                onChange={(e) => updateFormData('ein', e.target.value)}
                placeholder="12-3456789"
                className="text-2xl p-8 text-center border-4 rounded-2xl font-mono"
                autoFocus
              />
              <Button
                onClick={goNext}
                disabled={!formData.ein || !/^\d{2}-?\d{7}$/.test(formData.ein)}
                size="lg"
                className="w-full py-6 text-xl"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'state_incorporation':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">🏛️</div>
              <h2 className="text-4xl font-bold">Where are you incorporated?</h2>
              <p className="text-lg text-gray-600">State of incorporation</p>
            </div>
            <div className="space-y-6">
              <select
                value={formData.stateOfIncorporation}
                onChange={(e) => {
                  updateFormData('stateOfIncorporation', e.target.value);
                }}
                className="w-full text-2xl p-6 border-4 rounded-2xl bg-white"
                autoFocus
              >
                <option value="">Select a state...</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
              <Button
                onClick={goNext}
                disabled={!formData.stateOfIncorporation}
                size="lg"
                className="w-full py-6 text-xl"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'license_state':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">📜</div>
              <h2 className="text-4xl font-bold">Let's verify your license</h2>
              <p className="text-lg text-gray-600">Which state issued your license?</p>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <Shield className="w-4 h-4 inline mr-2" />
                  We verify with your state licensing board - they've already done the background
                  check!
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <select
                value={formData.licenseState}
                onChange={(e) => updateFormData('licenseState', e.target.value)}
                className="w-full text-2xl p-6 border-4 rounded-2xl bg-white"
                autoFocus
              >
                <option value="">Select a state...</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
              <Button
                onClick={goNext}
                disabled={!formData.licenseState}
                size="lg"
                className="w-full py-6 text-xl"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'license_number':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">🎫</div>
              <h2 className="text-4xl font-bold">Your license number?</h2>
              <p className="text-lg text-gray-600">State {formData.specialty} license</p>
            </div>
            <div className="space-y-6">
              <Input
                value={formData.licenseNumber}
                onChange={(e) => updateFormData('licenseNumber', e.target.value)}
                placeholder="ABC123456"
                className="text-2xl p-8 text-center border-4 rounded-2xl font-mono uppercase"
                autoFocus
              />
              <Button
                onClick={goNext}
                disabled={!formData.licenseNumber}
                size="lg"
                className="w-full py-6 text-xl"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'license_expiry':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">📅</div>
              <h2 className="text-4xl font-bold">When does it expire?</h2>
              <p className="text-lg text-gray-600">License expiration date</p>
            </div>
            <div className="space-y-6">
              <Input
                type="date"
                value={formData.licenseExpiryDate}
                onChange={(e) => updateFormData('licenseExpiryDate', e.target.value)}
                className="text-2xl p-8 text-center border-4 rounded-2xl"
                autoFocus
              />
              <Button
                onClick={goNext}
                disabled={!formData.licenseExpiryDate}
                size="lg"
                className="w-full py-6 text-xl"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'insurance_carrier':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">🛡️</div>
              <h2 className="text-4xl font-bold">Insurance time!</h2>
              <p className="text-lg text-gray-600">Who's your insurance carrier?</p>
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-green-800">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  General liability insurance protects you and your clients
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <Input
                value={formData.insuranceCarrier}
                onChange={(e) => updateFormData('insuranceCarrier', e.target.value)}
                placeholder="State Farm, Allstate, etc."
                className="text-2xl p-8 text-center border-4 rounded-2xl"
                autoFocus
              />
              <Button
                onClick={goNext}
                disabled={!formData.insuranceCarrier}
                size="lg"
                className="w-full py-6 text-xl"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'insurance_policy':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-4xl font-bold">Policy number?</h2>
              <p className="text-lg text-gray-600">Your insurance policy number</p>
            </div>
            <div className="space-y-6">
              <Input
                value={formData.insurancePolicyNumber}
                onChange={(e) => updateFormData('insurancePolicyNumber', e.target.value)}
                placeholder="POL-123456789"
                className="text-2xl p-8 text-center border-4 rounded-2xl font-mono uppercase"
                autoFocus
              />
              <Button
                onClick={goNext}
                disabled={!formData.insurancePolicyNumber}
                size="lg"
                className="w-full py-6 text-xl"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'insurance_amount':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">💰</div>
              <h2 className="text-4xl font-bold">Coverage amount?</h2>
              <p className="text-lg text-gray-600">Minimum $500,000 required</p>
            </div>
            <div className="space-y-6">
              <select
                value={formData.insuranceCoverageAmount}
                onChange={(e) => updateFormData('insuranceCoverageAmount', e.target.value)}
                className="w-full text-2xl p-6 border-4 rounded-2xl bg-white"
                autoFocus
              >
                <option value="">Select amount...</option>
                <option value="500000">$500,000</option>
                <option value="1000000">$1,000,000</option>
                <option value="2000000">$2,000,000</option>
                <option value="5000000">$5,000,000</option>
              </select>
              <Button
                onClick={goNext}
                disabled={!formData.insuranceCoverageAmount}
                size="lg"
                className="w-full py-6 text-xl"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'insurance_expiry':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">📅</div>
              <h2 className="text-4xl font-bold">Insurance expiration?</h2>
              <p className="text-lg text-gray-600">When does your policy expire?</p>
            </div>
            <div className="space-y-6">
              <Input
                type="date"
                value={formData.insuranceExpiryDate}
                onChange={(e) => updateFormData('insuranceExpiryDate', e.target.value)}
                className="text-2xl p-8 text-center border-4 rounded-2xl"
                autoFocus
              />
              <Button
                onClick={goNext}
                disabled={!formData.insuranceExpiryDate}
                size="lg"
                className="w-full py-6 text-xl"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'insurance_agent':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">👔</div>
              <h2 className="text-4xl font-bold">Insurance agent info</h2>
              <p className="text-lg text-gray-600">So we can verify coverage</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Agent Name</Label>
                <Input
                  value={formData.insuranceAgentName}
                  onChange={(e) => updateFormData('insuranceAgentName', e.target.value)}
                  placeholder="Jane Smith"
                  className="text-xl p-4 border-2 rounded-xl"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Agent Phone</Label>
                <Input
                  type="tel"
                  value={formData.insuranceAgentPhone}
                  onChange={(e) => updateFormData('insuranceAgentPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className="text-xl p-4 border-2 rounded-xl"
                />
              </div>
              <Button
                onClick={goNext}
                disabled={!formData.insuranceAgentName || !formData.insuranceAgentPhone}
                size="lg"
                className="w-full py-6 text-xl mt-6"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'services': {
        const availableServices = getServicesForSpecialty();
        return (
          <div className="space-y-8 py-8">
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-bold">What services do you offer?</h2>
              <p className="text-xl text-gray-600">Select all that apply</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {availableServices.map((service) => (
                <button
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  className={`p-6 rounded-2xl border-4 transition-all duration-200 hover:scale-105 ${
                    formData.selectedServices.includes(service.id)
                      ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">{service.emoji}</div>
                  <h3 className="text-sm font-bold">{service.name}</h3>
                  {formData.selectedServices.includes(service.id) && (
                    <CheckCircle className="w-5 h-5 text-blue-600 mx-auto mt-2" />
                  )}
                </button>
              ))}
            </div>
            <div className="text-center">
              <Button
                onClick={goNext}
                disabled={formData.selectedServices.length === 0}
                size="lg"
                className="px-12 py-6 text-xl"
              >
                Continue ({formData.selectedServices.length} selected){' '}
                <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );
      }

      case 'service_area':
        return (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">🗺️</div>
              <h2 className="text-4xl font-bold">How far will you travel?</h2>
              <p className="text-lg text-gray-600">Service radius from your location</p>
            </div>
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl border-2 border-blue-200">
                <div className="text-6xl font-bold text-blue-600 mb-2">
                  {formData.serviceRadius} miles
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={formData.serviceRadius}
                  onChange={(e) => updateFormData('serviceRadius', e.target.value)}
                  className="w-full h-3 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>5 mi</span>
                  <span>100 mi</span>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">
                  ZIP codes you serve (comma-separated, optional)
                </Label>
                <Input
                  value={formData.serviceZipCodes}
                  onChange={(e) => updateFormData('serviceZipCodes', e.target.value)}
                  placeholder="78701, 78702, 78703"
                  className="text-xl p-4 border-2 rounded-xl font-mono"
                />
              </div>
              <Button onClick={goNext} size="lg" className="w-full py-6 text-xl">
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'emergency':
        return (
          <div className="space-y-8 py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">🚨</div>
              <h2 className="text-4xl font-bold">Do you offer emergency service?</h2>
              <p className="text-xl text-gray-600">24/7 availability for urgent calls</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <button
                onClick={() => {
                  updateFormData('emergencyAvailable', true);
                  updateFormData('standardResponseTime', '30');
                  setTimeout(goNext, 400);
                }}
                className={`p-12 rounded-3xl border-4 transition-all duration-300 hover:scale-105 ${
                  formData.emergencyAvailable
                    ? 'border-green-600 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold mb-2">Yes, I'm available!</h3>
                <p className="text-sm text-gray-600">Emergency calls accepted</p>
              </button>
              <button
                onClick={() => {
                  updateFormData('emergencyAvailable', false);
                  updateFormData('standardResponseTime', '120');
                  setTimeout(goNext, 400);
                }}
                className={`p-12 rounded-3xl border-4 transition-all duration-300 hover:scale-105 ${
                  formData.emergencyAvailable === false
                    ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-purple-50 shadow-xl'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-2xl font-bold mb-2">Scheduled only</h3>
                <p className="text-sm text-gray-600">Regular hours only</p>
              </button>
            </div>
          </div>
        );

      case 'legal_terms': {
        const allTermsAccepted =
          formData.independentContractorAcknowledgment &&
          formData.stateLicensingCompliance &&
          formData.insuranceRequirementAcknowledgment &&
          formData.indemnificationAgreement &&
          formData.termsOfServiceAcceptance;

        return (
          <div className="space-y-8 max-w-4xl mx-auto py-8">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-4">⚖️</div>
              <h2 className="text-4xl font-bold">Almost there!</h2>
              <p className="text-xl text-gray-600">Just a few legal items to review</p>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 space-y-6">
              <label className="flex items-start space-x-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.independentContractorAcknowledgment}
                  onChange={(e) =>
                    updateFormData('independentContractorAcknowledgment', e.target.checked)
                  }
                  className="mt-1 w-6 h-6 rounded border-2 border-gray-300"
                />
                <div className="flex-1">
                  <p className="font-semibold text-lg mb-1">Independent Contractor Status</p>
                  <p className="text-sm text-gray-600">
                    I understand I am an independent contractor, not an employee of PropertyMaster.
                    I am solely responsible for the quality and safety of my work.
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.stateLicensingCompliance}
                  onChange={(e) => updateFormData('stateLicensingCompliance', e.target.checked)}
                  className="mt-1 w-6 h-6 rounded border-2 border-gray-300"
                />
                <div className="flex-1">
                  <p className="font-semibold text-lg mb-1">State Licensing Compliance</p>
                  <p className="text-sm text-gray-600">
                    I maintain all required state licenses and understand PropertyMaster verifies my
                    license is active with the state licensing board.
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.insuranceRequirementAcknowledgment}
                  onChange={(e) =>
                    updateFormData('insuranceRequirementAcknowledgment', e.target.checked)
                  }
                  className="mt-1 w-6 h-6 rounded border-2 border-gray-300"
                />
                <div className="flex-1">
                  <p className="font-semibold text-lg mb-1">Insurance Requirements</p>
                  <p className="text-sm text-gray-600">
                    I maintain current general liability insurance (minimum $500K) and will keep
                    PropertyMaster updated on policy renewals.
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.indemnificationAgreement}
                  onChange={(e) => updateFormData('indemnificationAgreement', e.target.checked)}
                  className="mt-1 w-6 h-6 rounded border-2 border-gray-300"
                />
                <div className="flex-1">
                  <p className="font-semibold text-lg mb-1">Indemnification</p>
                  <p className="text-sm text-gray-600">
                    I agree to indemnify PropertyMaster for any claims arising from my work.
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.termsOfServiceAcceptance}
                  onChange={(e) => updateFormData('termsOfServiceAcceptance', e.target.checked)}
                  className="mt-1 w-6 h-6 rounded border-2 border-gray-300"
                />
                <div className="flex-1">
                  <p className="font-semibold text-lg mb-1">Terms of Service</p>
                  <p className="text-sm text-gray-600">
                    I accept PropertyMaster's Terms of Service and Privacy Policy.
                  </p>
                </div>
              </label>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!allTermsAccepted}
              size="lg"
              className="w-full py-8 text-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              Submit Application 🎉
            </Button>
          </div>
        );
      }

      case 'submitting':
        return (
          <div className="text-center space-y-8 py-20">
            <div className="animate-spin text-8xl mb-8">⚙️</div>
            <h2 className="text-4xl font-bold">Submitting your application...</h2>
            <p className="text-xl text-gray-600">This will just take a moment!</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-8 py-20 relative">
            <div id="confetti-container" className="fixed inset-0 pointer-events-none z-50" />
            <div className="text-8xl mb-8 animate-bounce">🎉</div>
            <h2 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              You're all set!
            </h2>
            <p className="text-2xl text-gray-600 max-w-2xl mx-auto">
              Your application has been submitted! We'll review your info and get you onboarded
              within 24-48 hours.
            </p>
            <div className="text-6xl">✨</div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        <div className="relative min-h-[600px]">
          {/* Header with progress bar */}
          {currentStep !== 'welcome' &&
            currentStep !== 'submitting' &&
            currentStep !== 'success' && (
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={goBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={getCurrentStepIndex() === 0}
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <div className="text-sm font-medium text-gray-600">
                    {getCurrentStepIndex()} of {QUIZ_FLOW.length - 1}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500 ease-out"
                    style={{ width: `${getProgress()}%` }}
                  />
                </div>
              </div>
            )}

          {/* Main content */}
          <div className="p-8">{renderStep()}</div>
        </div>
      </DialogContent>

      {/* Confetti CSS */}
      <style>{`
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: confetti-fall 3s linear forwards;
        }
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </Dialog>
  );
}
