import React from 'react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const baseStyles = "rounded-md border p-4 flex gap-2 items-start";
    const variantStyles = {
      default: "bg-gray-800 border-gray-700 text-white",
      destructive: "bg-red-900/30 border-red-700 text-red-100"
    };
    
    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;
    
    return (
      <div
        ref={ref}
        role="alert"
        className={combinedClassName}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = '', ...props }, ref) => (
  <strong
    ref={ref}
    className={`font-semibold ${className}`}
    {...props}
  />
));

AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm opacity-90 ${className}`}
    {...props}
  />
));

AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
export default Alert;
