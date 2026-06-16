import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  label?: string;
  error?: string;
  size?: number;
}

export function StarRating({ value, onChange, label, error, size = 24 }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const isReadOnly = !onChange;

  const handleClick = (val: number) => {
    if (!isReadOnly && onChange) {
      onChange(val);
    }
  };

  const handleMouseEnter = (val: number) => {
    if (!isReadOnly) {
      setHoverValue(val);
    }
  };

  const handleMouseLeave = () => {
    if (!isReadOnly) {
      setHoverValue(null);
    }
  };

  const displayedValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className="flex flex-col mb-4">
      {label && (
        <span className="text-sm font-medium text-slate-300 mb-2">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1.5" onMouseLeave={handleMouseLeave}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={isReadOnly}
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            className={`transition-transform duration-150 focus:outline-none ${
              isReadOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'
            }`}
            aria-label={`Calificar con ${star} estrellas`}
          >
            <Star
              size={size}
              className={`transition-colors duration-200 ${
                star <= displayedValue
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-600 fill-slate-800/40'
              }`}
            />
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
