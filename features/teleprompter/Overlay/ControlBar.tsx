import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../../components/ui/Button';

interface ControlBarProps {
    isPlaying: boolean;
    onPlayPause: () => void;
    onStop: () => void;
    onRewind: () => void;
    onToggleSettings: () => void;
    onToggleCamera: () => void;
    onToggleRecord: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
    isPlaying,
    onPlayPause,
    onStop,
    onRewind,
    onToggleSettings,
    onToggleCamera,
    onToggleRecord
}) => {
    const { 
        speedMultiplier, setSpeedMultiplier, 
        isCameraActive, isRecording, 
        setMode 
    } = useAppStore();

    return (
        <div className="bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900 px-6 py-4 pb-8 sm:pb-6 z-50 shadow-2xl" onDoubleClick={e => e.stopPropagation()}>
            <div className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-5">
                
                {/* Exit & Settings */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button 
                        onClick={() => setMode('EDITOR' as any)} 
                        className="p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-lg"
                        title="Back to Editor"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
                        </svg>
                    </button>
                    <button 
                        onClick={onToggleSettings} 
                        className="p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-lg"
                        title="Open Prompt Settings"
                    >
                        ⚙️
                    </button>
                    <div className="flex-1 sm:hidden flex items-center gap-3 px-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 h-11">
                         <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">SPD</span>
                         <input 
                            type="range" min="0.1" max="2.5" step="0.1" 
                            value={speedMultiplier} 
                            onChange={e => setSpeedMultiplier(parseFloat(e.target.value))} 
                            className="flex-1 accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                         <span className="text-xs font-mono text-zinc-300 w-8 text-right">{speedMultiplier.toFixed(1)}x</span>
                    </div>
                </div>

                {/* Primary Playback Controls */}
                <div className="flex items-center justify-center gap-6 sm:gap-8">
                    <button onClick={onRewind} className="p-2 text-zinc-500 hover:text-white transition-colors text-xl" title="Rewind 5s">⏪</button>
                    
                    <button 
                        onClick={onPlayPause} 
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${isPlaying ? 'bg-indigo-600 ring-4 ring-indigo-500/20' : 'bg-green-600 ring-4 ring-green-500/20'}`} 
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? (
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                    </button>

                    <button onClick={onStop} className="p-2 text-zinc-500 hover:text-white transition-colors" title="Stop & Reset">
                        <div className="w-4 h-4 bg-white rounded-sm shadow-sm"/>
                    </button>
                </div>

                {/* Camera & Speed (Desktop) */}
                <div className="flex items-center gap-6">
                    <div className="hidden sm:flex items-center gap-3 w-40 bg-zinc-900/50 px-3 py-2 rounded-xl border border-zinc-800/50">
                         <input 
                            type="range" min="0.1" max="2.5" step="0.1" 
                            value={speedMultiplier} 
                            onChange={e => setSpeedMultiplier(parseFloat(e.target.value))} 
                            className="flex-1 accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer" 
                            title="Playback Speed"
                        />
                         <span className="text-[10px] font-mono text-zinc-500 w-8">{speedMultiplier.toFixed(1)}x</span>
                    </div>

                    <button 
                        onClick={onToggleRecord} 
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${!isCameraActive ? 'bg-zinc-800 text-zinc-500 hover:text-red-500' : ''} ${isRecording ? 'bg-red-500/30 text-red-500 ring-2 ring-red-500 animate-pulse' : (isCameraActive ? 'bg-zinc-900 text-red-600 border border-red-900/50' : '')}`} 
                        title={isCameraActive ? (isRecording ? "Stop Recording" : "Start Recording") : "Enable Camera to Record"}
                    >
                        <div className={`w-4 h-4 bg-current shadow-sm transition-all duration-300 ${isRecording ? 'rounded-sm' : 'rounded-full'}`}/>
                    </button>
                </div>
            </div>
        </div>
    );
};