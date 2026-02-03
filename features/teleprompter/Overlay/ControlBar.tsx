
import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { VideoScrubber } from './SettingsParts/Playback/VideoScrubber';

interface ControlBarProps {
    isPlaying: boolean;
    onPlayPause: () => void;
    onStop: () => void;
    onRewind: () => void;
    onToggleSettings: () => void;
    onToggleCamera: () => void;
    onToggleRecord: () => void;
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const ControlBar: React.FC<ControlBarProps> = ({
    isPlaying, onPlayPause, onStop,
    onToggleSettings, onToggleCamera, onToggleRecord, videoRef
}) => {
    const { 
        speedMultiplier, setSpeedMultiplier, isCameraActive, isRecording, 
        setMode, config, setConfig 
    } = useAppStore();

    return (
        <div className="bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900 relative z-50 shadow-2xl pb-safe" onDoubleClick={e => e.stopPropagation()}>
            <VideoScrubber videoRef={videoRef} />

            <div className="max-w-7xl mx-auto w-full px-4 py-2 flex flex-col gap-2">
                
                {/* Unified Button Row */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
                    
                    {/* Secondary Controls Left */}
                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={() => setMode('EDITOR' as any)} 
                            className="p-2.5 bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-all border border-zinc-800"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 17l-5-5m0 0l5-5m-5 5h12"/></svg>
                        </button>
                        <button onClick={onToggleSettings} className="p-2.5 bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-all border border-zinc-800">⚙️</button>
                    </div>

                    {/* Main Transport Center */}
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onPlayPause} 
                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${isPlaying ? 'bg-indigo-600' : 'bg-green-600'}`} 
                        >
                            {isPlaying ? (
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ) : (
                                <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            )}
                        </button>
                        <button onClick={onStop} className="p-2.5 bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-all border border-zinc-800">
                            <div className="w-4 h-4 bg-current rounded-sm"/>
                        </button>
                    </div>

                    {/* Recording & Camera Right */}
                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={onToggleCamera} 
                            className={`p-2.5 rounded-lg border transition-all ${isCameraActive ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                        >
                            📷
                        </button>
                        <button 
                            onClick={onToggleRecord} 
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${isRecording ? 'bg-red-600 ring-2 ring-red-500/50 animate-pulse text-white' : 'bg-zinc-900 border border-zinc-800 text-red-600 hover:bg-red-600/10'}`} 
                        >
                            <div className={`w-3 h-3 bg-current transition-all duration-300 ${isRecording ? 'rounded-sm' : 'rounded-full'}`}/>
                        </button>
                    </div>
                </div>

                {/* Independent Speed Row */}
                <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-900/40 rounded-xl border border-zinc-800/40">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">Speed</span>
                    <input 
                        type="range" min="0.1" max="2.5" step="0.1" 
                        value={speedMultiplier} 
                        onChange={e => setSpeedMultiplier(parseFloat(e.target.value))} 
                        className="flex-1 accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-indigo-400 font-bold w-8 text-right">{speedMultiplier.toFixed(1)}x</span>
                </div>
            </div>
        </div>
    );
};
