import { Link } from 'react-router-dom';
import { Building2, Home, Briefcase, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-xl">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">PropertyMaster</span>
          </div>
          <Link
            to="/admin"
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Admin Access
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex flex-col items-center justify-center min-h-[70vh]">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Welcome to PropertyMaster
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Your complete property management solution. Choose your portal below to get started.
            </p>
          </div>

          {/* Login Options */}
          <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
            {/* Tenant Login Card */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto p-4 bg-emerald-500/20 rounded-2xl w-fit mb-4 group-hover:bg-emerald-500/30 transition-colors">
                  <Home className="w-12 h-12 text-emerald-400" />
                </div>
                <CardTitle className="text-2xl text-white">Tenant Portal</CardTitle>
                <CardDescription className="text-slate-300">
                  Access your rental dashboard, pay rent, submit maintenance requests, and more.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-slate-400 mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    View lease details & documents
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    Pay rent online securely
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    Submit maintenance requests
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    Message your property manager
                  </li>
                </ul>
                <a href="/tenant/login" className="block">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg">
                    Tenant Login
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Manager Login Card */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto p-4 bg-blue-500/20 rounded-2xl w-fit mb-4 group-hover:bg-blue-500/30 transition-colors">
                  <Briefcase className="w-12 h-12 text-blue-400" />
                </div>
                <CardTitle className="text-2xl text-white">Manager Portal</CardTitle>
                <CardDescription className="text-slate-300">
                  Manage properties, tenants, leases, finances, and work orders all in one place.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-slate-400 mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    Property & unit management
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    Financial tracking & reports
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    Work order management
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    Tenant & lease tracking
                  </li>
                </ul>
                <Link to="/login">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg">
                    Manager Login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Footer Note */}
          <p className="mt-12 text-slate-500 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300">
              Sign up as a property manager
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
