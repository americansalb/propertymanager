import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      // Verify user has admin privileges
      if (data.user.role !== 'ADMIN') {
        loginMutation.reset();
        return;
      }

      login(data.accessToken, data.user);
      navigate('/dashboard');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  const isUnauthorized = loginMutation.isSuccess && loginMutation.data?.user?.role !== 'ADMIN';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-red-950 to-slate-950 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>

      <div className="relative w-full max-w-md">
        {/* Warning Banner */}
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-200">
            Restricted access. Authorized administrators only.
          </p>
        </div>

        <Card className="bg-slate-900/90 backdrop-blur-lg border-red-900/50">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-500/20 rounded-2xl border border-red-500/30">
                <Shield className="w-10 h-10 text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">Admin Access</CardTitle>
            <CardDescription className="text-slate-400">
              System administration & godmode management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Admin Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@propertymaster.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  autoComplete="email"
                  required
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    autoComplete="current-password"
                    required
                    className="bg-slate-800/50 border-slate-700 text-white pr-10 focus:border-red-500 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginMutation.isError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-sm text-red-400">
                  {(loginMutation.error as any)?.response?.data?.error?.message ||
                    (loginMutation.error as any)?.response?.data?.message ||
                    (loginMutation.error as any)?.message ||
                    'Authentication failed. Please try again.'}
                </div>
              )}

              {isUnauthorized && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-sm text-red-400">
                  Access denied. This account does not have administrator privileges.
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white py-5"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Authenticating...' : 'Access Admin Panel'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800">
              <p className="text-center text-sm text-slate-500">
                Not an admin?{' '}
                <Link to="/" className="text-blue-400 hover:text-blue-300">
                  Return to main login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-slate-600">
          All access attempts are logged and monitored.
        </p>
      </div>
    </div>
  );
}
