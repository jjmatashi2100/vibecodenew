import React from 'react';

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <span 
      className={`inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-current ${className || ''}`}
    />
  );
}

export default Spinner;
