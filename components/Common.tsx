
import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' }> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 rounded-2xl font-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-[15px] focus:outline-none active:scale-[0.97] border-[3px] border-default shadow-brutal hover:-translate-y-1 hover:shadow-brutal-lg";
  const variants = {
    primary: "bg-accent text-black",
    secondary: "bg-secondary text-black",
    danger: "bg-[#FF3366] text-black",
    outline: "bg-card text-primary",
    ghost: "bg-yellow text-black"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; glass?: boolean }> = ({ children, className = '', glass = false }) => (
  <div className={`bg-card dark:bg-gradient-to-b dark:from-surface dark:to-surface2 border-[4px] border-default rounded-[2.5rem] shadow-brutal ${className}`}>
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
    {label && <label className="text-[12px] font-black text-primary uppercase tracking-[0.2em] ml-2">{label}</label>}
    <input 
      className={`
        w-full px-5 py-4 bg-card border-[3px] border-default rounded-xl focus:border-accent focus:ring-0 transition-all outline-none text-primary font-bold placeholder-muted
        ${className}
      `}
      {...props}
    />
    {error && <p className="text-xs text-accent ml-2 font-black">{error}</p>}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'blue' | 'red' | 'gray' | 'purple' | 'orange' }> = ({ children, color = 'gray' }) => {
  const colors = {
    green: "bg-accent text-black",
    blue: "bg-secondary text-black",
    purple: "bg-purple text-black",
    orange: "bg-yellow text-black",
    red: "bg-[#FF3366] text-black",
    gray: "bg-card text-primary"
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border-[3px] border-default ${colors[color]}`}>
      {children}
    </span>
  );
};
