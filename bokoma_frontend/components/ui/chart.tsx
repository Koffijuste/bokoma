'use client';

import React from 'react';
import type { TooltipProps } from 'recharts/types/component/Tooltip';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/utils/helpers';

export type ChartConfig = Record<
  string,
  {
    label: string;
    color?: string;
  }
>;

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function ChartContainer({
  title,
  description,
  children,
  className,
  ...props
}: ChartContainerProps) {
  return (
    <div className={cn('rounded-3xl border border-border bg-card shadow-sm', className)} {...props}>
      {(title || description) && (
        <div className="border-b border-border px-6 py-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

export function ChartTooltip(
  props: TooltipProps<ValueType, NameType>
) {
  return <RechartsTooltip {...props} />;
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  indicator?: 'line' | 'bar' | 'radar' | 'area';
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  indicator = 'line',
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const value = item?.payload?.value ?? item?.value;
  const name = item?.payload?.name ?? item?.name;

  return (
    <div className="rounded-3xl border border-border bg-card p-4 text-sm text-foreground shadow-lg">
      {label !== undefined && <p className="text-xs text-muted-foreground">{label}</p>}
      <div className="flex items-center gap-2 mt-2">
        <span
          className={cn(
            'inline-flex h-2.5 w-2.5 rounded-full',
            indicator === 'bar' ? 'bg-emerald-500' : 'bg-accent'
          )}
        />
        <div>
          <p className="font-semibold">{value}</p>
          {name && <p className="text-xs text-muted-foreground">{name}</p>}
        </div>
      </div>
    </div>
  );
}
