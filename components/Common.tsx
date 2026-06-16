import React from "react";
import { AlertTriangle, ChevronRight, Loader2, LucideIcon, Sparkles } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "danger" | "outline" | "ghost" | "soft";

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    icon?: LucideIcon;
  }
> = ({ children, variant = "primary", icon: Icon, className = "", ...props }) => {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-accent text-white shadow-[0_16px_32px_-18px_color-mix(in_oklab,var(--accent)_70%,transparent)]",
    secondary: "bg-secondary text-[#10212b]",
    danger: "bg-rose-500 text-white",
    outline: "bg-card text-primary border border-default",
    ghost: "bg-transparent text-primary hover:bg-surface2",
    soft: "bg-surface2 text-primary border border-white/50",
  };

  return (
    <button
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25",
        "disabled:pointer-events-none disabled:opacity-50",
        "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_var(--shadow)] active:translate-y-0",
        variants[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
};

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}> = ({ children, className = "", interactive = false }) => (
  <div
    className={cx(
      "rounded-3xl border border-white/60 bg-card shadow-[12px_12px_36px_var(--shadow),-10px_-10px_30px_rgba(255,255,255,0.58)] backdrop-blur-xl",
      "dark:border-white/10 dark:shadow-[14px_14px_42px_rgba(0,0,0,0.32),-8px_-8px_26px_rgba(255,255,255,0.03)]",
      interactive && "transition-all hover:-translate-y-1 hover:border-accent/40",
      className,
    )}
  >
    {children}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }> = ({
  label,
  error,
  className = "",
  ...props
}) => (
  <div className="w-full space-y-2">
    {label && <label className="ml-1 text-sm font-semibold text-primary">{label}</label>}
    <input
      className={cx(
        "w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm font-semibold text-primary outline-none transition-all placeholder:text-muted",
        "focus:border-accent focus:bg-white focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_16%,transparent)] focus-visible:outline-none",
        "dark:border-white/10 dark:bg-white/5 dark:focus:bg-white/10",
        className,
      )}
      {...props}
    />
    {error && <p className="ml-1 text-xs font-semibold text-rose-500">{error}</p>}
  </div>
);

export const Badge: React.FC<{
  children: React.ReactNode;
  color?: "green" | "blue" | "red" | "gray" | "purple" | "orange";
}> = ({ children, color = "gray" }) => {
  const colors = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
    purple: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200",
    orange: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
    red: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200",
    gray: "bg-surface2 text-muted",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold", colors[color])}>
      {children}
    </span>
  );
};

export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}> = ({ eyebrow, title, description, action, breadcrumbs }) => (
  <div className="space-y-4">
    {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
  <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="max-w-2xl">
      {eyebrow && <p className="mb-2 text-sm font-bold text-accent">{eyebrow}</p>}
      <h1 className="font-heading text-4xl font-bold tracking-tight text-primary md:text-5xl">{title}</h1>
      {description && <p className="mt-3 text-base font-medium leading-7 text-muted">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
</div>
);

export const Breadcrumbs: React.FC<{ items: Array<{ label: string; href?: string }> }> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm font-semibold text-muted">
    {items.map((item, index) => (
      <React.Fragment key={`${item.label}-${index}`}>
        {index > 0 && <ChevronRight className="h-4 w-4 opacity-60" aria-hidden="true" />}
        {item.href ? (
          <a className="rounded-lg px-1 py-0.5 transition hover:text-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20" href={item.href}>
            {item.label}
          </a>
        ) : (
          <span className="px-1 py-0.5 text-primary">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

export const StatCard: React.FC<{
  title: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  accent?: "purple" | "blue" | "green" | "orange";
}> = ({ title, value, detail, icon: Icon, accent = "purple" }) => {
  const accents = {
    purple: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
    orange: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">{title}</p>
          <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
          {detail && <p className="mt-2 text-sm font-medium text-muted">{detail}</p>}
        </div>
        <div className={cx("rounded-2xl p-3", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  embedded?: boolean;
}> = ({ title, description, action, icon: Icon = Sparkles, embedded = false }) => {
  const content = (
    <div className={cx("text-center", embedded ? "p-6" : "")}>
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface2 text-accent">
      <Icon className="h-7 w-7" />
    </div>
    <h3 className="mt-5 text-xl font-bold text-primary">{title}</h3>
    {description && <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-muted">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
    </div>
  );
  return embedded ? content : <Card className="p-10 text-center">{content}</Card>;
};

export const LoadingState: React.FC<{ label?: string }> = ({ label = "Loading" }) => (
  <div className="flex items-center justify-center gap-3 rounded-3xl bg-card p-8 text-sm font-bold text-muted">
    <Loader2 className="h-5 w-5 animate-spin text-accent" />
    {label}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  action?: React.ReactNode;
  embedded?: boolean;
}> = ({ title = "Something needs attention", message, action, embedded = false }) => {
  const content = (
    <div className="flex gap-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="mt-1 text-sm font-medium leading-6">{message}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
  return embedded ? (
    <div className="rounded-3xl border border-amber-300/70 bg-amber-50/80 p-5 text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
      {content}
    </div>
  ) : (
    <Card className="border-amber-300/70 bg-amber-50/80 p-5 text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
      {content}
    </Card>
  );
};

export const SkeletonBlock: React.FC<{ className?: string; lines?: number }> = ({ className = "", lines = 3 }) => (
  <Card className={cx("p-5", className)}>
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cx(
            "h-3 rounded-full bg-surface2",
            index === 0 && "w-2/3",
            index === 1 && "w-full",
            index > 1 && "w-5/6",
          )}
        />
      ))}
    </div>
  </Card>
);

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-3xl bg-card p-2" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            "rounded-2xl px-4 py-2 text-sm font-bold capitalize transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25",
            value === option.value ? "bg-accent text-white" : "bg-transparent text-primary hover:bg-surface2",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
