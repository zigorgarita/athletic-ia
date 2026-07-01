import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'Portero' | 'Defensa' | 'Centrocampista' | 'Delantero' | 'Lateral' | 'Central' | 'Pivote' | 'Interior' | 'Extremo' | 'default';
  children: React.ReactNode;
}

export function Badge({ children, variant = 'default', className = '', ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border';
  
  const variants = {
    Portero: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Defensa: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Lateral: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Central: 'bg-yellow-500/10 text-yellow-405 border-yellow-500/20',
    Centrocampista: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Pivote: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    Interior: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    Extremo: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Delantero: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
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
