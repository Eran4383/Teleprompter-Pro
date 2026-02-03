
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

        intervalRef.current = window.setInterval(update, 50); // Faster update for smooth bar
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

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="absolute top-0 left-0 w-full group h-1.5 hover:h-2 transition-all cursor-pointer z-50">
            {/* Visual Progress Bar */}
            <div className="absolute inset-0 bg-zinc-800/50" />
            <div 
                className="absolute inset-0 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-75" 
                style={{ width: `${progress}%` }} 
            />
            
            {/* Invisible Range Input for Interaction */}
            <input 
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {/* Time Tooltip on Hover */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')} 
                <span className="text-zinc-600 mx-1">/</span>
                {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}
            </div>
        </div>
    );
};
