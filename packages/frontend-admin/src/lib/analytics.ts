/**
 * Frontend analytics helper
 * Tracks events to backend EventsController
 */

interface TrackEventOptions {
  category?: string;
  sessionId?: string;
}

/**
 * Track an event
 * Calls POST /api/events (EventsController)
 * Never throws - analytics failures should not break UX
 */
export async function trackEvent(
  name: string,
  properties: Record<string, unknown> = {},
  options: TrackEventOptions = {},
): Promise<void> {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        category: options.category ?? 'ui',
        properties,
        sessionId: options.sessionId,
      }),
      keepalive: true, // Helpful for beacon-like semantics
    });
  } catch (error) {
    // Swallow analytics errors – never block UX
    console.debug('[Analytics] Failed to track event:', name, error);
  }
}

/**
 * Property-specific event tracking
 */
export const propertyEvents = {
  editOpened: (propertyId: string, source: string) =>
    trackEvent('PROPERTY_EDIT_OPENED', { propertyId, source }, { category: 'property_management' }),

  editSaved: (propertyId: string, fieldsChangedCount: number, source: string) =>
    trackEvent(
      'PROPERTY_EDIT_SAVED',
      { propertyId, fieldsChangedCount, source },
      { category: 'property_management' },
    ),

  editFailed: (propertyId: string, errorCode: string | undefined, source: string) =>
    trackEvent(
      'PROPERTY_EDIT_SAVE_FAILED',
      { propertyId, errorCode, source },
      { category: 'property_management' },
    ),

  viewed: (propertyId: string, source: string) =>
    trackEvent('PROPERTY_VIEWED', { propertyId, source }, { category: 'property_management' }),

  created: (propertyId: string) =>
    trackEvent('PROPERTY_CREATED', { propertyId }, { category: 'property_management' }),

  deleted: (propertyId: string) =>
    trackEvent('PROPERTY_DELETED', { propertyId }, { category: 'property_management' }),
};
