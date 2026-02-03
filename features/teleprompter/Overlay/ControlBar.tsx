
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
                <div className="flex items-center justify-between gap-2 py-1">
                    
                    {/* Secondary Controls Left */}
                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={() => setMode('EDITOR' as any)} 
                            className="p-2.5 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-all border border-zinc-800 active:scale-95"
                            title="Back to Editor"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 17l-5-5m0 0l5-5m-5 5h12"/></svg>
                        </button>
                        <button 
                            onClick={onToggleSettings} 
                            className="p-2.5 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-all border border-zinc-800 active:scale-95"
                            title="Settings"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                    </div>

                    {/* Main Transport Center */}
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onPlayPause} 
                            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${isPlaying ? 'bg-indigo-600 ring-4 ring-indigo-500/20' : 'bg-emerald-600 ring-4 ring-emerald-500/20'}`} 
                        >
                            {isPlaying ? (
                                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ) : (
                                <svg className="w-7 h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            )}
                        </button>
                        <button 
                            onClick={onStop} 
                            className="p-3 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-all border border-zinc-800 active:scale-95"
                            title="Reset"
                        >
                            <div className="w-4 h-4 bg-current rounded-sm"/>
                        </button>
                    </div>

                    {/* Recording & Camera Right */}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onToggleCamera} 
                            className={`p-3 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${isCameraActive ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                            title={isCameraActive ? "Turn Off Camera" : "Turn On Camera"}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                {!isCameraActive && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" className="opacity-60" />}
                            </svg>
                        </button>
                        <button 
                            onClick={onToggleRecord} 
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${isRecording ? 'bg-red-600 ring-4 ring-red-500/20 text-white animate-pulse' : 'bg-zinc-900 border border-zinc-800 text-red-600 hover:bg-red-600/10'}`} 
                            title={isRecording ? "Stop Recording" : "Start Recording"}
                        >
                            <div className={`bg-current transition-all duration-300 ${isRecording ? 'w-4 h-4 rounded-sm' : 'w-5 h-5 rounded-full'}`}/>
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
