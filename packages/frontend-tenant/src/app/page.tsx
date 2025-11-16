'use client';

import { Home, Wrench, FileText, DollarSign, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TenantPortalHome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Home className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PropertyMaster</h1>
                <p className="text-xs text-gray-500">Tenant Portal</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <User className="w-4 h-4 mr-2" />
              Account
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome Home!</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Manage your lease, pay rent, and request maintenance - all in one place
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-primary/20">
            <CardHeader>
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-3">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Pay Rent</CardTitle>
              <CardDescription>Quick and secure online payment</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Pay Now</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="p-3 bg-orange-100 rounded-lg w-fit mb-3">
                <Wrench className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-lg">Maintenance</CardTitle>
              <CardDescription>Submit a new service request</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Request Service
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="p-3 bg-blue-100 rounded-lg w-fit mb-3">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">My Lease</CardTitle>
              <CardDescription>View lease details & documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Lease
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="p-3 bg-purple-100 rounded-lg w-fit mb-3">
                <Home className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">My Home</CardTitle>
              <CardDescription>Property info & amenities</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Details
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Rent Status */}
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Rent Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Monthly Rent</span>
                <span className="text-2xl font-bold">$2,400</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Due Date</span>
                <span className="font-medium">December 1, 2024</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Paid
                </span>
              </div>
              <Button className="w-full mt-4">Set Up Auto-Pay</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 pb-3 border-b">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Payment Received</p>
                    <p className="text-xs text-gray-500">November 1, 2024</p>
                  </div>
                  <span className="text-sm font-medium">$2,400</span>
                </div>
                <div className="flex items-start gap-3 pb-3 border-b">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Wrench className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Maintenance Completed</p>
                    <p className="text-xs text-gray-500">October 28, 2024</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    Closed
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Lease Renewed</p>
                    <p className="text-xs text-gray-500">October 15, 2024</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Property Info */}
        <Card>
          <CardHeader>
            <CardTitle>Your Property</CardTitle>
            <CardDescription>Sunset Gardens Apartments - Unit 204</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Address</p>
                <p className="font-medium">123 Main Street, Apt 204</p>
                <p className="text-sm text-gray-500">San Francisco, CA 94102</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Lease Term</p>
                <p className="font-medium">12 months</p>
                <p className="text-sm text-gray-500">Jan 1, 2024 - Dec 31, 2024</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Property Manager</p>
                <p className="font-medium">Acme Property Management</p>
                <p className="text-sm text-gray-500">contact@acmepm.com</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © 2024 PropertyMaster. Questions? Contact your property manager.
          </p>
        </div>
      </footer>
    </div>
  );
}
