
import React from 'react';
import { useAppStore } from '../../../../../store/useAppStore';
import { useAutomationStore } from '../../../../../store/useAutomationStore';
import { useScriptActions } from '../../../../../hooks/useScriptActions';
import { useAutomationEngine } from '../../../../../hooks/useAutomationEngine';

export const AutomationControls: React.FC = () => {
    const { config, setConfig, currentScriptId, setToast, isPlaying } = useAppStore();
    const { tracks, clearTrack } = useAutomationStore();
    const { bakeAutomationToNewScript } = useScriptActions();
    const { commit } = useAutomationEngine();

    const hasTrack = currentScriptId && tracks[currentScriptId] && tracks[currentScriptId].length > 0;
    const isRecording = config.automationMode === 'recording';

    const toggleMode = (mode: 'manual' | 'recording' | 'playback') => {
        // If we are currently recording and switching away, commit the buffer
        if (config.automationMode === 'recording' && mode !== 'recording') {
            commit();
        }

        // Toggle logic: If clicking the active mode, go back to manual
        const nextMode = config.automationMode === mode ? 'manual' : mode;

        if (nextMode === 'playback' && !hasTrack) {
            setToast({ msg: "No recorded automation found.", type: "error" });
            return;
        }
        
        setConfig({ ...config, automationMode: nextMode });
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
                    <button onClick={handleReset} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-tight">Clear Track</button>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
                <button 
                    onClick={() => setConfig({ ...config, automationMode: 'manual' })}
                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg transition-all ${config.automationMode === 'manual' ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    <span className="text-[8px] font-black uppercase tracking-tighter">Linear</span>
                </button>
                
                <button 
                    onClick={() => toggleMode('recording')}
                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg transition-all ${isRecording ? 'bg-red-600 text-white shadow-lg animate-pulse' : 'text-zinc-500 hover:text-red-400'}`}
                >
                    {isRecording ? (
                        <div className="w-3.5 h-3.5 bg-current rounded-sm" /> // Stop Square
                    ) : (
                        <div className="w-3.5 h-3.5 bg-current rounded-full" /> // Rec Circle
                    )}
                    <span className="text-[8px] font-black uppercase tracking-tighter">{isRecording ? 'Stop Rec' : 'Capture'}</span>
                </button>

                <button 
                    onClick={() => toggleMode('playback')}
                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg transition-all ${config.automationMode === 'playback' ? 'bg-green-600 text-white shadow-lg' : hasTrack ? 'text-zinc-500 hover:text-green-400' : 'text-zinc-800 cursor-not-allowed'}`}
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <span className="text-[8px] font-black uppercase tracking-tighter">Auto-Sync</span>
                </button>
            </div>

            {hasTrack && (
                <button 
                    onClick={bakeAutomationToNewScript}
                    className="w-full py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                >
                    Bake Performance to History
                </button>
            )}

            <p className="text-[9px] text-zinc-600 leading-tight text-center px-2">
                {config.automationMode === 'manual' && "Standard speed mode active."}
                {isRecording && "Performing... manual scrolls are being recorded."}
                {config.automationMode === 'playback' && "Replaying your manual performance."}
            </p>
        </section>
    );
};
