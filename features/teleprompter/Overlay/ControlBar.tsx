
import React from 'react';
import { useAppStore } from '../../../store/useAppStore';

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
        setMode, config, setConfig 
    } = useAppStore();

    return (
        <div className="bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900 px-4 py-4 sm:px-6 z-50 shadow-2xl" onDoubleClick={e => e.stopPropagation()}>
            <div className="max-w-5xl mx-auto w-full grid grid-cols-3 sm:flex sm:items-center sm:justify-between gap-4">
                
                {/* Left Section: Meta Controls */}
                <div className="flex items-center gap-2 col-span-1">
                    <button 
                        onClick={() => setMode('EDITOR' as any)} 
                        className="p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-lg shrink-0"
                        title="Back to Editor"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
                        </svg>
                    </button>
                    <button 
                        onClick={onToggleSettings} 
                        className="p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-lg shrink-0"
                        title="Studio Settings"
                    >
                        ⚙️
                    </button>
                    
                    {/* Sync Toggle */}
                    {config.bgMode === 'video' && (
                        <button 
                            onClick={() => setConfig({ ...config, videoSyncEnabled: !config.videoSyncEnabled })} 
                            className={`p-3 rounded-xl border transition-all shadow-lg ${config.videoSyncEnabled ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
                            title={config.videoSyncEnabled ? "De-sync Video" : "Sync Video to Text"}
                        >
                            {config.videoSyncEnabled ? '🔗' : '🔓'}
                        </button>
                    )}
                    
                    {/* Desktop Speed */}
                    <div className="hidden lg:flex items-center gap-3 w-32 bg-zinc-900/50 px-3 py-2 rounded-xl border border-zinc-800/50 ml-2">
                         <input 
                            type="range" min="0.1" max="2.5" step="0.1" 
                            value={speedMultiplier} 
                            onChange={e => setSpeedMultiplier(parseFloat(e.target.value))} 
                            className="flex-1 accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                         <span className="text-[9px] font-mono text-zinc-500">{speedMultiplier.toFixed(1)}x</span>
                    </div>
                </div>

                {/* Center Section: Main Playback */}
                <div className="flex items-center justify-center gap-4 sm:gap-8 col-span-1">
                    <button onClick={onRewind} className="hidden sm:block p-2 text-zinc-500 hover:text-white transition-colors text-xl" title="Rewind 5s">⏪</button>
                    
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

                    <button onClick={onStop} className="hidden sm:block p-2 text-zinc-500 hover:text-white transition-colors" title="Stop & Reset">
                        <div className="w-4 h-4 bg-white rounded-sm shadow-sm"/>
                    </button>
                </div>

                {/* Right Section: Capture Controls */}
                <div className="flex items-center justify-end gap-2 col-span-1">
                    {/* Visibility Toggle */}
                    <button 
                        onClick={() => setConfig({ ...config, bgVisible: !config.bgVisible })}
                        className={`p-3 rounded-xl border transition-all shadow-lg ${config.bgVisible ? 'bg-zinc-900 border-zinc-800 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                        title="Toggle Background Visibility"
                    >
                        {config.bgVisible ? '👁️' : '🕶️'}
                    </button>

                    {/* Hardware Toggle */}
                    <button 
                        onClick={onToggleCamera}
                        className={`hidden sm:flex p-3 rounded-xl border transition-all shadow-lg ${isCameraActive ? 'bg-zinc-900 border-indigo-900/50 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                        title="Hardware Camera"
                    >
                        📷
                    </button>

                    {/* Record Button */}
                    <button 
                        onClick={onToggleRecord} 
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${isRecording ? 'bg-red-500/30 text-red-500 ring-2 ring-red-500 animate-pulse' : 'bg-zinc-900 border border-zinc-800 text-red-600 hover:border-red-900/50'}`} 
                        title={isRecording ? "Stop Recording" : "Start Recording"}
                    >
                        <div className={`w-4 h-4 bg-current shadow-sm transition-all duration-300 ${isRecording ? 'rounded-sm' : 'rounded-full'}`}/>
                    </button>
                </div>

                {/* Mobile Speed Row */}
                <div className="flex sm:hidden col-span-3 items-center gap-3 px-3 py-1 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">SPD</span>
                    <input 
                        type="range" min="0.1" max="2.5" step="0.1" 
                        value={speedMultiplier} 
                        onChange={e => setSpeedMultiplier(parseFloat(e.target.value))} 
                        className="flex-1 accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-zinc-300">{speedMultiplier.toFixed(1)}x</span>
                </div>
            </div>
        </div>
    );
};
