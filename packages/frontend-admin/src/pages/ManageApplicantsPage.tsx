import { useState, useEffect } from 'react';
import { Building2, Users, Search, Eye, EyeOff, Lock, Trash2, Calendar, Mail, Phone, Briefcase, DollarSign, MapPin, PawPrint, Car } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

interface Application {
  id: string;
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
  submittedAt: string;
  passcode: string;
  property: string;
}

// Must match the config in LakeviewApplicationPage.tsx
const PROPERTY = {
  name: 'Lakeview Apartments',
  address: '4130 N Ashland Ave, Chicago, IL',
};

const STORAGE_KEY = 'lakeview_applications';

function getStoredApplications(): Application[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function clearApplications() {
  localStorage.removeItem(STORAGE_KEY);
}

const INCOME_LABELS: Record<string, string> = {
  'under-30k': 'Under $30,000',
  '30k-50k': '$30,000 - $50,000',
  '50k-75k': '$50,000 - $75,000',
  '75k-100k': '$75,000 - $100,000',
  '100k-150k': '$100,000 - $150,000',
  'over-150k': 'Over $150,000',
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  'full-time': 'Full-Time',
  'part-time': 'Part-Time',
  'self-employed': 'Self-Employed',
  'retired': 'Retired',
  'student': 'Student',
  'other': 'Other',
};

export default function ManageApplicantsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [revealedApplicant, setRevealedApplicant] = useState<Application | null>(null);
  const [passcodeError, setPasscodeError] = useState('');
  const [selectedProperty] = useState(PROPERTY.name);

  useEffect(() => {
    setApplications(getStoredApplications());
  }, []);

  const filteredApplications = applications
    .filter((app) => app.property === selectedProperty)
    .filter((app) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        app.firstName.toLowerCase().includes(term) ||
        app.lastName.toLowerCase().includes(term) ||
        app.email.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError('');

    const match = applications.find(
      (app) => app.passcode === passcodeInput.toUpperCase()
    );

    if (match) {
      setRevealedApplicant(match);
      setPasscodeError('');
    } else {
      setPasscodeError('Invalid passcode. No matching applicant found.');
      setRevealedApplicant(null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all applications? This cannot be undone.')) {
      clearApplications();
      setApplications([]);
      setRevealedApplicant(null);
    }
  };

  const handleDeleteApplication = (id: string) => {
    if (window.confirm('Delete this application?')) {
      const updated = applications.filter((app) => app.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setApplications(updated);
      if (revealedApplicant?.id === id) {
        setRevealedApplicant(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Manage Applicants</h1>
              <p className="text-sm text-gray-500">Review rental applications</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-red-600 border-red-200 hover:bg-red-50"
            disabled={applications.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Properties & Applicant List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Properties</CardTitle>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    {filteredApplications.length} applicant{filteredApplications.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-indigo-900">{PROPERTY.name}</p>
                      <p className="text-sm text-indigo-600">{PROPERTY.address}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Applicant List */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Applicants
                  </CardTitle>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {filteredApplications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No applications yet</p>
                    <p className="text-sm mt-1">Applications submitted at /lakeview will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredApplications.map((app) => (
                      <div
                        key={app.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">
                                {app.firstName} {app.lastName}
                              </p>
                              {revealedApplicant?.id === app.id && (
                                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                  Revealed
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {app.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {app.phone}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                <Briefcase className="w-3 h-3 mr-1" />
                                {EMPLOYMENT_LABELS[app.employmentStatus] || app.employmentStatus}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <DollarSign className="w-3 h-3 mr-1" />
                                {INCOME_LABELS[app.annualIncome] || app.annualIncome}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                {app.numberOfOccupants} occupant{app.numberOfOccupants !== '1' ? 's' : ''}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                Move-in: {app.moveInDate}
                              </Badge>
                              {app.hasPets === 'yes' && (
                                <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                  <PawPrint className="w-3 h-3 mr-1" />
                                  Has Pets
                                </Badge>
                              )}
                              {app.hasVehicle === 'yes' && (
                                <Badge variant="outline" className="text-xs">
                                  <Car className="w-3 h-3 mr-1" />
                                  Has Vehicle
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span className="text-xs text-gray-400">
                              {new Date(app.submittedAt).toLocaleDateString()}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteApplication(app.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded details if revealed */}
                        {revealedApplicant?.id === app.id && (
                          <div className="mt-4 pt-4 border-t bg-yellow-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                            <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Full Application Details (Verified via Passcode)
                            </h4>
                            <div className="grid md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Current Address:</span>
                                <p className="font-medium flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {app.currentAddress}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Employer:</span>
                                <p className="font-medium">{app.employer || 'Not provided'}</p>
                              </div>
                              {app.hasPets === 'yes' && app.petDetails && (
                                <div>
                                  <span className="text-gray-500">Pet Details:</span>
                                  <p className="font-medium">{app.petDetails}</p>
                                </div>
                              )}
                              {app.hasVehicle === 'yes' && app.vehicleDetails && (
                                <div>
                                  <span className="text-gray-500">Vehicle Details:</span>
                                  <p className="font-medium">{app.vehicleDetails}</p>
                                </div>
                              )}
                              {app.references && (
                                <div className="md:col-span-2">
                                  <span className="text-gray-500">References:</span>
                                  <p className="font-medium whitespace-pre-wrap">{app.references}</p>
                                </div>
                              )}
                              {app.additionalNotes && (
                                <div className="md:col-span-2">
                                  <span className="text-gray-500">Additional Notes:</span>
                                  <p className="font-medium whitespace-pre-wrap">{app.additionalNotes}</p>
                                </div>
                              )}
                              <div className="md:col-span-2">
                                <span className="text-gray-500">Passcode:</span>
                                <p className="font-mono font-bold text-yellow-800">{app.passcode}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Passcode Verification */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Verify Winner
                </CardTitle>
                <CardDescription>
                  Enter the applicant's passcode to reveal their full application details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasscodeSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="passcode">Applicant Passcode</Label>
                    <Input
                      id="passcode"
                      value={passcodeInput}
                      onChange={(e) => {
                        setPasscodeInput(e.target.value);
                        setPasscodeError('');
                      }}
                      placeholder="Enter passcode..."
                      className="font-mono text-center text-lg tracking-widest uppercase"
                    />
                  </div>
                  {passcodeError && (
                    <p className="text-sm text-red-600">{passcodeError}</p>
                  )}
                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={!passcodeInput.trim()}>
                    <Eye className="w-4 h-4 mr-2" />
                    Reveal Applicant
                  </Button>
                  {revealedApplicant && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setRevealedApplicant(null);
                        setPasscodeInput('');
                      }}
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide Details
                    </Button>
                  )}
                </form>

                {revealedApplicant && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      Match found: {revealedApplicant.firstName} {revealedApplicant.lastName}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Full details shown in the applicant list.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total Applications</span>
                  <span className="font-semibold">{filteredApplications.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">With Pets</span>
                  <span className="font-semibold">
                    {filteredApplications.filter((a) => a.hasPets === 'yes').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">With Vehicles</span>
                  <span className="font-semibold">
                    {filteredApplications.filter((a) => a.hasVehicle === 'yes').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Avg Occupants</span>
                  <span className="font-semibold">
                    {filteredApplications.length > 0
                      ? (
                          filteredApplications.reduce(
                            (sum, a) => sum + (parseInt(a.numberOfOccupants) || 1),
                            0
                          ) / filteredApplications.length
                        ).toFixed(1)
                      : '0'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
