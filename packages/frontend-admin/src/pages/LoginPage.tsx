import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Building2, Mail, Loader2 } from 'lucide-react';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [verificationMessage, setVerificationMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  // Check for verification status in URL params
  useEffect(() => {
    const verified = searchParams.get('verified');
    const error = searchParams.get('error');

    if (verified === 'true') {
      setVerificationMessage({
        type: 'success',
        message: 'Email verified successfully! You can now sign in.',
      });
    } else if (error) {
      setVerificationMessage({ type: 'error', message: decodeURIComponent(error) });
    }
  }, [searchParams]);

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      // Refresh token is now in httpOnly cookie - only store accessToken
      login(data.accessToken, data.user);

      // Redirect based on user role
      if (data.user.role === 'VENDOR') {
        navigate('/vendor-dashboard');
      } else {
        navigate('/dashboard');
      }
    },
    onError: (error: any) => {
      // Check if it's an email verification error
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        '';

      if (errorMessage.startsWith('EMAIL_NOT_VERIFIED:')) {
        setNeedsVerification(true);
        setVerificationMessage({
          type: 'info',
          message: errorMessage.replace('EMAIL_NOT_VERIFIED:', ''),
        });
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => authService.resendVerificationEmail(formData.email),
    onSuccess: () => {
      setVerificationMessage({
        type: 'success',
        message: 'Verification email sent! Please check your inbox.',
      });
    },
    onError: () => {
      setVerificationMessage({
        type: 'error',
        message: 'Failed to resend verification email. Please try again.',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNeedsVerification(false);
    loginMutation.mutate(formData);
  };

  const handleResendVerification = () => {
    if (formData.email) {
      resendMutation.mutate();
    }
  };

  const getErrorMessage = () => {
    if (!loginMutation.isError || needsVerification) {
      return null;
    }

    const error = loginMutation.error as any;
    return (
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      'Login failed. Please try again.'
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-xl">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">PropertyMaster</CardTitle>
          <CardDescription>Sign in to your PM Command Center</CardDescription>
        </CardHeader>
        <CardContent>
          {verificationMessage && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                verificationMessage.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : verificationMessage.type === 'info'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>{verificationMessage.message}</p>
                  {needsVerification && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="p-0 h-auto mt-1 text-blue-700 hover:text-blue-800"
                      onClick={handleResendVerification}
                      disabled={resendMutation.isPending}
                    >
                      {resendMutation.isPending ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Resend verification email'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                autoComplete="current-password"
                required
              />
            </div>

            {getErrorMessage() && (
              <div className="text-sm text-destructive">{getErrorMessage()}</div>
            )}

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
