import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'Portero' | 'Defensa' | 'Centrocampista' | 'Delantero' | 'Lateral' | 'Central' | 'Pivote' | 'Interior' | 'Extremo' | 'default';
  children: React.ReactNode;
}

export function Badge({ children, variant = 'default', className = '', ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border';
  
  const variants = {
    Portero: 'bg-blue-950/40 text-blue-300 border-blue-800/40',
    Defensa: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
    Lateral: 'bg-orange-950/40 text-orange-300 border-orange-800/40',
    Central: 'bg-yellow-950/40 text-yellow-300 border-yellow-800/40',
    Centrocampista: 'bg-green-950/40 text-green-300 border-green-800/40',
    Pivote: 'bg-teal-950/40 text-teal-300 border-teal-800/40',
    Interior: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
    Extremo: 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40',
    Delantero: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
    default: 'bg-slate-800 text-slate-300 border-slate-700/60',
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
