import { useForm, type UseFormProps, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ZodSchema } from 'zod';

/**
 * Custom hook that wraps react-hook-form with Zod validation
 */
export function useFormWithZod<TFormValues extends FieldValues>(
  schema: ZodSchema<TFormValues>,
  options?: Omit<UseFormProps<TFormValues>, 'resolver'>,
): UseFormReturn<TFormValues> {
  return useForm<TFormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur', // Validate on blur for better UX
    reValidateMode: 'onChange', // Re-validate on change after first error
    ...options,
  });
}

export default useFormWithZod;
