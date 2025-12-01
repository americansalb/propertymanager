import { forwardRef, type InputHTMLAttributes } from 'react';
import { type FieldError } from 'react-hook-form';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: FieldError;
  description?: string;
  required?: boolean;
}

/**
 * Form field component with label, input, and error handling
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, description, required, className, id, ...props }, ref) => {
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
        <Input
          ref={ref}
          id={fieldId}
          className={cn(
            error && 'border-red-500 focus:ring-red-500',
            className,
          )}
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

FormField.displayName = 'FormField';

export default FormField;
