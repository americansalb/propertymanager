import { forwardRef, type InputHTMLAttributes, useCallback } from 'react';
import { type FieldError } from 'react-hook-form';
import { cn } from '../../lib/utils';
import { Label } from '../ui/label';

export interface FormPhoneInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  label: string;
  error?: FieldError;
  description?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Format phone number as (XXX) XXX-XXXX
 */
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');

  // Limit to 10 digits
  const truncated = digits.slice(0, 10);

  // Format based on length
  if (truncated.length <= 3) {
    return truncated;
  }
  if (truncated.length <= 6) {
    return `(${truncated.slice(0, 3)}) ${truncated.slice(3)}`;
  }
  return `(${truncated.slice(0, 3)}) ${truncated.slice(3, 6)}-${truncated.slice(6)}`;
};

/**
 * Phone input with automatic formatting
 */
export const FormPhoneInput = forwardRef<HTMLInputElement, FormPhoneInputProps>(
  (
    {
      label,
      error,
      description,
      required,
      value = '',
      onChange,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        onChange?.(formatted);
      },
      [onChange],
    );

    // Handle backspace properly
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && value) {
          // If cursor is after a formatting character, remove the digit before it
          const input = e.currentTarget;
          const cursorPos = input.selectionStart || 0;
          const prevChar = value[cursorPos - 1];

          if (prevChar === ')' || prevChar === ' ' || prevChar === '-') {
            e.preventDefault();
            const newValue = value.slice(0, cursorPos - 2) + value.slice(cursorPos - 1);
            onChange?.(formatPhoneNumber(newValue));
          }
        }
      },
      [value, onChange],
    );

    return (
      <div className="space-y-1.5">
        <Label
          htmlFor={fieldId}
          className={cn('text-sm font-medium', error && 'text-red-600')}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <input
          ref={ref}
          id={fieldId}
          type="tel"
          inputMode="tel"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500',
            className,
          )}
          placeholder="(555) 555-5555"
          aria-invalid={!!error}
          aria-describedby={
            error ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined
          }
          {...props}
        />
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

FormPhoneInput.displayName = 'FormPhoneInput';

export default FormPhoneInput;
