'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function StarRating({
  value,
  onChange,
  max = 5,
  size = 'md',
  readonly = false,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(null)}
          className={cn(
            'transition-colors focus:outline-none',
            !readonly && 'cursor-pointer hover:scale-110',
            readonly && 'cursor-default',
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              'transition-colors',
              star <= displayValue
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200',
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function StarRatingDisplay({
  value,
  max = 5,
  size = 'sm',
  showValue = true,
  className,
}: {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
          <Star
            key={star}
            className={cn(
              sizeClasses[size],
              star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : star - 0.5 <= value
                  ? 'fill-yellow-400/50 text-yellow-400'
                  : 'fill-gray-200 text-gray-200',
            )}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-sm text-gray-600">
          {value.toFixed(1)} / {max}
        </span>
      )}
    </div>
  );
}
