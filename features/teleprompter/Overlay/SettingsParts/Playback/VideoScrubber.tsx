
import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../../../../../store/useAppStore';

interface VideoScrubberProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const VideoScrubber: React.FC<VideoScrubberProps> = ({ videoRef }) => {
    const { config } = useAppStore();
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        const update = () => {
            if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
                setDuration(videoRef.current.duration || 0);
            }
        };

        intervalRef.current = window.setInterval(update, 100);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [videoRef]);

    if (config.bgMode !== 'video' || config.videoSyncEnabled) return null;

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = val;
            setCurrentTime(val);
        }
    };

    const formatTime = (time: number) => {
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="space-y-2 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 animate-modal-pop">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Independent Video Timeline</span>
                <span className="text-[10px] font-mono text-zinc-500">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <input 
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
        </div>
    );
};
