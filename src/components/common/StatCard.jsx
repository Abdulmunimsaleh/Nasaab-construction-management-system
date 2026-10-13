import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend, // { value: '+12%', isPositive: true }
  variant = 'default', // 'default', 'warning', 'danger', 'brand'
  badge,
  onClick
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'brand':
        return 'border-amber-200 bg-gradient-to-br from-amber-500/5 to-amber-500/10 text-amber-900';
      case 'warning':
        return 'border-amber-200 bg-amber-50/50 text-amber-900';
      case 'danger':
        return 'border-rose-200 bg-rose-50/50 text-rose-900';
      default:
        return 'border-slate-200 bg-white hover:border-slate-300';
    }
  };

  const getIconContainerStyles = () => {
    switch (variant) {
      case 'brand':
        return 'bg-amber-500 text-white shadow-sm shadow-amber-500/20';
      case 'warning':
        return 'bg-amber-100 text-amber-700';
      case 'danger':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-700 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl border p-5 shadow-sm transition-all duration-200 ${getVariantStyles()} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
            {title}
          </span>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
              {value}
            </h3>
            {badge && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                {badge}
              </span>
            )}
          </div>
        </div>

        {Icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${getIconContainerStyles()}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-100/80 pt-2.5">
          {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
          {trend && (
            <div
              className={`flex items-center font-medium ${
                trend.neutral
                  ? 'text-slate-500'
                  : trend.isPositive
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}
            >
              {trend.neutral ? (
                <Minus className="mr-0.5 h-3.5 w-3.5" />
              ) : trend.isPositive ? (
                <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
