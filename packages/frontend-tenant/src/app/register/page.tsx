'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  AlertCircle,
  Building,
  DoorOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth.store';

interface InvitationInfo {
  firstName: string;
  lastName: string;
  email: string;
  property: string | null;
  unit: string | null;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { validateInvitation, register, isAuthenticated, isLoading, error, clearError } =
    useAuthStore();

  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Password requirements
  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'One special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // Validate invitation token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationError(
          'No invitation token provided. Please use the link from your invitation email.',
        );
        setValidating(false);
        return;
      }

      try {
        const info = await validateInvitation(token);
        setInvitationInfo(info);
        setValidating(false);
      } catch {
        setValidationError(
          'This invitation link is invalid or has expired. Please contact your property manager for a new invitation.',
        );
        setValidating(false);
      }
    };

    validateToken();
  }, [token, validateInvitation]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!password) {
      errors.password = 'Password is required';
    } else {
      const failedRequirements = passwordRequirements.filter((req) => !req.test(password));
      if (failedRequirements.length > 0) {
        errors.password = 'Password does not meet all requirements';
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !token) {
      return;
    }

    try {
      await register(token, password);
      router.push('/dashboard');
    } catch {
      // Error is handled by the store
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  // Validation error state
  if (validationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary rounded-xl shadow-lg">
                <Home className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PropertyMaster</h1>
            <p className="text-gray-600">Tenant Portal</p>
          </div>

          <Card className="shadow-xl border-0">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
                <p className="text-gray-600 mb-6">{validationError}</p>
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Go to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary rounded-xl shadow-lg">
              <Home className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PropertyMaster</h1>
          <p className="text-gray-600">Tenant Portal</p>
        </div>

        {/* Registration Card */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Create Your Account</CardTitle>
            <CardDescription className="text-center">
              Set up your password to access the tenant portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Invitation Info */}
            {invitationInfo && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">Invitation Verified</span>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium">Name:</span> {invitationInfo.firstName}{' '}
                    {invitationInfo.lastName}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Email:</span> {invitationInfo.email}
                  </p>
                  {invitationInfo.property && (
                    <p className="text-gray-700 flex items-center gap-1">
                      <Building className="w-4 h-4 text-gray-500" />
                      {invitationInfo.property}
                      {invitationInfo.unit && (
                        <>
                          <DoorOpen className="w-4 h-4 text-gray-500 ml-2" />
                          Unit {invitationInfo.unit}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-10 pr-10 ${formErrors.password ? 'border-red-500' : ''}`}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-xs text-red-600">{formErrors.password}</p>
                )}

                {/* Password Requirements */}
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-xs ${
                        req.test(password) ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {req.test(password) ? (
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
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 pr-10 ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="text-xs text-red-600">{formErrors.confirmPassword}</p>
                )}
                {password && confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Passwords match
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          &copy; {new Date().getFullYear()} PropertyMaster. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
