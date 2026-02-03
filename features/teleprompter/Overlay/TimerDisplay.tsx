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
        <div className={`absolute top-8 left-8 z-30 pointer-events-none select-none transition-transform duration-500 ${config.isMirrored ? 'scale-x-[-1]' : ''}`}>
            <div className="font-mono text-5xl sm:text-6xl font-black text-white/20 tracking-tighter tabular-nums drop-shadow-2xl">
                {formatTime(elapsedTime)}
            </div>
        </div>
    );
};