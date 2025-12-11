import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Building2, Mail, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authService } from '../services/auth.service';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    organizationName: '',
    organizationType: 'PROPERTY_MANAGER',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Password requirements
  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'One special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.test(formData.password));

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: () => {
      // Don't auto-login - show verification message instead
      setRegistrationComplete(true);
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => authService.resendVerificationEmail(formData.email),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequirementsMet) {
      return;
    }
    registerMutation.mutate(formData);
  };

  // Success screen after registration
  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-gray-600 mb-6">
              We've sent a verification link to <strong>{formData.email}</strong>. Please click the
              link to verify your email address and activate your account.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-blue-800 mb-2">Next Steps:</h3>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the verification link in the email</li>
                <li>Sign in with your email and password</li>
              </ol>
            </div>

            <div className="space-y-3">
              <Link to="/login">
                <Button className="w-full">Go to Sign In</Button>
              </Link>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : resendMutation.isSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Email Sent!
                  </>
                ) : (
                  "Didn't receive it? Resend email"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-xl">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Get Started with PropertyMaster</CardTitle>
          <CardDescription>Create your organization and start managing properties</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  autoComplete="new-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 text-xs ${
                      req.test(formData.password) ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {req.test(formData.password) ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-current" />
                    )}
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                placeholder="Acme Property Management"
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                autoComplete="organization"
                required
              />
            </div>

            {registerMutation.isError && (
              <div className="text-sm text-destructive p-3 bg-red-50 border border-red-200 rounded-md">
                {(registerMutation.error as any)?.response?.data?.error?.message ||
                  (registerMutation.error as any)?.response?.data?.message ||
                  (registerMutation.error as any)?.message ||
                  'Registration failed. Please check your information and try again.'}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending || !allRequirementsMet}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
