import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, type = 'text', ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="relative w-full mb-4">
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            placeholder=" "
            className={`peer w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-100 placeholder-transparent outline-none transition-all duration-200 focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21] text-sm ${
              icon ? 'pl-10' : ''
            } ${
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            } ${className}`}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={`absolute left-4 top-3 text-slate-400 text-sm transition-all duration-200 pointer-events-none origin-[0] 
              peer-placeholder-shown:scale-100 
              peer-placeholder-shown:translate-y-0 
              peer-focus:scale-75 
              peer-focus:-translate-y-7 
              peer-focus:text-[#CC0E21]
              -translate-y-7 scale-75 bg-slate-950 px-1 rounded
              ${icon ? 'peer-placeholder-shown:left-10' : 'peer-placeholder-shown:left-4'}
              ${error ? 'peer-focus:text-red-500' : ''}`}
          >
            {label}
          </label>
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-500 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
