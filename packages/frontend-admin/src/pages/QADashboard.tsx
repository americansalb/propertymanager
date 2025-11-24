/**
 * QA / Testing Dashboard
 *
 * Visual smoke test page for verifying deployed backend APIs work.
 * Access at: /qa
 *
 * ⚠️ TEST CREDENTIALS ONLY - Update these for your environment:
 * - TEST_JWT: Valid JWT token from your deployed backend
 * - TEST_PROPERTY_ID: A property ID that exists in your database
 * - TEST_ORG_ID: The organizationId for the test property
 *
 * How to get these:
 * 1. Log in to your app normally
 * 2. Open DevTools > Network tab
 * 3. Look at any API request headers for Authorization: Bearer <JWT>
 * 4. Look at any /properties response for a property ID
 */

import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════
// ⚠️ UPDATE THESE VALUES FOR YOUR ENVIRONMENT
// ═══════════════════════════════════════════════════════════════

const TEST_CONFIG = {
  // Your backend API base URL (should match what your app uses)
  API_BASE_URL: (import.meta as any).env?.VITE_API_URL || '/api/v1',

  // Valid JWT token (get from DevTools after logging in)
  // This should be a real token from your deployed backend
  TEST_JWT:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiT1JHQU5JWkFUSU9OX0FETUlOIiwib3JnYW5pemF0aW9uSWQiOiJ0ZXN0LW9yZy1pZCIsImlhdCI6MTYwOTQ1OTIwMCwiZXhwIjoxOTI0ODE5MjAwfQ.test-signature',

  // A property ID that exists in your database
  TEST_PROPERTY_ID: 'test-property-id-123',

  // The organization ID for the test property
  TEST_ORG_ID: 'test-org-id',
};

// ═══════════════════════════════════════════════════════════════

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

interface TestResult {
  status: TestStatus;
  message?: string;
  data?: any;
  timing?: number;
}

export function QADashboard() {
  const [healthCheck, setHealthCheck] = useState<TestResult>({ status: 'idle' });
  const [propertiesList, setPropertiesList] = useState<TestResult>({ status: 'idle' });
  const [propertyUpdate, setPropertyUpdate] = useState<TestResult>({ status: 'idle' });
  const [eventTracking, setEventTracking] = useState<TestResult>({ status: 'idle' });

  // Helper to make API calls with timing
  async function apiCall(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ data: any; timing: number }> {
    const startTime = performance.now();

    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_CONFIG.TEST_JWT}`,
        ...options.headers,
      },
    });

    const data = await response.json();
    const timing = Math.round(performance.now() - startTime);

    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    return { data, timing };
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 1: Health Check
  // ═══════════════════════════════════════════════════════════════

  async function testHealthCheck() {
    setHealthCheck({ status: 'loading' });
    try {
      const { data, timing } = await apiCall('/health');
      setHealthCheck({
        status: 'success',
        message: `✅ Backend is healthy (${timing}ms)`,
        data,
        timing,
      });
    } catch (error) {
      setHealthCheck({
        status: 'error',
        message: `❌ Health check failed: ${(error as Error).message}`,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 2: Load Properties
  // ═══════════════════════════════════════════════════════════════

  async function testPropertiesList() {
    setPropertiesList({ status: 'loading' });
    try {
      const { data, timing } = await apiCall('/properties');

      const properties = data.data || [];
      setPropertiesList({
        status: 'success',
        message: `✅ Loaded ${properties.length} properties (${timing}ms)`,
        data: properties,
        timing,
      });
    } catch (error) {
      setPropertiesList({
        status: 'error',
        message: `❌ Failed to load properties: ${(error as Error).message}`,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 3: Update Property
  // ═══════════════════════════════════════════════════════════════

  async function testPropertyUpdate() {
    setPropertyUpdate({ status: 'loading' });
    try {
      const testPayload = {
        name: `QA Test Property ${new Date().toLocaleTimeString()}`,
        addressLine1: '123 Test St',
        addressLine2: null,
        city: 'Austin',
        state: 'TX',
        postalCode: '78701',
        country: 'US',
        propertyType: 'MULTIFAMILY',
        active: true,
      };

      const { data, timing } = await apiCall(`/properties/${TEST_CONFIG.TEST_PROPERTY_ID}`, {
        method: 'PUT',
        body: JSON.stringify(testPayload),
      });

      setPropertyUpdate({
        status: 'success',
        message: `✅ Updated property "${data.data?.name}" (${timing}ms)`,
        data: data.data,
        timing,
      });
    } catch (error) {
      setPropertyUpdate({
        status: 'error',
        message: `❌ Update failed: ${(error as Error).message}`,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 4: Event Tracking
  // ═══════════════════════════════════════════════════════════════

  async function testEventTracking() {
    setEventTracking({ status: 'loading' });
    try {
      const testEvent = {
        name: 'QA_DASHBOARD_TEST',
        category: 'qa',
        properties: {
          timestamp: new Date().toISOString(),
          testRun: Math.random().toString(36).substring(7),
        },
      };

      const { data, timing } = await apiCall('/events', {
        method: 'POST',
        body: JSON.stringify(testEvent),
      });

      setEventTracking({
        status: 'success',
        message: `✅ Event tracked (${timing}ms)`,
        data: data.data,
        timing,
      });
    } catch (error) {
      setEventTracking({
        status: 'error',
        message: `❌ Event tracking failed: ${(error as Error).message}`,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UI Rendering
  // ═══════════════════════════════════════════════════════════════

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          QA / Testing Dashboard
        </h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Visual smoke tests for deployed backend APIs
        </p>

        {/* Config Display */}
        <div
          style={{
            background: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            padding: '1rem',
          }}
        >
          <strong>⚠️ Test Configuration:</strong>
          <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            <div>
              API Base: <code>{TEST_CONFIG.API_BASE_URL}</code>
            </div>
            <div>
              JWT: <code>{TEST_CONFIG.TEST_JWT.substring(0, 40)}...</code>
            </div>
            <div>
              Property ID: <code>{TEST_CONFIG.TEST_PROPERTY_ID}</code>
            </div>
            <div>
              Org ID: <code>{TEST_CONFIG.TEST_ORG_ID}</code>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: '#856404' }}>
            📝 Update these in: <code>src/pages/QADashboard.tsx</code>
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => {
            testHealthCheck();
            testPropertiesList();
            testEventTracking();
          }}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.125rem',
            fontWeight: 'bold',
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          🚀 Run All Tests
        </button>
      </div>

      {/* Test Sections */}
      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Section 1: Health Check */}
        <TestSection
          title="1. Backend Health Check"
          description="Verifies backend is running and responding"
          result={healthCheck}
          onTest={testHealthCheck}
          endpoint="GET /health"
        />

        {/* Section 2: Properties List */}
        <TestSection
          title="2. Load Properties"
          description="Fetches all properties for the organization"
          result={propertiesList}
          onTest={testPropertiesList}
          endpoint="GET /properties"
        />

        {/* Section 3: Property Update */}
        <TestSection
          title="3. Update Property"
          description="Tests PUT endpoint with safe test data"
          result={propertyUpdate}
          onTest={testPropertyUpdate}
          endpoint={`PUT /properties/${TEST_CONFIG.TEST_PROPERTY_ID}`}
          warning="⚠️ This modifies the test property name with timestamp"
        />

        {/* Section 4: Event Tracking */}
        <TestSection
          title="4. Track Event"
          description="Sends a test analytics event"
          result={eventTracking}
          onTest={testEventTracking}
          endpoint="POST /events"
        />
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: '3rem',
          padding: '1.5rem',
          background: '#f8f9fa',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>How to Use This Dashboard</h3>
        <ol style={{ paddingLeft: '1.5rem' }}>
          <li>
            <strong>Click "Run All Tests"</strong> to check everything at once
          </li>
          <li>
            <strong>Or click individual test buttons</strong> to run one at a time
          </li>
          <li>
            <strong>Look for ✅ green success</strong> or ❌ red errors
          </li>
          <li>
            <strong>Check response data</strong> to see what the API returned
          </li>
        </ol>

        <h4 style={{ marginTop: '1.5rem' }}>Updating Test Credentials</h4>
        <ol style={{ paddingLeft: '1.5rem' }}>
          <li>Log in to your app normally</li>
          <li>Open DevTools → Network tab</li>
          <li>
            Look at any API request for <code>Authorization: Bearer &lt;JWT&gt;</code>
          </li>
          <li>
            Update <code>TEST_JWT</code> in <code>src/pages/QADashboard.tsx</code>
          </li>
          <li>
            Get a property ID from any <code>/properties</code> response
          </li>
          <li>
            Update <code>TEST_PROPERTY_ID</code> in the same file
          </li>
        </ol>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Test Section Component
// ═══════════════════════════════════════════════════════════════

interface TestSectionProps {
  title: string;
  description: string;
  result: TestResult;
  onTest: () => void;
  endpoint: string;
  warning?: string;
}

function TestSection({ title, description, result, onTest, endpoint, warning }: TestSectionProps) {
  const getStatusColor = () => {
    switch (result.status) {
      case 'idle':
        return '#6c757d';
      case 'loading':
        return '#0066cc';
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
    }
  };

  const getStatusIcon = () => {
    switch (result.status) {
      case 'idle':
        return '⚪';
      case 'loading':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
    }
  };

  return (
    <div
      style={{
        border: '2px solid #dee2e6',
        borderRadius: '8px',
        padding: '1.5rem',
        background: 'white',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
          <p style={{ color: '#666', margin: '0.25rem 0 0 0' }}>{description}</p>
          <code
            style={{
              display: 'inline-block',
              marginTop: '0.5rem',
              padding: '0.25rem 0.5rem',
              background: '#f8f9fa',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            {endpoint}
          </code>
        </div>

        <button
          onClick={onTest}
          disabled={result.status === 'loading'}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            background: result.status === 'loading' ? '#ccc' : '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: result.status === 'loading' ? 'not-allowed' : 'pointer',
            minWidth: '120px',
          }}
        >
          {result.status === 'loading' ? 'Testing...' : 'Run Test'}
        </button>
      </div>

      {warning && (
        <div
          style={{
            background: '#fff3cd',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {warning}
        </div>
      )}

      {/* Status */}
      <div
        style={{
          padding: '1rem',
          background: '#f8f9fa',
          borderRadius: '6px',
          borderLeft: `4px solid ${getStatusColor()}`,
        }}
      >
        <div
          style={{
            fontSize: '1.125rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
          }}
        >
          {getStatusIcon()} Status: {result.status.toUpperCase()}
        </div>

        {result.message && <div style={{ marginBottom: '0.5rem' }}>{result.message}</div>}

        {result.timing !== undefined && (
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            Response time: {result.timing}ms
          </div>
        )}
      </div>

      {/* Response Data */}
      {result.data && (
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            📦 Response Data
          </summary>
          <pre
            style={{
              background: '#f8f9fa',
              padding: '1rem',
              borderRadius: '6px',
              overflow: 'auto',
              fontSize: '0.875rem',
            }}
          >
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
