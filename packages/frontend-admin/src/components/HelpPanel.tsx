import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  X,
  Search,
  Book,
  Video,
  MessageCircle,
  Keyboard,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Zap,
  CheckCircle,
  ArrowRight,
  Play,
  Home,
  FileText,
  DollarSign,
  Wrench,
  Users,
  Calendar,
  BarChart3,
  Settings,
  FolderOpen,
  Bell,
} from 'lucide-react';

// Global state for help panel
let helpPanelListeners: ((isOpen: boolean) => void)[] = [];
let helpPanelState = false;

export function useHelpPanel() {
  const [isOpen, setIsOpen] = useState(helpPanelState);

  useEffect(() => {
    console.log('[useHelpPanel] Registering listener');
    const listener = (newState: boolean) => {
      console.log('[useHelpPanel] State changed:', newState);
      setIsOpen(newState);
    };
    helpPanelListeners.push(listener);
    return () => {
      helpPanelListeners = helpPanelListeners.filter((l) => l !== listener);
    };
  }, []);

  const open = useCallback(() => {
    console.log('[useHelpPanel] Opening help panel');
    helpPanelState = true;
    helpPanelListeners.forEach((l) => l(true));
  }, []);

  const close = useCallback(() => {
    console.log('[useHelpPanel] Closing help panel');
    helpPanelState = false;
    helpPanelListeners.forEach((l) => l(false));
  }, []);

  const toggle = useCallback(() => {
    console.log('[useHelpPanel] Toggling help panel');
    helpPanelState = !helpPanelState;
    helpPanelListeners.forEach((l) => l(helpPanelState));
  }, []);

  return { isOpen, open, close, toggle };
}

interface KeyboardShortcut {
  keys: string[];
  description: string;
  action?: () => void;
}

const keyboardShortcuts: KeyboardShortcut[] = [
  { keys: ['⌘', 'K'], description: 'Open command palette / global search' },
  { keys: ['⌘', '/'], description: 'Open help panel' },
  { keys: ['⌘', 'N'], description: 'Create new item (context-aware)' },
  { keys: ['⌘', 'S'], description: 'Save current changes' },
  { keys: ['Esc'], description: 'Close modal / Cancel' },
  { keys: ['↑', '↓'], description: 'Navigate lists' },
  { keys: ['Enter'], description: 'Select / Confirm' },
  { keys: ['⌘', '1-9'], description: 'Quick navigation to pages' },
];

interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  link: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  link: string;
}

const helpArticles: HelpArticle[] = [
  {
    id: '1',
    title: 'Getting Started with PropertyMaster',
    description: 'Learn the basics of property management',
    category: 'Getting Started',
    link: '#',
  },
  {
    id: '2',
    title: 'Managing Properties',
    description: 'Add, edit, and organize your properties',
    category: 'Properties',
    link: '#',
  },
  {
    id: '3',
    title: 'Creating and Managing Leases',
    description: 'Set up lease agreements and track renewals',
    category: 'Leases',
    link: '#',
  },
  {
    id: '4',
    title: 'Work Order Management',
    description: 'Handle maintenance requests efficiently',
    category: 'Work Orders',
    link: '#',
  },
  {
    id: '5',
    title: 'Financial Tracking & Reports',
    description: 'Monitor income, expenses, and generate reports',
    category: 'Financial',
    link: '#',
  },
  {
    id: '6',
    title: 'Vendor Management',
    description: 'Manage contractors and service providers',
    category: 'Vendors',
    link: '#',
  },
  {
    id: '7',
    title: 'Document Organization',
    description: 'Store and organize property documents',
    category: 'Documents',
    link: '#',
  },
  {
    id: '8',
    title: 'Calendar & Scheduling',
    description: 'Schedule inspections, renewals, and tasks',
    category: 'Calendar',
    link: '#',
  },
];

type TabType = 'help' | 'shortcuts' | 'tour' | 'tips';

export default function HelpPanel() {
  const { isOpen, close } = useHelpPanel();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('help');
  const [searchQuery, setSearchQuery] = useState('');
  const [tourStep, setTourStep] = useState(0);
  const [quickStartSteps, setQuickStartSteps] = useState<QuickStartStep[]>([
    {
      id: '1',
      title: 'Add your first property',
      description: 'Create a property to start managing',
      completed: false,
      link: '/properties',
      icon: Home,
    },
    {
      id: '2',
      title: 'Create a lease',
      description: 'Set up a lease agreement for a tenant',
      completed: false,
      link: '/leases',
      icon: FileText,
    },
    {
      id: '3',
      title: 'Add a vendor',
      description: 'Register contractors and service providers',
      completed: false,
      link: '/vendors',
      icon: Users,
    },
    {
      id: '4',
      title: 'Create a work order',
      description: 'Track maintenance and repairs',
      completed: false,
      link: '/work-orders',
      icon: Wrench,
    },
    {
      id: '5',
      title: 'Upload documents',
      description: 'Store important property documents',
      completed: false,
      link: '/documents',
      icon: FolderOpen,
    },
  ]);

  const tourSteps = [
    {
      title: 'Welcome to PropertyMaster!',
      description:
        'This quick tour will help you get familiar with the main features. You can skip at any time.',
      icon: Home,
    },
    {
      title: 'Dashboard Overview',
      description:
        "Your dashboard shows key metrics, recent activity, and quick actions. It's your command center for property management.",
      icon: BarChart3,
    },
    {
      title: 'Property Management',
      description:
        'Add and manage all your properties. Track units, occupancy, and property details in one place.',
      icon: Home,
    },
    {
      title: 'Lease Tracking',
      description:
        'Create leases, track renewals, and manage tenant information. Never miss an expiration date.',
      icon: FileText,
    },
    {
      title: 'Financial Management',
      description:
        'Track rent payments, expenses, and generate financial reports. Stay on top of your cash flow.',
      icon: DollarSign,
    },
    {
      title: 'Work Orders',
      description:
        'Create and assign maintenance tasks to vendors. Track progress from request to completion.',
      icon: Wrench,
    },
    {
      title: 'Global Search',
      description:
        'Press ⌘+K anytime to quickly search and navigate. Find properties, tenants, work orders instantly.',
      icon: Search,
    },
    {
      title: 'Notifications',
      description:
        'Stay updated with real-time notifications about leases, payments, and maintenance.',
      icon: Bell,
    },
    {
      title: "You're All Set!",
      description:
        "You're ready to start managing your properties. Check the help section anytime for more guidance.",
      icon: CheckCircle,
    },
  ];

  // Keyboard shortcut to open help (Cmd+/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        console.log('[HelpPanel] Cmd+/ pressed');
        if (isOpen) {
          close();
        } else {
          helpPanelState = true;
          helpPanelListeners.forEach((l) => l(true));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  // Filter articles based on search
  const filteredArticles = helpArticles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleQuickStartClick = (step: QuickStartStep) => {
    console.log('[HelpPanel] Quick start step clicked:', step.title);
    setQuickStartSteps((prev) =>
      prev.map((s) => (s.id === step.id ? { ...s, completed: true } : s)),
    );
    navigate(step.link);
    close();
  };

  const handleNextTourStep = () => {
    console.log('[HelpPanel] Next tour step, current:', tourStep);
    if (tourStep < tourSteps.length - 1) {
      setTourStep(tourStep + 1);
    } else {
      setTourStep(0);
      setActiveTab('help');
    }
  };

  const handleSkipTour = () => {
    console.log('[HelpPanel] Tour skipped');
    setTourStep(0);
    setActiveTab('help');
  };

  const completedSteps = quickStartSteps.filter((s) => s.completed).length;
  const progressPercent = (completedSteps / quickStartSteps.length) * 100;

  if (!isOpen) {
    return null;
  }

  console.log('[HelpPanel] Rendering, activeTab:', activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={close} />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-white shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Help & Resources</h2>
              <p className="text-xs text-gray-500">Get started with PropertyMaster</p>
            </div>
          </div>
          <button onClick={close} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'help' as TabType, label: 'Help', icon: Book },
            { id: 'shortcuts' as TabType, label: 'Shortcuts', icon: Keyboard },
            { id: 'tour' as TabType, label: 'Tour', icon: Play },
            { id: 'tips' as TabType, label: 'Tips', icon: Lightbulb },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  console.log('[HelpPanel] Tab clicked:', tab.id);
                  setActiveTab(tab.id);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Help Tab */}
          {activeTab === 'help' && (
            <div className="p-4 space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={searchQuery}
                  onChange={(e) => {
                    console.log('[HelpPanel] Search query:', e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Quick Start Progress */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Quick Start Guide</h3>
                  <span className="text-sm text-gray-500">
                    {completedSteps}/{quickStartSteps.length} completed
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="space-y-2">
                  {quickStartSteps.map((step) => {
                    const Icon = step.icon;
                    return (
                      <button
                        key={step.id}
                        onClick={() => handleQuickStartClick(step)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          step.completed ? 'bg-green-50 text-green-700' : 'hover:bg-white/50'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-lg ${
                            step.completed ? 'bg-green-100' : 'bg-white'
                          }`}
                        >
                          {step.completed ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Icon className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p
                            className={`text-sm font-medium ${
                              step.completed ? 'line-through' : ''
                            }`}
                          >
                            {step.title}
                          </p>
                          <p className="text-xs text-gray-500">{step.description}</p>
                        </div>
                        {!step.completed && <ArrowRight className="w-4 h-4 text-gray-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Help Articles */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Help Articles</h3>
                <div className="space-y-2">
                  {filteredArticles.map((article) => (
                    <Link
                      key={article.id}
                      to={article.link}
                      onClick={() => {
                        console.log('[HelpPanel] Article clicked:', article.title);
                        close();
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-primary/10">
                        <Book className="w-4 h-4 text-gray-500 group-hover:text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{article.title}</p>
                        <p className="text-xs text-gray-500">{article.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Contact Support */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 mb-3">Need More Help?</h3>
                <div className="space-y-2">
                  <a
                    href="#"
                    className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Contact Support</p>
                      <p className="text-xs text-gray-500">Get help from our team</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <Video className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Video Tutorials</p>
                      <p className="text-xs text-gray-500">Learn with step-by-step videos</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Shortcuts Tab */}
          {activeTab === 'shortcuts' && (
            <div className="p-4 space-y-4">
              <div className="bg-primary/5 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <h3 className="font-medium text-gray-900">Pro Tip</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Master these keyboard shortcuts to navigate PropertyMaster like a pro!
                </p>
              </div>

              <div className="space-y-2">
                {keyboardShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm text-gray-700">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-600 shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Page Navigation Shortcuts */}
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">Quick Navigation</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: '1', label: 'Dashboard', icon: BarChart3 },
                    { key: '2', label: 'Properties', icon: Home },
                    { key: '3', label: 'Leases', icon: FileText },
                    { key: '4', label: 'Financial', icon: DollarSign },
                    { key: '5', label: 'Work Orders', icon: Wrench },
                    { key: '6', label: 'Vendors', icon: Users },
                    { key: '7', label: 'Documents', icon: FolderOpen },
                    { key: '8', label: 'Calendar', icon: Calendar },
                    { key: '9', label: 'Settings', icon: Settings },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                      >
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">
                          ⌘{item.key}
                        </kbd>
                        <Icon className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-600">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tour Tab */}
          {activeTab === 'tour' && (
            <div className="p-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 text-center">
                {(() => {
                  const CurrentIcon = tourSteps[tourStep].icon;
                  return (
                    <>
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                        <CurrentIcon className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {tourSteps[tourStep].title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        {tourSteps[tourStep].description}
                      </p>

                      {/* Progress dots */}
                      <div className="flex items-center justify-center gap-2 mb-6">
                        {tourSteps.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              console.log('[HelpPanel] Tour dot clicked:', index);
                              setTourStep(index);
                            }}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              index === tourStep
                                ? 'bg-primary w-6'
                                : index < tourStep
                                  ? 'bg-primary/50'
                                  : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={handleSkipTour}
                          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Skip Tour
                        </button>
                        <button
                          onClick={handleNextTourStep}
                          className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                          {tourStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Quick Links */}
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">Jump to Section</h3>
                <div className="space-y-2">
                  {tourSteps.slice(1, -1).map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          console.log('[HelpPanel] Jump to tour step:', index + 1);
                          setTourStep(index + 1);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Icon className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="text-sm text-gray-700">{step.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tips Tab */}
          {activeTab === 'tips' && (
            <div className="p-4 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-medium text-yellow-800">Pro Tips</h3>
                </div>
                <p className="text-sm text-yellow-700">
                  Discover tips and tricks to get the most out of PropertyMaster.
                </p>
              </div>

              {[
                {
                  title: 'Use Global Search for Everything',
                  description:
                    "Press ⌘+K to instantly search across properties, tenants, work orders, and more. It's the fastest way to navigate.",
                  icon: Search,
                },
                {
                  title: 'Set Up Notifications',
                  description:
                    'Configure notification preferences to get alerts for lease expirations, payment reminders, and maintenance updates.',
                  icon: Bell,
                },
                {
                  title: 'Organize with Documents',
                  description:
                    'Upload and categorize documents for each property. Keep contracts, inspection reports, and photos organized.',
                  icon: FolderOpen,
                },
                {
                  title: 'Schedule with Calendar',
                  description:
                    'Use the calendar to schedule property inspections, lease renewals, and maintenance tasks.',
                  icon: Calendar,
                },
                {
                  title: 'Track Vendor Performance',
                  description:
                    'Rate vendors after completing work orders to build a reliable network of service providers.',
                  icon: Users,
                },
                {
                  title: 'Generate Reports',
                  description:
                    'Use the reports section to analyze occupancy, revenue, and maintenance trends across your portfolio.',
                  icon: BarChart3,
                },
                {
                  title: 'Automate Rent Reminders',
                  description:
                    'Set up automatic payment reminders to reduce late payments and improve cash flow.',
                  icon: DollarSign,
                },
                {
                  title: 'Batch Operations',
                  description:
                    'Select multiple items to perform bulk actions like marking notifications as read or updating work order status.',
                  icon: CheckCircle,
                },
              ].map((tip, index) => {
                const Icon = tip.icon;
                return (
                  <div
                    key={index}
                    className="flex gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="p-2 bg-white rounded-lg h-fit">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">{tip.title}</h4>
                      <p className="text-sm text-gray-600">{tip.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Press ⌘+/ to toggle help</span>
            <span>PropertyMaster v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
