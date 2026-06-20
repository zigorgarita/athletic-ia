import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm';
  
  const variants = {
    primary: 'bg-[#CC0E21] hover:bg-red-500 text-white font-semibold shadow-lg shadow-red-600/20 active:scale-[0.98]',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/80 active:scale-[0.98]',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 active:scale-[0.98]',
    ghost: 'hover:bg-slate-800/80 text-slate-300 hover:text-slate-100',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />}
      {children}
    </button>
  );
}
