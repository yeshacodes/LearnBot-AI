
import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' }> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 rounded-2xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent active:scale-[0.97]";
  const variants = {
    primary: "bg-accent text-white hover:opacity-90 border border-accent/30 shadow-sm",
    secondary: "bg-card dark:bg-[var(--surface)] text-primary hover:bg-surface2 dark:hover:bg-[var(--surface2)] border border-default dark:border-[var(--border)] shadow-sm",
    danger: "bg-surface2 dark:bg-[var(--surface2)] text-primary hover:opacity-90 border border-default dark:border-[var(--border)] shadow-sm",
    outline: "border-2 border-default dark:border-[var(--border)] text-primary hover:bg-surface2 dark:hover:bg-[var(--surface2)]",
    ghost: "bg-transparent text-primary hover:bg-surface2 dark:hover:bg-[var(--surface2)]"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; glass?: boolean }> = ({ children, className = '', glass = false }) => (
  <div className={`
    ${glass 
      ? 'bg-card/90 dark:bg-[var(--surface)]/90 backdrop-blur-2xl border-default dark:border-[var(--border)]' 
      : 'bg-card dark:bg-[var(--surface)] border-default dark:border-[var(--border)]'} 
    border rounded-[2.5rem] shadow-[0_10px_30px_rgba(17,24,39,0.08)] ${className}
  `}>
    {children}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }> = ({ 
  label, 
  error, 
  className = '', 
  ...props 
}) => (
  <div className="space-y-2 w-full">
    {label && <label className="text-[11px] font-black text-muted uppercase tracking-[0.2em] ml-2">{label}</label>}
    <input 
      className={`
        w-full px-5 py-4 bg-card dark:bg-surface2 border-2 ${error ? 'border-accent' : 'border-default dark:border-[var(--border)]'} 
        rounded-2xl focus:border-accent transition-all outline-none text-primary placeholder:text-muted
        ${className}
      `}
      {...props}
    />
    {error && <p className="text-xs text-accent ml-2 font-bold">{error}</p>}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'blue' | 'red' | 'gray' | 'purple' | 'orange' }> = ({ children, color = 'gray' }) => {
  const colors = {
    green: "bg-accent/15 text-accent border border-accent/30",
    blue: "bg-card dark:bg-[var(--surface)] text-primary border border-default dark:border-[var(--border)]",
    purple: "bg-surface2 dark:bg-[var(--surface2)] text-primary border border-default dark:border-[var(--border)]",
    orange: "bg-surface2 dark:bg-[var(--surface2)] text-primary border border-default dark:border-[var(--border)]",
    red: "bg-accent/15 text-accent border border-accent/30",
    gray: "bg-card dark:bg-[var(--surface)] text-muted border border-default dark:border-[var(--border)]"
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${colors[color]}`}>
      {children}
    </span>
  );
};
