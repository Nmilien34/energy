import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// Toast Component
const ToastItem: React.FC<{ toast: Toast; onDelete: (id: string) => void }> = ({ toast, onDelete }) => {
    const { type, message } = toast;

    // Auto dismiss
    React.useEffect(() => {
        const timer = setTimeout(() => {
            onDelete(toast.id);
        }, 3000);
        return () => clearTimeout(timer);
    }, [toast.id, onDelete]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <Check className="w-4 h-4 text-green-400" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
            default: return <Info className="w-4 h-4 text-blue-400" />;
        }
    };

    return (
        <div className={`
      flex items-center gap-3 px-4 py-3 rounded-full 
      bg-zinc-900/90 border border-zinc-800 backdrop-blur-md shadow-2xl 
      transform transition-all duration-500 ease-out animate-in slide-in-from-bottom-5 fade-in
      min-w-[300px] max-w-sm mx-auto mb-3 pointer-events-auto
    `}>
            <div className={`p-1.5 rounded-full bg-white/5`}>
                {getIcon()}
            </div>
            <p className="flex-1 text-sm font-medium text-white/90">{message}</p>
            <button
                onClick={() => onDelete(toast.id)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
                <X className="w-4 h-4 text-zinc-500" />
            </button>
        </div>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center pointer-events-none">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDelete={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
