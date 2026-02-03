
import React from 'react';
import { useAppStore } from '../../../../store/useAppStore';

export const DirectorControls: React.FC = () => {
    const { 
        automationMode, setAutomationMode, 
        takes, deleteTake, 
        activeTakeId, setActiveTakeId,
        currentScriptId
    } = useAppStore();

    const scriptTakes = takes.filter(t => t.scriptId === currentScriptId);

    return (
        <section className="space-y-4 pt-4 border-t border-zinc-900">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Director Engine</h3>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setAutomationMode(automationMode === 'RECORDING' ? 'IDLE' : 'RECORDING')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${automationMode === 'RECORDING' ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}
                >
                    {automationMode === 'RECORDING' ? 'STOP RECORDING' : 'CAPTURE PERFORMANCE'}
                </button>
            </div>

            <div className="space-y-2">
                <span className="text-[9px] font-bold text-zinc-600 uppercase">Performance Takes</span>
                {scriptTakes.length === 0 ? (
                    <p className="text-[9px] text-zinc-700 italic">No takes captured for this script.</p>
                ) : (
                    <div className="max-h-32 overflow-y-auto space-y-1 no-scrollbar">
                        {scriptTakes.map((take) => (
                            <div 
                                key={take.id} 
                                className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${activeTakeId === take.id ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'}`}
                                onClick={() => {
                                    setActiveTakeId(take.id);
                                    setAutomationMode('PLAYBACK');
                                }}
                            >
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-zinc-200">Take {take.id.split('-')[1].slice(-4)}</span>
                                    <span className="text-[8px] text-zinc-500">{new Date(take.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {(take.duration / 1000).toFixed(1)}s</span>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); deleteTake(take.id); if (activeTakeId === take.id) setActiveTakeId(null); }}
                                    className="p-1 hover:text-red-500 text-zinc-600 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {automationMode === 'PLAYBACK' && (
                <button 
                    onClick={() => setAutomationMode('IDLE')}
                    className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[9px] font-bold text-zinc-400 transition-colors border border-zinc-700"
                >
                    EXIT PLAYBACK MODE
                </button>
            )}
        </section>
    );
};
