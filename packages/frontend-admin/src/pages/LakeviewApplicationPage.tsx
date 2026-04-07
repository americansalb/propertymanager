import { useState } from 'react';
import { Building2, MapPin, BedDouble, Bath, DollarSign, CheckCircle, Loader2, Home, Car, PawPrint } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

interface ApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentAddress: string;
  moveInDate: string;
  employmentStatus: string;
  employer: string;
  annualIncome: string;
  numberOfOccupants: string;
  hasPets: string;
  petDetails: string;
  hasVehicle: string;
  vehicleDetails: string;
  references: string;
  additionalNotes: string;
}

const STORAGE_KEY = 'lakeview_applications';

function getStoredApplications() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function storeApplication(application: ApplicationFormData & { id: string; submittedAt: string; passcode: string }) {
  const existing = getStoredApplications();
  existing.push(application);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

function generatePasscode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function LakeviewApplicationPage() {
  const [formData, setFormData] = useState<ApplicationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentAddress: '',
    moveInDate: '',
    employmentStatus: '',
    employer: '',
    annualIncome: '',
    numberOfOccupants: '1',
    hasPets: 'no',
    petDetails: '',
    hasVehicle: 'no',
    vehicleDetails: '',
    references: '',
    additionalNotes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [passcode, setPasscode] = useState('');

  const handleChange = (field: keyof ApplicationFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate submission delay
    setTimeout(() => {
      const code = generatePasscode();
      const application = {
        ...formData,
        id: crypto.randomUUID(),
        submittedAt: new Date().toISOString(),
        passcode: code,
        property: 'Lakeview Apartments',
      };
      storeApplication(application);
      setPasscode(code);
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Thank you, {formData.firstName}! Your application for Lakeview Apartments has been received.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700 mb-2">Your unique passcode:</p>
              <p className="text-3xl font-mono font-bold text-blue-900 tracking-widest">{passcode}</p>
              <p className="text-xs text-blue-600 mt-2">
                Save this passcode. If selected, this will be used to verify your identity.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
              <h3 className="font-medium text-gray-800 mb-2">What happens next?</h3>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>Our team will review all applications</li>
                <li>Selected applicants will be contacted</li>
                <li>Your passcode will be used for verification</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Lakeview Apartments</h1>
            <p className="text-sm text-gray-500">Rental Application</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Property Overview Card */}
        <Card className="mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-bold mb-2">Lakeview Apartments</h2>
                <div className="flex items-center gap-2 text-blue-100">
                  <MapPin className="w-4 h-4" />
                  <span>123 Lakeview Drive, Springfield, IL</span>
                </div>
              </div>
              <Badge className="bg-green-500 hover:bg-green-500 text-white text-sm px-3 py-1">
                Now Accepting Applications
              </Badge>
            </div>
          </div>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <BedDouble className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Bedrooms</p>
                  <p className="font-semibold">1-3 BR</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Bath className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Bathrooms</p>
                  <p className="font-semibold">1-2 BA</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Starting At</p>
                  <p className="font-semibold">$1,200/mo</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Home className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Sq Ft</p>
                  <p className="font-semibold">650 - 1,400</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {['In-Unit Laundry', 'Parking Available', 'Pet Friendly', 'Lake Views', 'Fitness Center', 'Pool'].map((amenity) => (
                <Badge key={amenity} variant="outline" className="text-gray-600">
                  {amenity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>Rental Application</CardTitle>
            <CardDescription>
              Please fill out all required fields. Your information will be kept confidential.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Personal Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      required
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      required
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="currentAddress">Current Address *</Label>
                    <Input
                      id="currentAddress"
                      required
                      value={formData.currentAddress}
                      onChange={(e) => handleChange('currentAddress', e.target.value)}
                      placeholder="456 Main St, Springfield, IL 62701"
                    />
                  </div>
                </div>
              </div>

              {/* Move-in & Occupancy */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Move-in & Occupancy</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="moveInDate">Desired Move-in Date *</Label>
                    <Input
                      id="moveInDate"
                      type="date"
                      required
                      value={formData.moveInDate}
                      onChange={(e) => handleChange('moveInDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numberOfOccupants">Number of Occupants *</Label>
                    <Select
                      value={formData.numberOfOccupants}
                      onValueChange={(value) => handleChange('numberOfOccupants', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5+">5+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Employment & Income */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Employment & Income</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employmentStatus">Employment Status *</Label>
                    <Select
                      value={formData.employmentStatus}
                      onValueChange={(value) => handleChange('employmentStatus', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-Time Employed</SelectItem>
                        <SelectItem value="part-time">Part-Time Employed</SelectItem>
                        <SelectItem value="self-employed">Self-Employed</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employer">Employer / Company</Label>
                    <Input
                      id="employer"
                      value={formData.employer}
                      onChange={(e) => handleChange('employer', e.target.value)}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="annualIncome">Annual Income *</Label>
                    <Select
                      value={formData.annualIncome}
                      onValueChange={(value) => handleChange('annualIncome', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-30k">Under $30,000</SelectItem>
                        <SelectItem value="30k-50k">$30,000 - $50,000</SelectItem>
                        <SelectItem value="50k-75k">$50,000 - $75,000</SelectItem>
                        <SelectItem value="75k-100k">$75,000 - $100,000</SelectItem>
                        <SelectItem value="100k-150k">$100,000 - $150,000</SelectItem>
                        <SelectItem value="over-150k">Over $150,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Pets & Vehicles */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
                  <PawPrint className="w-5 h-5" /> Pets & <Car className="w-5 h-5" /> Vehicles
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Do you have pets? *</Label>
                    <Select
                      value={formData.hasPets}
                      onValueChange={(value) => handleChange('hasPets', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.hasPets === 'yes' && (
                    <div className="space-y-2">
                      <Label htmlFor="petDetails">Pet Details</Label>
                      <Input
                        id="petDetails"
                        value={formData.petDetails}
                        onChange={(e) => handleChange('petDetails', e.target.value)}
                        placeholder="e.g., 1 dog, Golden Retriever, 60 lbs"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Do you have a vehicle? *</Label>
                    <Select
                      value={formData.hasVehicle}
                      onValueChange={(value) => handleChange('hasVehicle', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.hasVehicle === 'yes' && (
                    <div className="space-y-2">
                      <Label htmlFor="vehicleDetails">Vehicle Details</Label>
                      <Input
                        id="vehicleDetails"
                        value={formData.vehicleDetails}
                        onChange={(e) => handleChange('vehicleDetails', e.target.value)}
                        placeholder="e.g., 2022 Honda Civic, Silver"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* References & Notes */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">References & Additional Info</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="references">References (previous landlord, employer, etc.)</Label>
                    <Textarea
                      id="references"
                      value={formData.references}
                      onChange={(e) => handleChange('references', e.target.value)}
                      placeholder="Name, relationship, phone number"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additionalNotes">Additional Notes</Label>
                    <Textarea
                      id="additionalNotes"
                      value={formData.additionalNotes}
                      onChange={(e) => handleChange('additionalNotes', e.target.value)}
                      placeholder="Anything else you'd like us to know?"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-4">
                  By submitting this application, you certify that the information provided is accurate and complete.
                  You authorize verification of the information contained in this application.
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.employmentStatus || !formData.annualIncome}
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white py-6 px-8 text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>Lakeview Apartments - Managed by PropertyMaster</p>
        </div>
      </footer>
    </div>
  );
}
