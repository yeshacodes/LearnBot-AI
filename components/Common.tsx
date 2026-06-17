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
    primary:
      "border border-fuchsia-300 bg-gradient-to-r from-pink-400 via-fuchsia-500 to-violet-500 text-white shadow-[0_14px_32px_-18px_rgba(168,85,247,0.85)] hover:shadow-[0_18px_42px_-20px_rgba(168,85,247,0.95)]",
    secondary: "bg-white/85 text-primary border border-fuchsia-100 hover:border-fuchsia-200 hover:bg-pink-50/70",
    danger: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100",
    outline: "bg-white/80 text-primary border border-fuchsia-100 hover:border-fuchsia-200 hover:bg-violet-50/80",
    ghost: "bg-transparent text-muted hover:bg-pink-50/80 hover:text-primary",
    soft: "bg-gradient-to-r from-pink-50 to-violet-50 text-primary border border-fuchsia-100 hover:border-fuchsia-200",
  };

  return (
    <button
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-200/70",
        "disabled:pointer-events-none disabled:opacity-50",
        "hover:-translate-y-0.5 active:translate-y-px",
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
      "rounded-2xl border border-default bg-card/90 shadow-[0_16px_42px_-34px_var(--shadow)] backdrop-blur-sm",
      "dark:border-white/10 dark:shadow-none",
      interactive && "transition-all hover:-translate-y-0.5 hover:border-fuchsia-200 hover:shadow-[0_20px_52px_-34px_rgba(168,85,247,0.35)]",
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
        "w-full rounded-xl border border-default bg-white/85 px-3.5 py-2.5 text-sm font-medium text-primary outline-none transition placeholder:text-muted",
        "focus:border-fuchsia-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(244,114,182,0.14)] focus-visible:outline-none",
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
    green: "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-400/15 dark:text-emerald-200",
    blue: "bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-400/15 dark:text-sky-200",
    purple: "bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-400/15 dark:text-violet-200",
    orange: "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-400/15 dark:text-amber-200",
    red: "bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-400/15 dark:text-rose-200",
    gray: "bg-pink-50/70 text-muted border border-fuchsia-100",
  };
  return (
    <span className={cx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", colors[color])}>
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
      {eyebrow && <p className="mb-2 text-sm font-medium text-fuchsia-700">{eyebrow}</p>}
      <h1 className="bg-gradient-to-r from-primary via-fuchsia-700 to-violet-700 bg-clip-text text-[2.5rem] font-semibold tracking-tight text-transparent md:text-5xl">{title}</h1>
      {description && <p className="mt-3 text-base font-normal leading-7 text-muted">{description}</p>}
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
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{value}</p>
          {detail && <p className="mt-2 text-sm font-normal text-muted">{detail}</p>}
        </div>
        <div className={cx("rounded-xl p-2.5", accents[accent])}>
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
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-fuchsia-100 bg-gradient-to-br from-pink-50 to-violet-50 text-accent">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="mt-5 text-xl font-semibold text-primary">{title}</h3>
    {description && <p className="mx-auto mt-2 max-w-md text-sm font-normal leading-6 text-muted">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
    </div>
  );
  return embedded ? content : <Card className="p-10 text-center">{content}</Card>;
};

export const LoadingState: React.FC<{ label?: string }> = ({ label = "Loading" }) => (
  <div className="flex items-center justify-center gap-3 rounded-2xl border border-default bg-card/90 p-8 text-sm font-medium text-muted shadow-[0_16px_42px_-34px_var(--shadow)] backdrop-blur-sm">
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
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
      {content}
    </div>
  ) : (
    <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
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
    <div className="flex flex-wrap gap-1 rounded-xl border border-default bg-white/85 p-1" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15",
            value === option.value ? "bg-gradient-to-r from-pink-50 to-violet-50 text-primary shadow-sm" : "bg-transparent text-muted hover:text-primary",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
