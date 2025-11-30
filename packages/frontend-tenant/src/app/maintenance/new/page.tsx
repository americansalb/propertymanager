'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Camera,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TenantLayout from '@/components/layouts/TenantLayout';

const CATEGORIES = [
  { id: 'Plumbing', label: 'Plumbing', icon: '🚿', description: 'Leaks, clogs, water heater' },
  { id: 'Electrical', label: 'Electrical', icon: '💡', description: 'Outlets, lights, switches' },
  { id: 'HVAC', label: 'HVAC', icon: '❄️', description: 'Heating, cooling, ventilation' },
  { id: 'Appliance', label: 'Appliance', icon: '🔌', description: 'Fridge, stove, dishwasher' },
  { id: 'Pest Control', label: 'Pest Control', icon: '🐜', description: 'Insects, rodents' },
  { id: 'General', label: 'General', icon: '🔧', description: 'Doors, windows, locks' },
  { id: 'Other', label: 'Other', icon: '📝', description: 'Everything else' },
];

const PRIORITIES = [
  {
    id: 'LOW',
    label: 'Low',
    description: 'Not urgent, can wait a few days',
    color: 'border-gray-300',
  },
  {
    id: 'MEDIUM',
    label: 'Medium',
    description: 'Should be addressed soon',
    color: 'border-blue-500',
  },
  { id: 'HIGH', label: 'High', description: 'Needs quick attention', color: 'border-orange-500' },
  {
    id: 'EMERGENCY',
    label: 'Emergency',
    description: 'Safety hazard, needs immediate attention',
    color: 'border-red-500',
  },
];

export default function NewMaintenanceRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    category: '',
    priority: 'MEDIUM',
    title: '',
    description: '',
    location: '',
    permissionToEnter: false,
    preferredTimes: '',
    photos: [] as string[],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/tenant-portal/maintenance', data);
      return response.data.data;
    },
    onSuccess: () => {
      router.push('/maintenance');
    },
  });

  const handleCategorySelect = (categoryId: string) => {
    setFormData((prev) => ({ ...prev, category: categoryId }));
    setStep(2);
  };

  const handlePrioritySelect = (priorityId: string) => {
    setFormData((prev) => ({ ...prev, priority: priorityId }));
    setStep(3);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const canSubmit =
    formData.category && formData.priority && formData.title.trim() && formData.description.trim();

  return (
    <TenantLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/maintenance">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Maintenance Request</h1>
            <p className="text-gray-600">Tell us what needs to be fixed</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-1 mx-1 ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Category */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>What type of issue is this?</CardTitle>
              <CardDescription>Select the category that best describes the problem</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-colors hover:border-primary/50 ${
                      formData.category === category.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200'
                    }`}
                  >
                    <span className="text-3xl">{category.icon}</span>
                    <div>
                      <p className="font-medium">{category.label}</p>
                      <p className="text-sm text-gray-500">{category.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Priority */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>How urgent is this?</CardTitle>
              <CardDescription>This helps us prioritize your request appropriately</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {PRIORITIES.map((priority) => (
                  <button
                    key={priority.id}
                    onClick={() => handlePrioritySelect(priority.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-colors hover:border-primary/50 ${
                      formData.priority === priority.id
                        ? `${priority.color} bg-primary/5`
                        : 'border-gray-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full ${
                        priority.id === 'EMERGENCY'
                          ? 'bg-red-500'
                          : priority.id === 'HIGH'
                            ? 'bg-orange-500'
                            : priority.id === 'MEDIUM'
                              ? 'bg-blue-500'
                              : 'bg-gray-400'
                      }`}
                    />
                    <div>
                      <p className="font-medium">{priority.label}</p>
                      <p className="text-sm text-gray-500">{priority.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {formData.priority === 'EMERGENCY' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Emergency Request</p>
                      <p className="text-sm text-red-700 mt-1">
                        For life-threatening emergencies, please call 911. For urgent property
                        issues (gas leaks, flooding, no heat in winter), call our emergency line
                        directly.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Describe the issue</CardTitle>
                <CardDescription>
                  The more details you provide, the faster we can help
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {createMutation.error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                    {(createMutation.error as any)?.response?.data?.message ||
                      'Failed to submit request'}
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">
                    {CATEGORIES.find((c) => c.id === formData.category)?.icon}
                  </span>
                  <span className="font-medium">{formData.category}</span>
                  <span className="text-gray-400">•</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      formData.priority === 'EMERGENCY'
                        ? 'bg-red-100 text-red-700'
                        : formData.priority === 'HIGH'
                          ? 'bg-orange-100 text-orange-700'
                          : formData.priority === 'MEDIUM'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {formData.priority}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief description of the issue"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <textarea
                    id="description"
                    placeholder="Please describe the issue in detail. When did it start? What have you tried?"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full min-h-[120px] border rounded-md px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location (optional)
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g., Kitchen, Master bathroom, Living room"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredTimes" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Preferred times for service (optional)
                  </Label>
                  <Input
                    id="preferredTimes"
                    placeholder="e.g., Weekday mornings, After 5pm"
                    value={formData.preferredTimes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, preferredTimes: e.target.value }))
                    }
                  />
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50">
                  <input
                    type="checkbox"
                    id="permissionToEnter"
                    checked={formData.permissionToEnter}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, permissionToEnter: e.target.checked }))
                    }
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-primary"
                  />
                  <div>
                    <Label htmlFor="permissionToEnter" className="font-medium">
                      Permission to enter
                    </Label>
                    <p className="text-sm text-gray-500">
                      I give permission for maintenance staff to enter my unit if I&apos;m not home
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Photos (optional)
                  </Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-2">
                      Drag and drop photos here, or click to select
                    </p>
                    <Button variant="outline" size="sm" type="button">
                      <Camera className="w-4 h-4 mr-2" />
                      Upload Photos
                    </Button>
                  </div>
                </div>

                <div className="pt-6 border-t flex justify-between">
                  <Button variant="outline" type="button" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button type="submit" disabled={!canSubmit || createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </TenantLayout>
  );
}
