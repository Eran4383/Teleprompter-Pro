
import React from 'react';
import { useAppStore } from '../../../../../store/useAppStore';

export const PlaybackModeSelector: React.FC = () => {
    const { config, setConfig } = useAppStore();

    return (
        <div className="space-y-3">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Playback Synchronization</h3>
            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
                <button 
                    onClick={() => setConfig({ ...config, videoSyncEnabled: true })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${config.videoSyncEnabled ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <span className="text-sm">🔗</span>
                    <span className="text-[11px] font-bold uppercase tracking-tight">Linked</span>
                </button>
                <button 
                    onClick={() => setConfig({ ...config, videoSyncEnabled: false })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${!config.videoSyncEnabled ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <span className="text-sm">🔓</span>
                    <span className="text-[11px] font-bold uppercase tracking-tight">Free</span>
                </button>
            </div>
            <p className="text-[9px] text-zinc-600 leading-tight">
                {config.videoSyncEnabled 
                    ? "Video position is locked to your reading progress." 
                    : "Video plays independently. Scroll text freely without affecting the video."}
            </p>
        </div>
    );
};
