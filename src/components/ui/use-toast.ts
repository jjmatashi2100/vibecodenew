import { useState } from 'react';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

/**
 * Simple toast hook that logs messages to the console
 * Minimal implementation with no UI framework dependencies
 */
export function useToast() {
  // No state needed for this minimal implementation
  
  const toast = (options: ToastOptions) => {
    const { title, description, variant = 'default' } = options;
    const message = [
      title ? `Title: ${title}` : '',
      description ? `Description: ${description}` : ''
    ].filter(Boolean).join(' | ');
    
    if (variant === 'destructive') {
      console.error(`[TOAST-ERROR] ${message}`);
    } else {
      console.log(`[TOAST] ${message}`);
    }
  };
  
  return { toast };
}
