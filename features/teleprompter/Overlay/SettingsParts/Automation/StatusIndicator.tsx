
import React from 'react';
import { useAppStore } from '../../../../../store/useAppStore';

export const StatusIndicator: React.FC = () => {
    const { config } = useAppStore();

    if (config.automationMode === 'manual') return null;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-950/50 backdrop-blur shadow-lg animate-modal-pop">
            <div className={`w-2 h-2 rounded-full ${config.automationMode === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${config.automationMode === 'recording' ? 'text-red-400' : 'text-green-400'}`}>
                {config.automationMode === 'recording' ? 'Rec Automation' : 'Auto Performance'}
            </span>
        </div>
    );
};
