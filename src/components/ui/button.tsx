import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus:outline-none";
    
    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-700",
      outline: "border border-gray-600 text-white hover:bg-gray-700",
      ghost: "text-white hover:bg-gray-700",
      destructive: "bg-red-600 text-white hover:bg-red-700"
    };
    
    const sizes = {
      sm: "h-8 px-2 text-sm",
      md: "h-9 px-3 text-sm",
      lg: "h-10 px-4"
    };
    
    const combinedClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className || ''}`;
    
    return (
      <button 
        className={combinedClasses}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export default Button;
