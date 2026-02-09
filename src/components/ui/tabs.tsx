import React, { createContext, useContext } from 'react';

// Create context for tabs
type TabsContextType = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = createContext<TabsContextType | undefined>(undefined);

// Hook to use tabs context
const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs component');
  }
  return context;
};

// Tabs component
interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function Tabs({ value, onValueChange, className = '', children }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, setValue: onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// TabsList component
interface TabsListProps {
  className?: string;
  children?: React.ReactNode;
}

export function TabsList({ className = '', children }: TabsListProps) {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {children}
    </div>
  );
}

// TabsTrigger component
interface TabsTriggerProps {
  value: string;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function TabsTrigger({ 
  value, 
  className = '', 
  disabled = false, 
  children 
}: TabsTriggerProps) {
  const { value: selectedValue, setValue } = useTabsContext();
  const isActive = selectedValue === value;
  
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setValue(value)}
      className={`
        px-3 py-1 rounded-md text-sm
        ${isActive 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-700 text-gray-200 hover:bg-gray-650'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// TabsContent component
interface TabsContentProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
}

export function TabsContent({ value, className = '', children }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext();
  const isSelected = selectedValue === value;
  
  return (
    <div 
      className={className}
      hidden={!isSelected}
    >
      {children}
    </div>
  );
}
