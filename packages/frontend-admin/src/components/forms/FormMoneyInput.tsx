import { forwardRef, type InputHTMLAttributes, useState, useCallback } from 'react';
import { type FieldError } from 'react-hook-form';
import { cn } from '../../lib/utils';
import { Label } from '../ui/label';

export interface FormMoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  label: string;
  error?: FieldError;
  description?: string;
  required?: boolean;
  value?: number | string;
  onChange?: (value: number | undefined) => void;
  currency?: string;
}

/**
 * Money input with formatting - displays as currency but stores as number
 */
export const FormMoneyInput = forwardRef<HTMLInputElement, FormMoneyInputProps>(
  (
    {
      label,
      error,
      description,
      required,
      value,
      onChange,
      currency = '$',
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');

    // Display value - format number as string with 2 decimal places
    const [displayValue, setDisplayValue] = useState(() => {
      if (value === undefined || value === null || value === '') {
        return '';
      }
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(num) ? '' : num.toFixed(2);
    });

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;

        // Allow empty input
        if (input === '') {
          setDisplayValue('');
          onChange?.(undefined);
          return;
        }

        // Only allow numbers and one decimal point
        const sanitized = input.replace(/[^0-9.]/g, '');

        // Prevent multiple decimal points
        const parts = sanitized.split('.');
        if (parts.length > 2) {
          return;
        }

        // Limit decimal places to 2
        if (parts[1] && parts[1].length > 2) {
          return;
        }

        setDisplayValue(sanitized);

        const numValue = parseFloat(sanitized);
        if (!isNaN(numValue)) {
          onChange?.(numValue);
        }
      },
      [onChange],
    );

    const handleBlur = useCallback(() => {
      if (displayValue === '') {
        return;
      }
      const numValue = parseFloat(displayValue);
      if (!isNaN(numValue)) {
        setDisplayValue(numValue.toFixed(2));
      }
    }, [displayValue]);

    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldId} className={cn('text-sm font-medium', error && 'text-red-600')}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{currency}</span>
          <input
            ref={ref}
            id={fieldId}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus:ring-red-500',
              className,
            )}
            placeholder="0.00"
            aria-invalid={!!error}
            aria-describedby={
              error ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined
            }
            {...props}
          />
        </div>
        {description && !error && (
          <p id={`${fieldId}-description`} className="text-xs text-gray-500">
            {description}
          </p>
        )}
        {error && (
          <p id={`${fieldId}-error`} className="text-sm text-red-600" role="alert">
            {error.message}
          </p>
        )}
      </div>
    );
  },
);

FormMoneyInput.displayName = 'FormMoneyInput';

export default FormMoneyInput;
