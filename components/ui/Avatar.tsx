import React, { useState } from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase();
  };

  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-base',
    xl: 'h-24 w-24 text-xl',
  };

  const pixelSizes = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  const currentPixelSize = pixelSizes[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden select-none border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-950 text-slate-200 font-bold shadow-inner ${sizes[size]} ${className}`}
    >
      {src && !imageError && (
        <Image
          src={src}
          alt={name}
          width={currentPixelSize}
          height={currentPixelSize}
          className="absolute inset-0 h-full w-full object-cover z-10"
          onError={() => setImageError(true)}
        />
      )}
      <span className="z-0">{getInitials(name)}</span>
    </div>
  );
}
