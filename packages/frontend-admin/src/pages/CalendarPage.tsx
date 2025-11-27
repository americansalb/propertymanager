import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Wrench,
  FileText,
  Clock,
  CheckCircle,
  Building2,
  Filter,
  List,
  Grid,
  Plus,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../services/api';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  startOfWeek,
  endOfWeek,
} from 'date-fns';

type ViewMode = 'month' | 'week' | 'list';
type EventType = 'work_order' | 'lease_start' | 'lease_end' | 'scheduled_maintenance';

interface CalendarEvent {
  id: string;
  type: EventType;
  title: string;
  date: Date;
  property?: string;
  priority?: string;
  status?: string;
  metadata: Record<string, any>;
}

const eventTypeColors: Record<
  EventType,
  { bg: string; border: string; text: string; dot: string }
> = {
  work_order: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  lease_start: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  lease_end: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
  },
  scheduled_maintenance: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
  },
};

const eventTypeLabels: Record<EventType, string> = {
  work_order: 'Work Order',
  lease_start: 'Lease Start',
  lease_end: 'Lease End',
  scheduled_maintenance: 'Maintenance',
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');

  // Fetch work orders
  const { data: workOrders } = useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
      return response.data.data;
    },
  });

  // Fetch leases
  const { data: leases } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      const response = await api.get('/leases');
      return response.data.data;
    },
  });

  // Generate calendar events from data
  const events = useMemo(() => {
    const calendarEvents: CalendarEvent[] = [];

    // Work order events (scheduled date or created date)
    workOrders?.forEach((wo: any) => {
      const eventDate = wo.scheduledDate ? new Date(wo.scheduledDate) : new Date(wo.createdAt);
      calendarEvents.push({
        id: `wo-${wo.id}`,
        type: 'work_order',
        title: wo.title,
        date: eventDate,
        property: wo.property?.name,
        priority: wo.priority,
        status: wo.status,
        metadata: { workOrderId: wo.id },
      });
    });

    // Lease start events
    leases?.forEach((lease: any) => {
      calendarEvents.push({
        id: `lease-start-${lease.id}`,
        type: 'lease_start',
        title: `Lease Start: ${lease.unit?.property?.name || 'Unknown'} Unit ${lease.unit?.unitNumber || 'N/A'}`,
        date: new Date(lease.startDate),
        property: lease.unit?.property?.name,
        metadata: { leaseId: lease.id, monthlyRent: lease.monthlyRent },
      });

      // Lease end events
      calendarEvents.push({
        id: `lease-end-${lease.id}`,
        type: 'lease_end',
        title: `Lease End: ${lease.unit?.property?.name || 'Unknown'} Unit ${lease.unit?.unitNumber || 'N/A'}`,
        date: new Date(lease.endDate),
        property: lease.unit?.property?.name,
        metadata: { leaseId: lease.id },
      });
    });

    return calendarEvents;
  }, [workOrders, leases]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (typeFilter === 'all') return events;
    return events.filter((e) => e.type === typeFilter);
  }, [events, typeFilter]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter((event) => isSameDay(event.date, date));
  };

  // Get events for selected date
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Navigation
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Stats for current month
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    const monthEvents = filteredEvents.filter((e) => e.date >= monthStart && e.date <= monthEnd);

    return {
      total: monthEvents.length,
      workOrders: monthEvents.filter((e) => e.type === 'work_order').length,
      leaseStarts: monthEvents.filter((e) => e.type === 'lease_start').length,
      leaseEnds: monthEvents.filter((e) => e.type === 'lease_end').length,
    };
  }, [filteredEvents, currentDate]);

  // Upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return filteredEvents
      .filter((e) => e.date >= today && e.date <= weekFromNow)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  }, [filteredEvents]);

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'work_order') {
      navigate(`/work-orders?highlight=${event.metadata.workOrderId}`);
    } else if (event.type === 'lease_start' || event.type === 'lease_end') {
      navigate('/leases');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            Maintenance Calendar
          </h1>
          <p className="text-gray-500 mt-1">
            Schedule and track all property maintenance activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="default" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Schedule Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-100 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{monthStats.total}</p>
              <p className="text-sm text-gray-500">This Month</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{monthStats.workOrders}</p>
              <p className="text-sm text-gray-500">Work Orders</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{monthStats.leaseStarts}</p>
              <p className="text-sm text-gray-500">Lease Starts</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{monthStats.leaseEnds}</p>
              <p className="text-sm text-gray-500">Lease Ends</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500" />
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                typeFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Events
            </button>
            {(Object.keys(eventTypeColors) as EventType[]).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  typeFilter === type
                    ? `${eventTypeColors[type].bg} ${eventTypeColors[type].text} border ${eventTypeColors[type].border}`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${eventTypeColors[type].dot}`} />
                {eventTypeLabels[type]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'month' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {viewMode === 'month' ? (
            <>
              {/* Day Labels */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const dayIsToday = isToday(day);

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors ${
                        !isCurrentMonth ? 'bg-gray-50' : 'hover:bg-gray-50'
                      } ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}`}
                    >
                      <div
                        className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                          dayIsToday
                            ? 'bg-primary text-primary-foreground'
                            : isCurrentMonth
                              ? 'text-gray-900'
                              : 'text-gray-400'
                        }`}
                      >
                        {format(day, 'd')}
                      </div>

                      {/* Event Dots */}
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={`text-xs px-1.5 py-0.5 rounded truncate ${eventTypeColors[event.type].bg} ${eventTypeColors[event.type].text}`}
                            title={event.title}
                          >
                            {event.title.length > 15
                              ? event.title.substring(0, 15) + '...'
                              : event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 font-medium">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* List View */
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {filteredEvents
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${eventTypeColors[event.type].bg}`}>
                        {event.type === 'work_order' ? (
                          <Wrench className={`w-4 h-4 ${eventTypeColors[event.type].text}`} />
                        ) : (
                          <FileText className={`w-4 h-4 ${eventTypeColors[event.type].text}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        <p className="text-sm text-gray-500">
                          {format(event.date, 'EEEE, MMMM d, yyyy')}
                        </p>
                        {event.property && (
                          <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3" />
                            {event.property}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${eventTypeColors[event.type].bg} ${eventTypeColors[event.type].text}`}
                      >
                        {eventTypeLabels[event.type]}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Date Events */}
          {selectedDate && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'event' : 'events'}
                </p>
              </div>

              {selectedDateEvents.length === 0 ? (
                <div className="p-6 text-center">
                  <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No events scheduled</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${eventTypeColors[event.type].dot}`}
                        />
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm">{event.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {eventTypeLabels[event.type]}
                          </p>
                          {event.property && (
                            <p className="text-xs text-gray-400 mt-1">{event.property}</p>
                          )}
                          {event.status && (
                            <span
                              className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                                event.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-700'
                                  : event.status === 'IN_PROGRESS'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {event.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                Upcoming (7 days)
              </h3>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No upcoming events</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => {
                      setSelectedDate(event.date);
                      handleEventClick(event);
                    }}
                    className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${eventTypeColors[event.type].dot}`}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {event.title}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {isToday(event.date) ? 'Today' : format(event.date, 'EEE, MMM d')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Legend</h3>
            <div className="space-y-2">
              {(Object.keys(eventTypeColors) as EventType[]).map((type) => (
                <div key={type} className="flex items-center gap-2 text-sm">
                  <span className={`w-3 h-3 rounded-full ${eventTypeColors[type].dot}`} />
                  <span className="text-gray-700">{eventTypeLabels[type]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
