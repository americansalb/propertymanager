'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CreditCard, Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface HelcimPaymentFormProps {
  amount: number;
  chargeIds: string[];
  tenantId: string;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
}

interface CardFormData {
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardHolderName: string;
}

// Card type detection based on BIN ranges
const getCardType = (cardNumber: string): string => {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  if (/^4/.test(cleanNumber)) return 'visa';
  if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
  if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
  return 'unknown';
};

// Format card number with spaces
const formatCardNumber = (value: string): string => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || '';
  const parts = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  if (parts.length) {
    return parts.join(' ');
  }
  return v;
};

// Format expiry date as MM/YY
const formatExpiry = (value: string): string => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  if (v.length >= 2) {
    return v.substring(0, 2) + '/' + v.substring(2, 4);
  }
  return v;
};

export default function HelcimPaymentForm({
  amount,
  chargeIds,
  tenantId,
  onSuccess,
  onError,
}: HelcimPaymentFormProps) {
  const [formData, setFormData] = useState<CardFormData>({
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    cardHolderName: '',
  });
  const [errors, setErrors] = useState<Partial<CardFormData>>({});
  const [cardType, setCardType] = useState<string>('unknown');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>(
    'idle',
  );

  // Calculate fee based on tier (simplified - in production, get from backend)
  const feeRate = 0.028; // 2.8% for now (Free tier)
  const processingFee = amount * feeRate;
  const totalAmount = amount + processingFee;

  useEffect(() => {
    const type = getCardType(formData.cardNumber);
    setCardType(type);
  }, [formData.cardNumber]);

  const validateForm = (): boolean => {
    const newErrors: Partial<CardFormData> = {};

    // Card number validation
    const cleanCardNumber = formData.cardNumber.replace(/\s/g, '');
    if (!cleanCardNumber || cleanCardNumber.length < 15) {
      newErrors.cardNumber = 'Invalid card number';
    }

    // Check for Amex (not supported)
    if (/^3[47]/.test(cleanCardNumber)) {
      newErrors.cardNumber = 'American Express is not accepted';
    }

    // Expiry validation
    const expiryParts = formData.cardExpiry.split('/');
    if (expiryParts.length !== 2) {
      newErrors.cardExpiry = 'Invalid expiry date';
    } else {
      const month = parseInt(expiryParts[0], 10);
      const year = parseInt('20' + expiryParts[1], 10);
      const now = new Date();
      const expiry = new Date(year, month, 0);
      if (month < 1 || month > 12 || expiry < now) {
        newErrors.cardExpiry = 'Card is expired';
      }
    }

    // CVV validation
    if (!formData.cardCvv || formData.cardCvv.length < 3) {
      newErrors.cardCvv = 'Invalid CVV';
    }

    // Cardholder name validation
    if (!formData.cardHolderName || formData.cardHolderName.length < 2) {
      newErrors.cardHolderName = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const paymentMutation = useMutation({
    mutationFn: async () => {
      // Convert expiry from MM/YY to MMYY for Helcim
      const expiryFormatted = formData.cardExpiry.replace('/', '');

      const response = await api.post('/payments/helcim/process-direct', {
        tenantId,
        cardNumber: formData.cardNumber.replace(/\s/g, ''),
        cardExpiry: expiryFormatted,
        cardCvv: formData.cardCvv,
        cardHolderName: formData.cardHolderName,
        amount: totalAmount,
        chargeIds,
      });

      return response.data;
    },
    onSuccess: (data) => {
      if (data.data.status === 'APPROVED') {
        setPaymentStatus('success');
        onSuccess(data.data.transactionId);
      } else {
        setPaymentStatus('error');
        onError('Payment was declined. Please try a different card.');
      }
    },
    onError: (error: any) => {
      setPaymentStatus('error');
      onError(error.response?.data?.message || 'Payment failed. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setPaymentStatus('processing');
    paymentMutation.mutate();
  };

  const handleInputChange = (field: keyof CardFormData, value: string) => {
    let formattedValue = value;

    if (field === 'cardNumber') {
      formattedValue = formatCardNumber(value);
      if (formattedValue.length > 19) return; // Max 16 digits + 3 spaces
    } else if (field === 'cardExpiry') {
      formattedValue = formatExpiry(value);
      if (formattedValue.length > 5) return; // MM/YY
    } else if (field === 'cardCvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    setFormData((prev) => ({ ...prev, [field]: formattedValue }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (paymentStatus === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-600">
          Your payment of ${totalAmount.toFixed(2)} has been processed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Rent Amount</span>
          <span>${amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Processing Fee (2.8%)</span>
          <span>${processingFee.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span>${totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="cardNumber">Card Number</Label>
        <div className="relative">
          <Input
            id="cardNumber"
            type="text"
            placeholder="1234 5678 9012 3456"
            value={formData.cardNumber}
            onChange={(e) => handleInputChange('cardNumber', e.target.value)}
            className={`pr-12 ${errors.cardNumber ? 'border-red-500' : ''}`}
            disabled={paymentStatus === 'processing'}
            autoComplete="cc-number"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {cardType === 'visa' && (
              <span className="text-blue-600 font-bold text-sm">VISA</span>
            )}
            {cardType === 'mastercard' && (
              <span className="text-orange-600 font-bold text-sm">MC</span>
            )}
            {cardType === 'discover' && (
              <span className="text-orange-500 font-bold text-sm">DISC</span>
            )}
            {cardType === 'unknown' && <CreditCard className="w-5 h-5 text-gray-400" />}
          </div>
        </div>
        {errors.cardNumber && <p className="text-sm text-red-500">{errors.cardNumber}</p>}
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cardExpiry">Expiry Date</Label>
          <Input
            id="cardExpiry"
            type="text"
            placeholder="MM/YY"
            value={formData.cardExpiry}
            onChange={(e) => handleInputChange('cardExpiry', e.target.value)}
            className={errors.cardExpiry ? 'border-red-500' : ''}
            disabled={paymentStatus === 'processing'}
            autoComplete="cc-exp"
          />
          {errors.cardExpiry && <p className="text-sm text-red-500">{errors.cardExpiry}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cardCvv">CVV</Label>
          <Input
            id="cardCvv"
            type="text"
            placeholder="123"
            value={formData.cardCvv}
            onChange={(e) => handleInputChange('cardCvv', e.target.value)}
            className={errors.cardCvv ? 'border-red-500' : ''}
            disabled={paymentStatus === 'processing'}
            autoComplete="cc-csc"
          />
          {errors.cardCvv && <p className="text-sm text-red-500">{errors.cardCvv}</p>}
        </div>
      </div>

      {/* Cardholder Name */}
      <div className="space-y-2">
        <Label htmlFor="cardHolderName">Cardholder Name</Label>
        <Input
          id="cardHolderName"
          type="text"
          placeholder="John Doe"
          value={formData.cardHolderName}
          onChange={(e) => handleInputChange('cardHolderName', e.target.value)}
          className={errors.cardHolderName ? 'border-red-500' : ''}
          disabled={paymentStatus === 'processing'}
          autoComplete="cc-name"
        />
        {errors.cardHolderName && <p className="text-sm text-red-500">{errors.cardHolderName}</p>}
      </div>

      {/* Accepted Cards Notice */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Accepted:</span>
        <span className="font-medium">Visa, Mastercard, Discover</span>
        <span className="text-gray-400">(No Amex)</span>
      </div>

      {/* Error Message */}
      {paymentStatus === 'error' && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">Payment failed. Please check your card details and try again.</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={paymentStatus === 'processing'}
      >
        {paymentStatus === 'processing' ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 mr-2" />
            Pay ${totalAmount.toFixed(2)}
          </>
        )}
      </Button>

      {/* Security Notice */}
      <p className="text-xs text-center text-gray-500">
        <Lock className="w-3 h-3 inline mr-1" />
        Your payment is secured with 256-bit encryption
      </p>
    </form>
  );
}
