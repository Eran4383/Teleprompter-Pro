
import React from 'react';
import { ScriptSegment } from '../types';
import { Button } from './Button';
import { Modal } from './Modal';
import { useScriptEditor } from '../hooks/useScriptEditor';

interface ScriptEditorProps {
    segments: ScriptSegment[];
    onSegmentsChange: (segments: ScriptSegment[]) => void;
    onStartPrompt: () => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ segments, onSegmentsChange, onStartPrompt }) => {
    const hook = useScriptEditor(segments, onSegmentsChange, onStartPrompt);

    return (
        <div className="flex flex-col h-full bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 relative">
            <Modal {...hook.modalConfig} inputValue={hook.tempInput} onInputChange={hook.setTempInput} onClose={() => hook.setModalConfig({ isOpen: false })} />
            
            {hook.toast && (
                <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full border backdrop-blur-md animate-fade-in-down ${hook.toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    {hook.toast.msg}
                </div>
            )}

            <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
                <div className="flex space-x-2">
                    {(['write', 'tune', 'history'] as const).map(tab => (
                        <button key={tab} onClick={() => hook.setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${hook.activeTab === tab ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>{tab}</button>
                    ))}
                </div>
                <Button onClick={() => { if (hook.activeTab === 'write') hook.syncSegments(); onStartPrompt(); }} icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}>Start</Button>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                {hook.activeTab === 'write' && (
                    <div className="flex-1 flex flex-col p-4 gap-4">
                        <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 flex gap-2">
                            <Button variant="secondary" size="sm" onClick={hook.handleAIOptimize} isLoading={hook.isProcessing}>AI Timing</Button>
                            <input type="text" placeholder="Topic..." className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white" value={hook.topicInput} onChange={e => hook.setTopicInput(e.target.value)} />
                            <Button size="sm" onClick={hook.handleAIGenerate} isLoading={hook.isProcessing} disabled={!hook.topicInput.trim()}>Gen</Button>
                        </div>
                        <textarea className="flex-1 bg-zinc-950 text-white p-4 rounded-lg resize-none border border-zinc-800 font-mono text-base outline-none focus:ring-1 focus:ring-indigo-500" value={hook.rawText} onChange={e => hook.setRawText(e.target.value)} placeholder="Type script here..." />
                    </div>
                )}
                
                {hook.activeTab === 'tune' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                        {segments.map(seg => (
                            <div key={seg.id} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                                <div className="text-lg font-medium mb-3">{seg.text}</div>
                                <div className="flex items-center gap-3">
                                    <input type="range" min="100" max="15000" step="100" value={seg.duration} onChange={e => onSegmentsChange(segments.map(s => s.id === seg.id ? { ...s, duration: parseInt(e.target.value) } : s))} className="flex-1 accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none" />
                                    <span className="text-xs font-mono text-zinc-500">{(seg.duration / 1000).toFixed(1)}s</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {hook.activeTab === 'history' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {hook.savedScripts.map(s => (
                            <div key={s.id} onClick={() => { onSegmentsChange(s.segments); hook.setRawText(s.rawText); hook.setCurrentScriptId(s.id); hook.setActiveTab('write'); }} className={`p-3 rounded-lg border cursor-pointer ${hook.currentScriptId === s.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'}`}>
                                <div className="font-medium text-white">{s.title}</div>
                                <div className="text-[10px] text-zinc-500">{new Date(s.date).toLocaleDateString()} • {s.segments.length} segments</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
