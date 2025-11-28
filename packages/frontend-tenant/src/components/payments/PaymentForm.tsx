'use client';

import { useState, useEffect } from 'react';
import { PaymentElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { Loader2, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import api from '../../services/api';

// Initialize Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentFormProps {
  amount: number;
  chargeIds: string[];
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

// Wrapper component that provides Stripe context
export function PaymentFormWrapper({
  amount,
  chargeIds,
  onSuccess,
  onError,
  onCancel,
}: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create PaymentIntent on mount
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.post<{ success: boolean; data: PaymentIntentResponse }>(
          '/payments/create-intent',
          {
            amount,
            chargeIds,
          },
        );

        if (response.data.success && response.data.data) {
          setClientSecret(response.data.data.clientSecret);
          setPaymentIntentId(response.data.data.paymentIntentId);
        } else {
          throw new Error('Failed to create payment intent');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMessage);
        onError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (amount > 0 && chargeIds.length > 0) {
      createPaymentIntent();
    }
  }, [amount, chargeIds, onError]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Initializing payment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Payment initialization failed</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return null;
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormInner
        amount={amount}
        paymentIntentId={paymentIntentId!}
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
      />
    </Elements>
  );
}

interface PaymentFormInnerProps {
  amount: number;
  paymentIntentId: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

function PaymentFormInner({
  amount,
  paymentIntentId,
  onSuccess,
  onError,
  onCancel,
}: PaymentFormInnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'processing' | 'succeeded' | 'failed'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payments/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        // Payment failed
        setPaymentStatus('failed');
        const message = error.message || 'Payment failed. Please try again.';
        setErrorMessage(message);
        onError(message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded
        setPaymentStatus('succeeded');
        onSuccess(paymentIntentId);
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        // 3D Secure or other action required - will redirect
        setPaymentStatus('processing');
      } else {
        // Unexpected status
        setPaymentStatus('failed');
        const message = 'Payment could not be completed. Please try again.';
        setErrorMessage(message);
        onError(message);
      }
    } catch (err) {
      setPaymentStatus('failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(message);
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStatus === 'succeeded') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-8">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h3 className="mt-4 text-lg font-semibold text-green-800">Payment Successful!</h3>
            <p className="mt-2 text-sm text-green-700">
              Your payment of ${amount.toFixed(2)} has been processed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>Payment Details</CardTitle>
        </div>
        <CardDescription>
          Amount due: <span className="font-semibold text-foreground">${amount.toFixed(2)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={!stripe || isProcessing} className="flex-1">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay ${amount.toFixed(2)}</>
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
                Cancel
              </Button>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Your payment is secured by Stripe. We never store your card details.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default PaymentFormWrapper;
