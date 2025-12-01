import { forwardRef, type SelectHTMLAttributes } from 'react';
import { type FieldError } from 'react-hook-form';
import { cn } from '../../lib/utils';
import { Label } from '../ui/label';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: FieldError;
  description?: string;
  required?: boolean;
  placeholder?: string;
}

/**
 * Form select component with label and error handling
 */
export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      options,
      error,
      description,
      required,
      placeholder,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        <Label
          htmlFor={fieldId}
          className={cn('text-sm font-medium', error && 'text-red-600')}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <select
          ref={ref}
          id={fieldId}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
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

FormSelect.displayName = 'FormSelect';

export default FormSelect;
