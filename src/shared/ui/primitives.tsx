import React from 'react';

/** Token-based UI primitives for the OMIC HUB brand system.
 * Colors, radii and shadows come from the @theme tokens in src/index.css. */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'premium' | 'danger';
export type ButtonSize = 'sm' | 'md';
export type BadgeTone = 'neutral' | 'success' | 'premium' | 'info' | 'danger';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500',
  secondary: 'bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50 focus:ring-brand-500',
  ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus:ring-brand-500',
  premium: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}) => (
  <button
    className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export interface CardProps {
  className?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = '', children }) => (
  <div className={`rounded-card border border-neutral-200 bg-white shadow-card ${className}`}>{children}</div>
);

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  premium: 'bg-amber-50 text-amber-700 ring-amber-200',
  info: 'bg-brand-50 text-brand-700 ring-brand-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', className = '', children }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeTones[tone]} ${className}`}
  >
    {children}
  </span>
);

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  hint,
  icon,
  tone = 'info',
  className = '',
}) => (
  <Card className={`p-5 ${className}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-neutral-900">{value}</p>
        {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
      </div>
      {icon ? (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${badgeTones[tone]}`}>
          {icon}
        </span>
      ) : null}
    </div>
  </Card>
);

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ eyebrow, title, subtitle, className = '' }) => (
  <div className={className}>
    {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-bio-600">{eyebrow}</p> : null}
    <h2 className="mt-1 text-xl font-bold tracking-tight text-neutral-900">{title}</h2>
    {subtitle ? <p className="mt-1 text-sm text-neutral-500">{subtitle}</p> : null}
  </div>
);

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
    {icon ? (
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
        {icon}
      </span>
    ) : null}
    <p className="text-sm font-semibold text-neutral-900">{title}</p>
    {description ? <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p> : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);
