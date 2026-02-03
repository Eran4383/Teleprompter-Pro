
import React from 'react';
import { useAppStore } from '../../../../../store/useAppStore';
import { useAutomationStore } from '../../../../../store/useAutomationStore';

export const AutomationControls: React.FC = () => {
    const { config, setConfig, currentScriptId, setToast } = useAppStore();
    const { tracks, clearTrack } = useAutomationStore();

    const hasTrack = currentScriptId && tracks[currentScriptId] && tracks[currentScriptId].length > 0;

    const toggleMode = (mode: 'manual' | 'recording' | 'playback') => {
        if (mode === 'playback' && !hasTrack) {
            setToast({ msg: "No recorded automation found for this script.", type: "error" });
            return;
        }
        setConfig({ ...config, automationMode: mode });
    };

    const handleReset = () => {
        if (currentScriptId && confirm("Delete recording for this script?")) {
            clearTrack(currentScriptId);
            setConfig({ ...config, automationMode: 'manual' });
        }
    };

    return (
        <section className="space-y-4 pt-4 border-t border-zinc-900">
            <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Performance Driver</h3>
                {hasTrack && (
                    <button onClick={handleReset} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-tight">Clear Data</button>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
                <button 
                    onClick={() => toggleMode('manual')}
                    className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all ${config.automationMode === 'manual' ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <span className="text-sm">📏</span>
                    <span className="text-[9px] font-bold uppercase tracking-tight">Manual</span>
                </button>
                <button 
                    onClick={() => toggleMode('recording')}
                    className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all ${config.automationMode === 'recording' ? 'bg-red-600 text-white shadow-lg animate-pulse' : 'text-zinc-500 hover:text-red-400'}`}
                >
                    <span className="text-sm">●</span>
                    <span className="text-[9px] font-bold uppercase tracking-tight">Record</span>
                </button>
                <button 
                    onClick={() => toggleMode('playback')}
                    className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all ${config.automationMode === 'playback' ? 'bg-green-600 text-white shadow-lg' : hasTrack ? 'text-zinc-500 hover:text-green-400' : 'text-zinc-800 cursor-not-allowed'}`}
                >
                    <span className="text-sm">▶</span>
                    <span className="text-[9px] font-bold uppercase tracking-tight">Play</span>
                </button>
            </div>

            <p className="text-[9px] text-zinc-600 leading-tight text-center px-2">
                {config.automationMode === 'manual' && "Standard linear scrolling mode."}
                {config.automationMode === 'recording' && "Capturing your scroll movements. Perform now to save timing."}
                {config.automationMode === 'playback' && "Replaying your captured performance. Hands-free mode active."}
            </p>
        </section>
    );
};
