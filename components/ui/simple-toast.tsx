import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let globalToast: ToastContextType | null = null;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 3000);
  }, []);

  const success = useCallback((message: string) => {
    addToast({ message, type: 'success' });
  }, [addToast]);

  const error = useCallback((message: string) => {
    addToast({ message, type: 'error' });
  }, [addToast]);

  const info = useCallback((message: string) => {
    addToast({ message, type: 'info' });
  }, [addToast]);

  const warning = useCallback((message: string) => {
    addToast({ message, type: 'warning' });
  }, [addToast]);

  const value = { success, error, info, warning };
  
  // Set global reference for use outside of React components
  globalToast = value;

  return React.createElement(
    ToastContext.Provider,
    { value },
    children,
    React.createElement(
      'div',
      { className: 'fixed top-4 right-4 z-50 space-y-2' },
      toasts.map(toast =>
        React.createElement(
          'div',
          {
            key: toast.id,
            className: `px-4 py-2 rounded-lg shadow-lg transition-all duration-300 animate-in slide-in-from-right ${
              toast.type === 'success' ? 'bg-success text-white' :
              toast.type === 'error' ? 'bg-destructive text-white' :
              toast.type === 'warning' ? 'bg-warning text-white' :
              'bg-info text-white'
            }`
          },
          toast.message
        )
      )
    )
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback to global toast if context is not available
    return globalToast || {
      success: (message: string) => console.log('Success:', message),
      error: (message: string) => console.error('Error:', message),
      info: (message: string) => console.info('Info:', message),
      warning: (message: string) => console.warn('Warning:', message),
    };
  }
  return context;
}

// Create a simple toast object for direct import
export const toast = {
  success: (message: string) => {
    if (globalToast) {
      globalToast.success(message);
    } else {
      console.log('Success:', message);
    }
  },
  error: (message: string) => {
    if (globalToast) {
      globalToast.error(message);
    } else {
      console.error('Error:', message);
    }
  },
  info: (message: string) => {
    if (globalToast) {
      globalToast.info(message);
    } else {
      console.info('Info:', message);
    }
  },
  warning: (message: string) => {
    if (globalToast) {
      globalToast.warning(message);
    } else {
      console.warn('Warning:', message);
    }
  },
};