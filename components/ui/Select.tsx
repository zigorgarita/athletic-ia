import React, { forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  icon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, icon, className = '', id, ...props }, ref) => {
    const selectId = id || label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="relative w-full mb-4">
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <select
            id={selectId}
            ref={ref}
            className={`peer w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-100 outline-none transition-all duration-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm appearance-none ${
              icon ? 'pl-10' : ''
            } ${
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            } ${className}`}
            defaultValue=""
            {...props}
          >
            <option value="" disabled hidden>
              Seleccione una opción
            </option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
                {opt.label}
              </option>
            ))}
          </select>
          <label
            htmlFor={selectId}
            className={`absolute left-4 top-3 text-slate-400 text-sm transition-all duration-200 pointer-events-none origin-[0]
              -translate-y-7 scale-75 bg-slate-950 px-1 rounded peer-focus:text-green-500
              ${error ? 'peer-focus:text-red-500' : ''}`}
          >
            {label}
          </label>
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
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

Select.displayName = 'Select';
