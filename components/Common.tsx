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
      "border border-[#8B5CF6] bg-[linear-gradient(135deg,#8B5CF6,#D97745)] text-white shadow-[0_14px_34px_-20px_rgba(139,92,246,0.72)] hover:border-[#7C3AED] hover:shadow-[0_18px_42px_-24px_rgba(217,119,69,0.72)]",
    secondary: "bg-white text-primary border border-default hover:border-[#D7C6B8] hover:bg-[#FAF7F2] dark:bg-white/5 dark:hover:bg-white/10",
    danger: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-400/10 dark:text-rose-200 dark:border-rose-400/20",
    outline: "bg-white text-primary border border-default hover:border-[#D7C6B8] hover:bg-[#FAF7F2] dark:bg-white/5 dark:hover:bg-white/10",
    ghost: "bg-transparent text-muted hover:bg-[#F3ECE3] hover:text-primary dark:hover:bg-white/10",
    soft: "bg-[#F3ECE3] text-primary border border-[#E8DED4] hover:border-[#D7C6B8] hover:bg-[#EFE6DB] dark:bg-white/10 dark:border-white/10 dark:hover:bg-white/15",
  };

  return (
    <button
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15",
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
      "rounded-2xl border border-default bg-card shadow-[0_14px_38px_-32px_var(--shadow)]",
      "dark:border-white/10",
      interactive && "transition-all hover:-translate-y-0.5 hover:border-[#D7C6B8] hover:shadow-[0_20px_46px_-34px_rgba(91,64,43,0.28)] dark:hover:border-white/20",
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
        "w-full rounded-xl border border-default bg-white px-3.5 py-2.5 text-sm font-medium text-primary outline-none transition placeholder:text-muted",
        "focus:border-[#C7A5F7] focus:bg-white focus:shadow-[0_0_0_4px_rgba(139,92,246,0.13)] focus-visible:outline-none",
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
    green: "bg-[#EEF4ED] text-[#557761] border border-[#D7E4D8] dark:bg-emerald-400/15 dark:text-emerald-200",
    blue: "bg-[#F2ECFF] text-[#6D4BC7] border border-[#E3D7FB] dark:bg-violet-400/15 dark:text-violet-200",
    purple: "bg-[#F2ECFF] text-[#6D4BC7] border border-[#E3D7FB] dark:bg-violet-400/15 dark:text-violet-200",
    orange: "bg-[#FFF1E8] text-[#A6532E] border border-[#F4D7C6] dark:bg-amber-400/15 dark:text-amber-200",
    red: "bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-400/15 dark:text-rose-200",
    gray: "bg-[#FAF7F2] text-muted border border-[#E8DED4] dark:bg-white/10 dark:border-white/10",
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
      {eyebrow && <p className="mb-2 text-sm font-medium text-accent">{eyebrow}</p>}
      <h1 className="text-[2.25rem] font-semibold tracking-tight text-primary md:text-5xl">{title}</h1>
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
    purple: "bg-[#F2ECFF] text-[#6D4BC7] dark:bg-violet-400/15 dark:text-violet-200",
    blue: "bg-[#EEF4ED] text-[#557761] dark:bg-emerald-400/15 dark:text-emerald-200",
    green: "bg-[#EEF4ED] text-[#557761] dark:bg-emerald-400/15 dark:text-emerald-200",
    orange: "bg-[#FFF1E8] text-[#A6532E] dark:bg-amber-400/15 dark:text-amber-200",
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
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#E3D7FB] bg-[#F2ECFF] text-accent dark:border-violet-400/20 dark:bg-violet-400/10">
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
  <div className="flex items-center justify-center gap-3 rounded-2xl border border-default bg-card p-8 text-sm font-medium text-muted shadow-[0_14px_38px_-32px_var(--shadow)]">
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
    <div className="flex flex-wrap gap-1 rounded-xl border border-default bg-white p-1 dark:bg-white/5" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15",
            value === option.value ? "bg-[#F3ECE3] text-primary shadow-sm dark:bg-white/10" : "bg-transparent text-muted hover:bg-[#FAF7F2] hover:text-primary dark:hover:bg-white/10",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
