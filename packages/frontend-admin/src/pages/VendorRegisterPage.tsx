import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, CheckCircle } from 'lucide-react';
import AddMarketplaceVendorModal from '../components/marketplace/AddMarketplaceVendorModal';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function VendorRegisterPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSuccess = () => {
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PropertyManager</h1>
                <p className="text-sm text-gray-500">Vendor Marketplace</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/marketplace-browse')}
              className="flex items-center gap-2"
            >
              Browse Marketplace
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {submitted ? (
          // Success State
          <div className="max-w-2xl mx-auto">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-green-900">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  Application Submitted Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-green-800">
                  Thank you for submitting your vendor application to the PropertyManager
                  Marketplace.
                </p>
                <div className="p-4 bg-white border border-green-200 rounded-lg space-y-2">
                  <h3 className="font-semibold text-gray-900">What happens next?</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>Our team will review your application and verify your credentials</li>
                    <li>
                      We'll contact you via email if we need any additional information or
                      documentation
                    </li>
                    <li>
                      Once approved, you'll receive an email with instructions to access your vendor
                      dashboard
                    </li>
                    <li>You can then start receiving job requests from property managers</li>
                  </ol>
                </div>
                <p className="text-sm text-gray-600">
                  Typical review time: 1-3 business days. We'll notify you at the email address you
                  provided.
                </p>
                <div className="flex gap-3 pt-4">
                  <Button onClick={() => navigate('/marketplace-browse')}>
                    Browse Marketplace
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/login')}>
                    Sign In
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Registration Intro
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-gray-900">
                Join the PropertyManager Marketplace
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Connect with property managers who need your services. Get more jobs, streamline
                your workflow, and grow your business.
              </p>
            </div>

            {/* Benefits Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    More Jobs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Get matched with property managers who need your services. Receive job requests
                    directly to your dashboard.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Easy Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Submit quotes, track work, and get paid quickly. All payments are processed
                    securely through the platform.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Build Reputation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Earn ratings and reviews from satisfied clients. Higher ratings lead to more job
                    opportunities.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* CTA Section */}
            <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
              <CardContent className="py-8">
                <div className="text-center space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Get Started?</h3>
                    <p className="text-gray-600">
                      Complete our quick onboarding to join the marketplace. We'll verify your
                      credentials and get you started within 1-3 business days.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      size="lg"
                      onClick={() => setIsModalOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Store className="w-5 h-5 mr-2" />
                      Start Vendor Application
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => navigate('/marketplace-browse')}
                    >
                      Browse Marketplace First
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Already have an account?{' '}
                    <button
                      onClick={() => navigate('/login')}
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What You'll Need</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div className="space-y-2">
                  <p className="font-medium">✓ Business Information</p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-gray-600">
                    <li>Company name and contact details</li>
                    <li>Business address</li>
                    <li>Years in business</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">✓ Credentials</p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-gray-600">
                    <li>License number (if required in your state)</li>
                    <li>Insurance information</li>
                    <li>Background check authorization</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">✓ Service Details</p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-gray-600">
                    <li>Services you offer</li>
                    <li>Service area (radius or ZIP codes)</li>
                    <li>Response time availability</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">✓ Optional But Helpful</p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-gray-600">
                    <li>Professional certifications</li>
                    <li>Surety bond information</li>
                    <li>Workers' compensation insurance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <p>&copy; 2024 PropertyManager. All rights reserved.</p>
            <div className="flex gap-6">
              <button className="hover:text-indigo-600">Privacy Policy</button>
              <button className="hover:text-indigo-600">Terms of Service</button>
              <button className="hover:text-indigo-600">Support</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Registration Modal */}
      <AddMarketplaceVendorModal
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open && !submitted) {
            setIsModalOpen(false);
          }
        }}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
