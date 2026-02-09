import React, { createContext, forwardRef, HTMLAttributes, ReactNode } from "react";

// Create context for tooltip
const TooltipContext = createContext<{ open?: boolean }>({
  open: false,
});

interface TooltipProps {
  children: ReactNode;
  className?: string;
}

const Tooltip = ({ children, className = "" }: TooltipProps) => {
  return (
    <TooltipContext.Provider value={{ open: false }}>
      <span className={`inline-block relative ${className}`}>{children}</span>
    </TooltipContext.Provider>
  );
};

interface TooltipTriggerProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  className?: string;
}

const TooltipTrigger = forwardRef<HTMLSpanElement, TooltipTriggerProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <span ref={ref} className={`inline-block ${className}`} {...props}>
        {children}
      </span>
    );
  }
);
TooltipTrigger.displayName = "TooltipTrigger";

interface TooltipContentProps {
  children: ReactNode;
  className?: string;
}

const TooltipContent = ({ children, className = "" }: TooltipContentProps) => {
  return (
    <span className={`text-sm ${className}`}>
      {children}
    </span>
  );
};

interface TitleTooltipProps {
  children: ReactNode;
  content: string;
  className?: string;
}

const TitleTooltip = ({ children, content, className = "" }: TitleTooltipProps) => {
  return (
    <span title={content} className={className}>
      {children}
    </span>
  );
};

export { Tooltip, TooltipTrigger, TooltipContent, TitleTooltip };
