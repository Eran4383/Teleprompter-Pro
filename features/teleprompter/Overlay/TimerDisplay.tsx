
import React from 'react';
import { useAppStore } from '../../../store/useAppStore';

interface TimerDisplayProps {
    elapsedTime: number;
}

const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ elapsedTime }) => {
    const { config } = useAppStore();

    if (!config.showTimer) return null;

    return (
        <div className={`absolute top-8 left-8 z-30 pointer-events-none select-none transition-transform duration-500 flex flex-col gap-2 ${config.isMirrored ? 'scale-x-[-1]' : ''}`}>
            <div className="font-mono text-5xl sm:text-6xl font-black text-white/20 tracking-tighter tabular-nums drop-shadow-2xl">
                {formatTime(elapsedTime)}
            </div>
            {config.automationMode === 'recording' && (
                <div className="flex items-center gap-2 px-2 py-1 bg-red-600/20 border border-red-600/30 rounded self-start">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Capture Active</span>
                </div>
            )}
            {config.automationMode === 'playback' && (
                <div className="flex items-center gap-2 px-2 py-1 bg-indigo-600/20 border border-indigo-600/30 rounded self-start">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Automation Lock</span>
                </div>
            )}
        </div>
    );
};
