'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import api from '../../services/api';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface SavedPaymentMethodsProps {
  onSelectMethod?: (methodId: string) => void;
  onAddNew?: () => void;
  selectable?: boolean;
}

const CARD_BRANDS: Record<string, { icon: string; color: string }> = {
  visa: { icon: '💳', color: 'bg-blue-50 border-blue-200' },
  mastercard: { icon: '💳', color: 'bg-red-50 border-red-200' },
  amex: { icon: '💳', color: 'bg-green-50 border-green-200' },
  discover: { icon: '💳', color: 'bg-orange-50 border-orange-200' },
  default: { icon: '💳', color: 'bg-gray-50 border-gray-200' },
};

export default function SavedPaymentMethods({
  onSelectMethod,
  onAddNew,
  selectable = false,
}: SavedPaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ success: boolean; data: PaymentMethod[] }>(
        '/payments/methods',
      );
      if (response.data.success) {
        setPaymentMethods(response.data.data);
        // Auto-select default method
        const defaultMethod = response.data.data.find((m) => m.isDefault);
        if (defaultMethod) {
          setSelectedId(defaultMethod.id);
        }
      }
    } catch (err) {
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (methodId: string) => {
    setSelectedId(methodId);
    onSelectMethod?.(methodId);
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      setDeletingId(methodId);
      await api.delete(`/payments/methods/${methodId}`);
      setPaymentMethods((prev) => prev.filter((m) => m.id !== methodId));
      if (selectedId === methodId) {
        setSelectedId(null);
      }
    } catch (err) {
      alert('Failed to remove payment method');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await api.patch(`/payments/methods/${methodId}/default`);
      setPaymentMethods((prev) =>
        prev.map((m) => ({
          ...m,
          isDefault: m.id === methodId,
        })),
      );
    } catch (err) {
      alert('Failed to set default payment method');
    }
  };

  const getCardBrand = (brand: string) => {
    return CARD_BRANDS[brand.toLowerCase()] || CARD_BRANDS.default;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading payment methods...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <Button className="mt-4" variant="outline" onClick={fetchPaymentMethods}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Saved Payment Methods
            </CardTitle>
            <CardDescription>
              {paymentMethods.length > 0
                ? 'Select a payment method or add a new one'
                : 'No saved payment methods'}
            </CardDescription>
          </div>
          {onAddNew && (
            <Button variant="outline" size="sm" onClick={onAddNew}>
              <Plus className="h-4 w-4 mr-1" />
              Add New
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="mt-4 text-muted-foreground">No payment methods saved yet.</p>
            {onAddNew && (
              <Button className="mt-4" onClick={onAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => {
              const brand = getCardBrand(method.brand);
              const isSelected = selectable && selectedId === method.id;

              return (
                <div
                  key={method.id}
                  className={`
                    relative flex items-center justify-between p-4 rounded-lg border-2 transition-all
                    ${brand.color}
                    ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
                    ${selectable ? 'cursor-pointer hover:shadow-md' : ''}
                  `}
                  onClick={() => selectable && handleSelect(method.id)}
                >
                  <div className="flex items-center gap-4">
                    {selectable && (
                      <div
                        className={`
                          w-5 h-5 rounded-full border-2 flex items-center justify-center
                          ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}
                        `}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    )}
                    <div className="text-2xl">{brand.icon}</div>
                    <div>
                      <div className="font-medium capitalize">
                        {method.brand} •••• {method.last4}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {method.isDefault && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                    {!method.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(method.id);
                        }}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(method.id);
                      }}
                      disabled={deletingId === method.id}
                    >
                      {deletingId === method.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
