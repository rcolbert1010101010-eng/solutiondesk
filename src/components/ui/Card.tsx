import React from 'react';

type CardVariant = 'default' | 'muted';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverable?: boolean;
}

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'default',
  hoverable = false,
  ...props
}) => {
  const variantClasses =
    variant === 'muted'
      ? 'bg-slate-50 border-slate-200 dark:bg-zinc-800/50 dark:border-zinc-700'
      : 'bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800';

  return (
    <div
      className={cn(
        'rounded-xl border',
        variantClasses,
        hoverable && 'transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800',
        className
      )}
      {...props}
    />
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('flex items-center justify-between gap-3 p-5', className)} {...props} />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={cn('text-sm font-semibold text-slate-900 dark:text-zinc-200', className)} {...props} />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn('text-sm text-slate-500 dark:text-zinc-500', className)} {...props} />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('p-5 pt-0', className)} {...props} />
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('p-5 pt-0', className)} {...props} />
);
