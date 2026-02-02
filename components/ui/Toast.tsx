import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const Toast: React.FC = () => {
    const { toast, setToast } = useAppStore();

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast, setToast]);

    if (!toast) return null;

    return (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full shadow-xl border backdrop-blur-md transition-all animate-fade-in-down ${
            toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
            <span className="text-xs font-medium flex items-center gap-2">
                {toast.type === 'success' && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                    </svg>
                )}
                {toast.msg}
            </span>
        </div>
    );
};