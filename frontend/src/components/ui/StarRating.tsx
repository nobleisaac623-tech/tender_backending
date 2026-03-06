import { useState } from 'react';

const FILLED = '#f59e0b';
const EMPTY = '#e5e7eb';

type Size = 'sm' | 'md' | 'lg';

const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: Size;
  showValue?: boolean;
}

export function StarRating({ value, onChange, size = 'md', showValue = true }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const isInteractive = typeof onChange === 'function';
  const displayValue = hover ?? value;
  const rounded = Math.round(displayValue * 2) / 2;

  const handleClick = (star: number) => {
    if (isInteractive) onChange(star);
  };

  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex items-center gap-0.5" role={isInteractive ? 'slider' : undefined}>
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = star <= rounded ? FILLED : EMPTY;
          return (
            <span
              key={star}
              className={`inline-block ${sizeMap[size]} cursor-${isInteractive ? 'pointer' : 'default'}`}
              onMouseEnter={isInteractive ? () => setHover(star) : undefined}
              onMouseLeave={isInteractive ? () => setHover(null) : undefined}
              onClick={isInteractive ? () => handleClick(star) : undefined}
              role={isInteractive ? 'button' : undefined}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill={fill} className={sizeMap[size]}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className="ml-1 text-sm font-medium text-gray-700" style={{ fontSize: size === 'lg' ? '1rem' : undefined }}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
      )}
    </div>
  );
}
