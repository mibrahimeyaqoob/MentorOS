import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 4000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div 
                        key={toast.id} 
                        className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-right-10 ${
                            toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900' :
                            toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-900' :
                            'bg-indigo-50/95 border-indigo-200 text-indigo-900'
                        }`}
                    >
                        {toast.type === 'success' && <CheckCircle className="text-emerald-500" size={20} />}
                        {toast.type === 'error' && <AlertTriangle className="text-red-500" size={20} />}
                        {toast.type === 'info' && <Info className="text-indigo-500" size={20} />}
                        <span className="font-bold text-sm pr-2">{toast.message}</span>
                        <button onClick={() => setToasts(t => t.filter(x => x.id !== toast.id))} className="ml-auto text-current opacity-50 hover:opacity-100">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);