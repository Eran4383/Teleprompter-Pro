
import React from 'react';

interface ModalProps {
    isOpen: boolean;
    title: string;
    message?: string;
    onClose: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    isInput?: boolean;
    inputValue?: string;
    onInputChange?: (val: string) => void;
    type?: 'info' | 'danger' | 'input';
}

export const Modal: React.FC<ModalProps> = ({ 
    isOpen, title, message, onClose, onConfirm, confirmText = "OK", isInput, inputValue, onInputChange, type = 'info' 
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm p-5 animate-modal-pop" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                {message && <p className="text-zinc-400 text-sm mb-4 leading-relaxed">{message}</p>}
                
                {isInput && onInputChange && (
                    <input 
                        type="text" 
                        value={inputValue} 
                        onChange={e => onInputChange(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-sm mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                        autoFocus
                    />
                )}

                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
                    {onConfirm && (
                        <button 
                            onClick={() => { onConfirm(); onClose(); }} 
                            className={`px-4 py-2 text-xs font-medium rounded-lg text-white transition-colors ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
