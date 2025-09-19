import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseClasses = "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold";
    
    const variantClasses = {
      default: "bg-blue-700 text-blue-100",
      secondary: "bg-gray-700 text-gray-200",
      success: "bg-green-700 text-green-100",
      warning: "bg-amber-700 text-amber-100"
    };
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${className || ''}`;
    
    return <span ref={ref} className={classes} {...props} />;
  }
);

Badge.displayName = "Badge";

export default Badge;
