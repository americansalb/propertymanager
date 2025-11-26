import { useState } from 'react';
import {
  Settings,
  User,
  Bell,
  Shield,
  Building2,
  CreditCard,
  Mail,
  Smartphone,
  Globe,
  Moon,
  Sun,
  Check,
  ChevronRight,
  Save,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuthStore } from '../store/auth.store';

type SettingsTab =
  | 'profile'
  | 'notifications'
  | 'security'
  | 'organization'
  | 'billing'
  | 'preferences';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile form state
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '(555) 123-4567',
    timezone: 'America/Los_Angeles',
  });

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: 'work_orders',
      title: 'Work Order Updates',
      description: 'Get notified when work orders are created, assigned, or completed',
      email: true,
      push: true,
      sms: false,
    },
    {
      id: 'lease_expiring',
      title: 'Lease Expiration Alerts',
      description: 'Receive alerts when leases are expiring within 30/60/90 days',
      email: true,
      push: true,
      sms: true,
    },
    {
      id: 'payment_received',
      title: 'Payment Notifications',
      description: 'Get notified when rent payments are received',
      email: true,
      push: false,
      sms: false,
    },
    {
      id: 'vendor_updates',
      title: 'Vendor Activity',
      description: 'Updates when vendors accept or complete work orders',
      email: true,
      push: true,
      sms: false,
    },
    {
      id: 'emergency',
      title: 'Emergency Alerts',
      description: 'Immediate notifications for emergency work orders',
      email: true,
      push: true,
      sms: true,
    },
  ]);

  // Security settings
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    sessionTimeout: '30',
    loginAlerts: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const toggleNotification = (id: string, channel: 'email' | 'push' | 'sms') => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, [channel]: !n[channel] } : n)),
    );
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            Settings
          </h1>
          <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-2 text-green-600 text-sm font-medium animate-in fade-in">
              <Check className="w-4 h-4" />
              Saved successfully
            </span>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
                <ChevronRight
                  className={`w-4 h-4 ml-auto ${activeTab === id ? 'opacity-100' : 'opacity-0'}`}
                />
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Profile Information</h2>
                  <p className="text-sm text-gray-500">
                    Update your personal details and contact information
                  </p>
                </div>

                <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-2xl font-bold text-white">
                    {profile.firstName[0]}
                    {profile.lastName[0]}
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      Change Photo
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <select
                      value={profile.timezone}
                      onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    >
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Notification Preferences
                  </h2>
                  <p className="text-sm text-gray-500">
                    Choose how you want to receive updates and alerts
                  </p>
                </div>

                {/* Channel headers */}
                <div className="hidden sm:grid grid-cols-[1fr,80px,80px,80px] gap-4 px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700">Notification Type</div>
                  <div className="text-sm font-medium text-gray-700 text-center flex items-center gap-1 justify-center">
                    <Mail className="w-4 h-4" /> Email
                  </div>
                  <div className="text-sm font-medium text-gray-700 text-center flex items-center gap-1 justify-center">
                    <Bell className="w-4 h-4" /> Push
                  </div>
                  <div className="text-sm font-medium text-gray-700 text-center flex items-center gap-1 justify-center">
                    <Smartphone className="w-4 h-4" /> SMS
                  </div>
                </div>

                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr,80px,80px,80px] gap-4 items-center p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">{notification.title}</h4>
                        <p className="text-sm text-gray-500">{notification.description}</p>
                      </div>
                      {(['email', 'push', 'sms'] as const).map((channel) => (
                        <div key={channel} className="flex items-center sm:justify-center gap-2">
                          <span className="sm:hidden text-sm text-gray-500 capitalize">
                            {channel}:
                          </span>
                          <button
                            onClick={() => toggleNotification(notification.id, channel)}
                            className={`w-10 h-6 rounded-full transition-colors relative ${
                              notification[channel] ? 'bg-primary' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                notification[channel] ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Security Settings</h2>
                  <p className="text-sm text-gray-500">
                    Manage your account security and authentication
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Password */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Password</h4>
                        <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Change Password
                      </Button>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          Two-Factor Authentication
                          {security.twoFactorEnabled && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              Enabled
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Button
                        variant={security.twoFactorEnabled ? 'outline' : 'default'}
                        size="sm"
                        onClick={() =>
                          setSecurity({ ...security, twoFactorEnabled: !security.twoFactorEnabled })
                        }
                      >
                        {security.twoFactorEnabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>

                  {/* Session Timeout */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Session Timeout</h4>
                        <p className="text-sm text-gray-500">
                          Automatically log out after inactivity
                        </p>
                      </div>
                      <select
                        value={security.sessionTimeout}
                        onChange={(e) =>
                          setSecurity({ ...security, sessionTimeout: e.target.value })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="120">2 hours</option>
                      </select>
                    </div>
                  </div>

                  {/* Login Alerts */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Login Alerts</h4>
                        <p className="text-sm text-gray-500">
                          Get notified of new sign-ins to your account
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setSecurity({ ...security, loginAlerts: !security.loginAlerts })
                        }
                        className={`w-10 h-6 rounded-full transition-colors relative ${
                          security.loginAlerts ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            security.loginAlerts ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active Sessions */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Active Sessions</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">Current Session</p>
                          <p className="text-xs text-gray-500">
                            Chrome on macOS • San Francisco, CA
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 font-medium">Active now</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Organization Tab */}
            {activeTab === 'organization' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Organization Settings
                  </h2>
                  <p className="text-sm text-gray-500">
                    Manage your organization details and team members
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {user?.organizationName || 'My Organization'}
                      </h3>
                      <p className="text-sm text-gray-500">Professional Plan • 5 team members</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.organizationName || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Email
                    </label>
                    <input
                      type="email"
                      defaultValue="admin@company.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-3">Danger Zone</h3>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Delete Organization
                  </Button>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Billing & Subscription
                  </h2>
                  <p className="text-sm text-gray-500">
                    Manage your subscription plan and payment methods
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-primary to-primary/80 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/80">Current Plan</p>
                      <h3 className="text-xl font-bold">Professional</h3>
                      <p className="text-sm text-white/80 mt-1">$49/month • Billed monthly</p>
                    </div>
                    <Button variant="secondary" size="sm">
                      Upgrade Plan
                    </Button>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Payment Method</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                        <p className="text-sm text-gray-500">Expires 12/25</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Update
                    </Button>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Billing History</h4>
                  <div className="space-y-2">
                    {[
                      { date: 'Nov 1, 2024', amount: '$49.00', status: 'Paid' },
                      { date: 'Oct 1, 2024', amount: '$49.00', status: 'Paid' },
                      { date: 'Sep 1, 2024', amount: '$49.00', status: 'Paid' },
                    ].map((invoice, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                      >
                        <span className="text-sm text-gray-700">{invoice.date}</span>
                        <span className="text-sm font-medium text-gray-900">{invoice.amount}</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          {invoice.status}
                        </span>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Application Preferences
                  </h2>
                  <p className="text-sm text-gray-500">Customize your experience</p>
                </div>

                <div className="space-y-4">
                  {/* Theme */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Theme</h4>
                        <p className="text-sm text-gray-500">Choose your preferred color scheme</p>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setIsDarkMode(false)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            !isDarkMode ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Sun className="w-4 h-4" />
                          Light
                        </button>
                        <button
                          onClick={() => setIsDarkMode(true)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isDarkMode ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Moon className="w-4 h-4" />
                          Dark
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Language</h4>
                        <p className="text-sm text-gray-500">Select your preferred language</p>
                      </div>
                      <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary">
                        <option>English (US)</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                      </select>
                    </div>
                  </div>

                  {/* Date Format */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Date Format</h4>
                        <p className="text-sm text-gray-500">
                          How dates are displayed throughout the app
                        </p>
                      </div>
                      <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary">
                        <option>MM/DD/YYYY</option>
                        <option>DD/MM/YYYY</option>
                        <option>YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>

                  {/* Currency */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Currency</h4>
                        <p className="text-sm text-gray-500">Default currency for financial data</p>
                      </div>
                      <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary">
                        <option>USD ($)</option>
                        <option>EUR (€)</option>
                        <option>GBP (£)</option>
                        <option>CAD (C$)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
