import React from 'react';

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

export const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => {
    return (
        <button 
            onClick={onClick}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-500 hover:text-white'
            }`}
        >
            {children}
        </button>
    );
};