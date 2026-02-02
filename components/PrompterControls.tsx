
import React from 'react';

interface PrompterControlsProps {
    isPlaying: boolean;
    isRecording: boolean;
    isCameraActive: boolean;
    speedMultiplier: number;
    onPlayPause: () => void;
    onStop: () => void;
    onRewind: () => void;
    onToggleSettings: () => void;
    onRecord: () => void;
    onClose: () => void;
    onSpeedChange: (speed: number) => void;
}

export const PrompterControls: React.FC<PrompterControlsProps> = (props) => {
    return (
        <div className="bg-zinc-950/90 backdrop-blur border-t border-zinc-900 px-4 py-4 pb-8 sm:pb-4 z-50">
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                    <button onClick={props.onClose} className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                    <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50 flex-1 sm:hidden">
                        <input type="range" min="0.1" max="2.5" step="0.1" value={props.speedMultiplier} onChange={e => props.onSpeedChange(parseFloat(e.target.value))} className="flex-1 accent-indigo-600 h-1 bg-zinc-800 rounded-lg"/>
                        <span className="text-[10px] font-mono text-zinc-400 w-8">{props.speedMultiplier.toFixed(1)}x</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="hidden sm:flex items-center gap-3 w-40">
                         <input type="range" min="0.1" max="2.5" step="0.1" value={props.speedMultiplier} onChange={e => props.onSpeedChange(parseFloat(e.target.value))} className="flex-1 accent-indigo-600 h-1 bg-zinc-800 rounded-lg"/>
                         <span className="text-[10px] font-mono text-zinc-500">{props.speedMultiplier.toFixed(1)}x</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button onClick={props.onRewind} className="text-xl opacity-50 hover:opacity-100">⏪</button>
                        <button onClick={props.onPlayPause} className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${props.isPlaying ? 'bg-indigo-600' : 'bg-green-600'}`}>
                            {props.isPlaying ? '⏸' : '▶'}
                        </button>
                        <button onClick={props.onStop} className="p-2 text-zinc-500 hover:text-white"><div className="w-3 h-3 bg-white rounded-sm"/></button>
                        <div className="w-px h-6 bg-zinc-800"/>
                        <button onClick={props.onToggleSettings} className="text-xl hover:scale-110 transition-transform">⚙️</button>
                        <button onClick={props.onRecord} className={`p-2 rounded-full transition-all ${props.isRecording ? 'bg-red-500/20 ring-2 ring-red-500 text-red-500' : 'text-zinc-500'}`}>
                            <div className={`w-4 h-4 bg-current rounded-${props.isRecording ? 'sm' : 'full'}`}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
