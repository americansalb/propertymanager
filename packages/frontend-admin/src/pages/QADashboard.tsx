/**
 * QA / Testing Dashboard
 *
 * Founder-friendly smoke test page - just log in and click buttons!
 * Access at: /qa
 *
 * No code editing required - uses your real login session automatically.
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

interface TestResult {
  status: TestStatus;
  message?: string;
  data?: any;
  timing?: number;
  statusCode?: number;
}

interface Property {
  id: string;
  name: string;
  organizationId: string;
}

interface WorkOrder {
  id: string;
  title: string;
  status: string;
  propertyId: string;
}

// ═══════════════════════════════════════════════════════════════
// QA Dashboard Component
// ═══════════════════════════════════════════════════════════════

export function QADashboard() {
  const { accessToken, isAuthenticated, user } = useAuthStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [createdWorkOrder, setCreatedWorkOrder] = useState<WorkOrder | null>(null);

  const [healthCheck, setHealthCheck] = useState<TestResult>({ status: 'idle' });
  const [propertiesList, setPropertiesList] = useState<TestResult>({ status: 'idle' });
  const [propertyUpdate, setPropertyUpdate] = useState<TestResult>({ status: 'idle' });
  const [eventTracking, setEventTracking] = useState<TestResult>({ status: 'idle' });
  const [workOrdersList, setWorkOrdersList] = useState<TestResult>({ status: 'idle' });
  const [workOrderCreate, setWorkOrderCreate] = useState<TestResult>({ status: 'idle' });
  const [workOrderUpdate, setWorkOrderUpdate] = useState<TestResult>({ status: 'idle' });

  // API helper with auth
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const startTime = performance.now();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`/api/v1${endpoint}`, {
      ...options,
      headers,
    });

    const timing = Math.round(performance.now() - startTime);
    let data;

    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    if (!response.ok) {
      throw {
        statusCode: response.status,
        message: data.message || data.error || `HTTP ${response.status}`,
        data,
      };
    }

    return { data, timing, statusCode: response.status };
  };

  // ═══════════════════════════════════════════════════════════════
  // Test Functions
  // ═══════════════════════════════════════════════════════════════

  async function testHealthCheck() {
    setHealthCheck({ status: 'loading' });
    try {
      const { data, timing, statusCode } = await apiCall('/health');
      setHealthCheck({
        status: 'success',
        message: `✅ Backend is healthy (${timing}ms)`,
        data,
        timing,
        statusCode,
      });
    } catch (error: unknown) {
      setHealthCheck({
        status: 'error',
        message: `❌ Health check failed: ${error.message}`,
        statusCode: error.statusCode,
      });
    }
  }

  async function testLoadProperties() {
    setPropertiesList({ status: 'loading' });
    try {
      const { data, timing, statusCode } = await apiCall('/properties');
      const props = data.data || data;
      setProperties(props);
      if (props.length > 0 && !selectedProperty) {
        setSelectedProperty(props[0]);
      }
      setPropertiesList({
        status: 'success',
        message: `✅ Loaded ${props.length} properties (${timing}ms)`,
        data: props,
        timing,
        statusCode,
      });
    } catch (error: unknown) {
      setPropertiesList({
        status: 'error',
        message: `❌ Failed to load properties: ${error.message}`,
        statusCode: error.statusCode,
      });
    }
  }

  async function testPropertyUpdate() {
    if (!selectedProperty) {
      setPropertyUpdate({
        status: 'error',
        message: '❌ No property selected - load properties first',
      });
      return;
    }

    setPropertyUpdate({ status: 'loading' });
    try {
      // ⚠️ IMPORTANT: This payload MUST match exactly what PropertyEditModal sends
      // to ensure QA tests mirror real UI usage (see PropertyEditModal.tsx lines 168-187)
      const testPayload = {
        name: `QA Test Property ${new Date().toLocaleTimeString()}`,
        type: 'MULTIFAMILY',
        status: 'ACTIVE',
        address1: '123 QA Test Street', // Fixed: was addressLine1
        address2: null, // Match modal: null for empty, not undefined
        city: 'Test City',
        state: 'CA',
        zipCode: '90210',
        country: 'US',
        totalUnits: 10,
        yearBuilt: 2020, // Include optional fields to test full payload
        squareFeet: 5000,
      };

      const { data, timing, statusCode } = await apiCall(`/properties/${selectedProperty.id}`, {
        method: 'PUT',
        body: JSON.stringify(testPayload),
      });

      setPropertyUpdate({
        status: 'success',
        message: `✅ Updated property "${data.data?.name || selectedProperty.name}" (${timing}ms)`,
        data: data.data,
        timing,
        statusCode,
      });
    } catch (error: unknown) {
      setPropertyUpdate({
        status: 'error',
        message: `❌ Update failed: ${error.message}`,
        data: error.data,
        statusCode: error.statusCode,
      });
    }
  }

  async function testEventTracking() {
    setEventTracking({ status: 'loading' });
    try {
      const testEvent = {
        name: 'QA_DASHBOARD_TEST',
        category: 'qa',
        properties: {
          timestamp: new Date().toISOString(),
          testRunId: Math.random().toString(36).substring(7),
        },
      };

      const { data, timing, statusCode } = await apiCall('/events', {
        method: 'POST',
        body: JSON.stringify(testEvent),
      });

      setEventTracking({
        status: 'success',
        message: `✅ Event tracked (${timing}ms)`,
        data,
        timing,
        statusCode,
      });
    } catch (error: unknown) {
      setEventTracking({
        status: 'error',
        message: `❌ Event tracking failed: ${error.message}`,
        statusCode: error.statusCode,
      });
    }
  }

  async function testLoadWorkOrders() {
    setWorkOrdersList({ status: 'loading' });
    try {
      const { data, timing, statusCode } = await apiCall('/work-orders');
      const orders = data.data || data;
      // Removed setWorkOrders(orders) as it was unused
      setWorkOrdersList({
        status: 'success',
        message: `✅ Loaded ${orders.length} work orders (${timing}ms)`,
        data: orders,
        timing,
        statusCode,
      });
    } catch (error: unknown) {
      setWorkOrdersList({
        status: 'error',
        message: `❌ Failed to load work orders: ${error.message}`,
        statusCode: error.statusCode,
      });
    }
  }

  async function testCreateWorkOrder(): Promise<WorkOrder | null> {
    if (!selectedProperty) {
      setWorkOrderCreate({
        status: 'error',
        message: '❌ No property selected - load properties first',
      });
      return null;
    }

    setWorkOrderCreate({ status: 'loading' });
    try {
      const testPayload = {
        title: `QA Test Work Order ${new Date().toLocaleTimeString()}`,
        description: 'This is a test work order created by the QA Dashboard',
        type: 'MAINTENANCE',
        priority: 'MEDIUM',
        propertyId: selectedProperty.id,
        permissionToEnter: false,
      };

      const { data, timing, statusCode } = await apiCall('/work-orders', {
        method: 'POST',
        body: JSON.stringify(testPayload),
      });

      const workOrder = data.data || data;
      setCreatedWorkOrder(workOrder);

      setWorkOrderCreate({
        status: 'success',
        message: `✅ Created work order "${workOrder.title}" (${timing}ms)`,
        data: workOrder,
        timing,
        statusCode,
      });

      return workOrder;
    } catch (error: unknown) {
      setWorkOrderCreate({
        status: 'error',
        message: `❌ Create failed: ${error.message}`,
        data: error.data,
        statusCode: error.statusCode,
      });
      return null;
    }
  }

  async function testUpdateWorkOrder(workOrderToUpdate?: WorkOrder | null) {
    const workOrder = workOrderToUpdate || createdWorkOrder;

    if (!workOrder) {
      setWorkOrderUpdate({
        status: 'error',
        message: '❌ No work order to update - create one first',
      });
      return;
    }

    setWorkOrderUpdate({ status: 'loading' });
    try {
      const testPayload = {
        status: 'IN_PROGRESS',
        completionNotes: `Updated by QA Dashboard at ${new Date().toLocaleTimeString()}`,
      };

      const { data, timing, statusCode } = await apiCall(`/work-orders/${workOrder.id}`, {
        method: 'PUT',
        body: JSON.stringify(testPayload),
      });

      const updated = data.data || data;

      setWorkOrderUpdate({
        status: 'success',
        message: `✅ Updated work order to status "${updated.status}" (${timing}ms)`,
        data: updated,
        timing,
        statusCode,
      });
    } catch (error: unknown) {
      setWorkOrderUpdate({
        status: 'error',
        message: `❌ Update failed: ${error.message}`,
        data: error.data,
        statusCode: error.statusCode,
      });
    }
  }

  async function runAllTests() {
    await testHealthCheck();
    if (isAuthenticated) {
      await testLoadProperties();
      await testLoadWorkOrders();
      const createdWO = await testCreateWorkOrder();
      await testUpdateWorkOrder(createdWO);
      await testEventTracking();
    }
  }

  // Auto-load properties when authenticated
  useEffect(() => {
    if (isAuthenticated && properties.length === 0) {
      testLoadProperties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // ═══════════════════════════════════════════════════════════════
  // Overall Status
  // ═══════════════════════════════════════════════════════════════

  const getOverallStatus = () => {
    const tests = [
      healthCheck,
      propertiesList,
      propertyUpdate,
      eventTracking,
      workOrdersList,
      workOrderCreate,
      workOrderUpdate,
    ];
    const ran = tests.filter((t) => t.status !== 'idle');
    const failed = ran.filter((t) => t.status === 'error');
    const running = tests.some((t) => t.status === 'loading');

    if (running) {
      return { icon: '⏳', text: 'Running tests...', color: 'text-yellow-600' };
    }
    if (ran.length === 0) {
      return { icon: '⚪', text: 'No tests run yet', color: 'text-gray-500' };
    }
    if (failed.length === 0) {
      return { icon: '✅', text: `All ${ran.length} tests passed`, color: 'text-green-600' };
    }
    return {
      icon: '❌',
      text: `${failed.length} test${failed.length > 1 ? 's' : ''} failed`,
      color: 'text-red-600',
    };
  };

  const overall = getOverallStatus();

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
        QA / Testing Dashboard
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Visual smoke tests for deployed backend APIs
      </p>

      {/* Auth Status */}
      {!isAuthenticated && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '2rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
          }}
        >
          <strong>⚠️ You're not logged in</strong>
          <p style={{ margin: '0.5rem 0 0 0' }}>
            Please{' '}
            <a href="/login" style={{ color: '#2563eb', textDecoration: 'underline' }}>
              log in
            </a>{' '}
            first, then return to this page.
          </p>
        </div>
      )}

      {isAuthenticated && user && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '2rem',
            backgroundColor: '#dbeafe',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
          }}
        >
          <strong>✅ Logged in as:</strong> {user.email} ({user.role})
        </div>
      )}

      {/* Overall Status */}
      <div
        style={{
          padding: '1rem',
          marginBottom: '2rem',
          backgroundColor: '#f9fafb',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
        }}
      >
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          <span className={overall.color}>
            {overall.icon} {overall.text}
          </span>
        </div>
      </div>

      {/* Selected Property Info */}
      {selectedProperty && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '2rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
          }}
        >
          <strong>🏢 Test Property:</strong> {selectedProperty.name} (
          <code>{selectedProperty.id}</code>)
        </div>
      )}

      {/* Run All Button */}
      <button
        onClick={runAllTests}
        style={{
          padding: '0.75rem 1.5rem',
          marginBottom: '2rem',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        🚀 Run All Tests
      </button>

      {/* Test Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <TestSection
          number={1}
          title="Backend Health Check"
          description="Verifies backend is running and responding"
          endpoint="GET /health"
          result={healthCheck}
          onRun={testHealthCheck}
          requiresAuth={false}
        />

        <TestSection
          number={2}
          title="Load Properties"
          description="Fetches all properties for the organization"
          endpoint="GET /properties"
          result={propertiesList}
          onRun={testLoadProperties}
          requiresAuth={true}
          isAuthenticated={isAuthenticated}
        />

        <TestSection
          number={3}
          title="Update Property"
          description="Tests PUT endpoint with safe test data"
          endpoint={
            selectedProperty ? `PUT /properties/${selectedProperty.id}` : 'PUT /properties/:id'
          }
          result={propertyUpdate}
          onRun={testPropertyUpdate}
          requiresAuth={true}
          isAuthenticated={isAuthenticated}
          note={
            selectedProperty
              ? `⚠️ This modifies "${selectedProperty.name}" (adds timestamp to name)`
              : '⚠️ Load properties first to select a test property'
          }
          disabled={!selectedProperty}
        />

        <TestSection
          number={4}
          title="Track Event"
          description="Sends a test analytics event"
          endpoint="POST /events"
          result={eventTracking}
          onRun={testEventTracking}
          requiresAuth={true}
          isAuthenticated={isAuthenticated}
        />

        <TestSection
          number={5}
          title="Load Work Orders"
          description="Fetches all work orders for the organization"
          endpoint="GET /work-orders"
          result={workOrdersList}
          onRun={testLoadWorkOrders}
          requiresAuth={true}
          isAuthenticated={isAuthenticated}
        />

        <TestSection
          number={6}
          title="Create Work Order"
          description="Creates a new test work order"
          endpoint="POST /work-orders"
          result={workOrderCreate}
          onRun={testCreateWorkOrder}
          requiresAuth={true}
          isAuthenticated={isAuthenticated}
          note={
            selectedProperty
              ? `⚠️ Creates a test work order for "${selectedProperty.name}"`
              : '⚠️ Load properties first to select a test property'
          }
          disabled={!selectedProperty}
        />

        <TestSection
          number={7}
          title="Update Work Order"
          description="Updates the test work order to IN_PROGRESS status"
          endpoint={
            createdWorkOrder ? `PUT /work-orders/${createdWorkOrder.id}` : 'PUT /work-orders/:id'
          }
          result={workOrderUpdate}
          onRun={testUpdateWorkOrder}
          requiresAuth={true}
          isAuthenticated={isAuthenticated}
          note={
            createdWorkOrder
              ? `⚠️ Updates test work order "${createdWorkOrder.title}"`
              : '⚠️ Create a work order first to test updates'
          }
          disabled={!createdWorkOrder}
        />
      </div>

      {/* Instructions */}
      <div
        style={{
          marginTop: '3rem',
          padding: '1.5rem',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>How to Use This Dashboard</h3>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Log in to your app normally (if not already logged in)</li>
          <li>Click "Run All Tests" to check everything at once</li>
          <li>Or click individual test buttons to run one at a time</li>
          <li>Look for ✅ green success or ❌ red errors</li>
          <li>Check HTTP status codes to understand failures (401 = unauthorized, etc.)</li>
        </ul>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Test Section Component
// ═══════════════════════════════════════════════════════════════

interface TestSectionProps {
  number: number;
  title: string;
  description: string;
  endpoint: string;
  result: TestResult;
  onRun: () => void;
  requiresAuth: boolean;
  isAuthenticated?: boolean;
  note?: string;
  disabled?: boolean;
}

function TestSection({
  number,
  title,
  description,
  endpoint,
  result,
  onRun,
  requiresAuth,
  isAuthenticated = false,
  note,
  disabled = false,
}: TestSectionProps) {
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

  const getStatusColor = () => {
    switch (result.status) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'loading':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const canRun = !disabled && (!requiresAuth || isAuthenticated);

  return (
    <div
      style={{
        padding: '1.5rem',
        border: `2px solid ${getStatusColor()}`,
        borderRadius: '8px',
        backgroundColor: 'white',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>
            {number}. {title} {requiresAuth && !isAuthenticated && '🔒'}
          </h3>
          <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>{description}</p>
          <code
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            {endpoint}
          </code>
          {note && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#f59e0b' }}>{note}</p>
          )}
        </div>
        <button
          onClick={onRun}
          disabled={!canRun || result.status === 'loading'}
          style={{
            padding: '0.5rem 1rem',
            marginLeft: '1rem',
            backgroundColor: canRun ? '#3b82f6' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: canRun ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
          }}
        >
          {result.status === 'loading' ? 'Running...' : 'Run Test'}
        </button>
      </div>

      {/* Status */}
      {result.status !== 'idle' && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontWeight: 'bold', color: getStatusColor() }}>
            {getStatusIcon()} Status: {result.status.toUpperCase()}
            {result.statusCode && ` (HTTP ${result.statusCode})`}
          </div>
          {result.message && (
            <div style={{ marginTop: '0.5rem', color: getStatusColor() }}>{result.message}</div>
          )}
          {result.timing && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
              Response time: {result.timing}ms
            </div>
          )}

          {/* Response Data */}
          {result.data && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#666' }}>
                📦 Response Data
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '0.75rem',
                }}
              >
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {!canRun && requiresAuth && !isAuthenticated && (
        <div style={{ marginTop: '1rem', color: '#f59e0b', fontSize: '0.875rem' }}>
          🔒 Login required to run this test
        </div>
      )}
    </div>
  );
}

export default QADashboard;
