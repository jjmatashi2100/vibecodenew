import React, { forwardRef, InputHTMLAttributes } from 'react';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'checked' | 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked = false, onCheckedChange, className, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(event.target.checked);
    };

    return (
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={handleChange}
          ref={ref}
          {...props}
        />
        <div className={`relative w-10 h-5 ${checked ? 'bg-blue-600' : 'bg-gray-600'} rounded-full transition-colors`}>
          <div
            className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full transition-transform ${
              checked ? 'translate-x-5' : ''
            }`}
          />
        </div>
      </label>
    );
  }
);

Switch.displayName = 'Switch';

export default Switch;
