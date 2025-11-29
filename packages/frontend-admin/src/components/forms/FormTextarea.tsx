import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { type FieldError } from 'react-hook-form';
import { cn } from '../../lib/utils';
import { Label } from '../ui/label';

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: FieldError;
  description?: string;
  required?: boolean;
  maxLength?: number;
  showCount?: boolean;
}

/**
 * Form textarea component with label, character count, and error handling
 */
export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      label,
      error,
      description,
      required,
      maxLength,
      showCount,
      className,
      id,
      value,
      ...props
    },
    ref,
  ) => {
    const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor={fieldId}
            className={cn('text-sm font-medium', error && 'text-red-600')}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {showCount && maxLength && (
            <span
              className={cn(
                'text-xs',
                currentLength > maxLength ? 'text-red-600' : 'text-gray-400',
              )}
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={fieldId}
          value={value}
          maxLength={maxLength}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;
