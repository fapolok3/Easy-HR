import React, { useEffect } from 'react';

// Card Component
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className, ...props }: CardProps) => (
  <div className={`bg-surface border border-border rounded-xl shadow-sm ${className || ''}`} {...props}>
    {children}
  </div>
);

// Button Component
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  isLoading?: boolean;
}

export const Button = ({ children, variant = 'primary', size = 'md', className, isLoading, disabled, ...props }: ButtonProps) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-primary text-white hover:bg-primaryHover focus:ring-primary",
    secondary: "bg-surfaceHighlight text-text border border-border hover:bg-border",
    danger: "bg-danger text-white hover:bg-red-600 focus:ring-danger",
    ghost: "text-textMuted hover:text-text hover:bg-surfaceHighlight"
  };
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-11 px-8"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className || ''}`} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processing...</span>
        </div>
      ) : children}
    </button>
  );
};

// Input Component
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
  placeholder?: string;
  type?: string;
  value?: string | number | readonly string[];
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  required?: boolean;
  disabled?: boolean;
}

export const Input = ({ label, error, className, ...props }: InputProps) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-textMuted mb-1">{label}</label>}
    <input
      className={`w-full h-10 px-3 py-2 bg-surfaceHighlight border border-border rounded-lg text-sm text-text placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-danger focus:ring-danger' : ''} ${className || ''}`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
);

// Badge Component
export const Badge = ({ children, variant = 'default', className }: { children?: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger', className?: string }) => {
  const variants = {
    default: "bg-surfaceHighlight text-textMuted",
    success: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-100 text-amber-700 border border-amber-200",
    danger: "bg-red-100 text-red-700 border border-red-200"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className || ''}`}>
      {children}
    </span>
  );
};

// Modal Component
export const Modal = ({ isOpen, onClose, children, title }: { isOpen: boolean, onClose: () => void, children: React.ReactNode, title: string }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-bold text-text">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-surfaceHighlight rounded-lg text-textMuted hover:text-text transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Toast = ({ message, type = 'success', isVisible, onClose }: { message: string, type?: 'success' | 'danger', isVisible: boolean, onClose: () => void }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const bg = type === 'success' ? 'bg-success/10 border-success text-success' : 'bg-danger/10 border-danger text-danger';

  return (
    <div className="fixed top-6 right-6 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${bg} backdrop-blur-md`}>
        {type === 'success' ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
        )}
        <span className="font-medium text-sm">{message}</span>
      </div>
    </div>
  );
};

// Select Component
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string, value: string }[];
  className?: string;
  value?: string | number | readonly string[];
  disabled?: boolean;
  required?: boolean;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}

export const Select = ({ label, error, options, className, ...props }: SelectProps) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-textMuted mb-1">{label}</label>}
    <select
      className={`w-full h-10 px-3 py-2 bg-surfaceHighlight border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-danger focus:ring-danger' : ''} ${className || ''}`}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
);