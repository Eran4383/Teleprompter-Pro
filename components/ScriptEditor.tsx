
import React, { useRef } from 'react';
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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const applyColor = (color: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const newSegments = segments.map(seg => ({
            ...seg,
            words: seg.words.map((w, i) => {
                const el = document.querySelector(`[data-seg-id="${seg.id}"][data-word-idx="${i}"]`);
                return el && range.intersectsNode(el) ? { ...w, color } : w;
            })
        }));
        hook.onSegmentsChange(newSegments);
        hook.saveToHistory(newSegments);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 relative">
            <Modal {...hook.modalConfig} inputValue={hook.tempInput} onInputChange={hook.setTempInput} onClose={() => hook.setModalConfig({ isOpen: false })} />
            {hook.toast && <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full border backdrop-blur-md transition-all animate-fade-in-down ${hook.toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>{hook.toast.msg}</div>}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800 gap-3">
                <div className="flex space-x-2">
                    {(['write', 'tune', 'history'] as const).map(tab => (
                        <button key={tab} onClick={() => hook.setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${hook.activeTab === tab ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>{tab}</button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => hook.setModalConfig({ isOpen: true, title: "Clear?", message: "Clear script?", type: "danger", onConfirm: () => { hook.onSegmentsChange([]); hook.setRawText(''); hook.setCurrentScriptId(null); } })} size="sm">Clear</Button>
                    <Button onClick={() => { if (hook.activeTab === 'write') hook.syncSegments(); hook.onStartPrompt(); }} icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}>Start</Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                {hook.activeTab === 'write' && (
                    <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
                        <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col lg:flex-row gap-2">
                            <div className="flex items-center gap-2 flex-1 border-r border-zinc-800 pr-2">
                                <Button variant="secondary" size="sm" onClick={hook.handleAIOptimize} isLoading={hook.isProcessing}>AI Timing</Button>
                                <input type="text" placeholder="Topic..." className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 h-9 text-xs text-white" value={hook.topicInput} onChange={e => hook.setTopicInput(e.target.value)} />
                                <Button size="sm" onClick={hook.handleAIGenerate} isLoading={hook.isProcessing} disabled={!hook.topicInput.trim()}>Gen</Button>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => hook.showToast("Saved to history")}>Sync</Button>
                        </div>
                        <textarea ref={textareaRef} className="flex-1 bg-zinc-950 text-zinc-100 p-4 rounded-lg resize-none border border-zinc-800 font-mono" value={hook.rawText} onChange={e => hook.setRawText(e.target.value)} placeholder="Type script..." />
                    </div>
                )}
                {hook.activeTab === 'tune' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar select-text">
                        <div className="shrink-0 p-2 flex justify-center gap-2 mb-4">
                            {['text-yellow-400', 'text-red-500', 'text-green-400', 'text-cyan-400', 'text-purple-400', ''].map((c, i) => (
                                <button key={i} onMouseDown={e => { e.preventDefault(); applyColor(c); }} className={`w-6 h-6 rounded-full border border-zinc-700 ${c || 'bg-zinc-800'}`} style={{ backgroundColor: c ? 'currentColor' : undefined }} />
                            ))}
                        </div>
                        {segments.map(seg => (
                            <div key={seg.id} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                                <div className="flex flex-wrap gap-1.5 mb-3">{seg.words.map((w, i) => <span key={i} data-seg-id={seg.id} data-word-idx={i} className={`text-lg font-medium ${w.color || 'text-zinc-200'}`}>{w.text}</span>)}</div>
                                <div className="flex items-center gap-3"><input type="range" min="100" max="15000" step="100" value={seg.duration} onChange={e => hook.onSegmentsChange(segments.map(s => s.id === seg.id ? { ...s, duration: parseInt(e.target.value) } : s))} className="flex-1 accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none" /><span className="text-xs font-mono text-zinc-500">{(seg.duration / 1000).toFixed(1)}s</span></div>
                            </div>
                        ))}
                    </div>
                )}
                {hook.activeTab === 'history' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                        {hook.savedScripts.map(s => (
                            <div key={s.id} onClick={() => { hook.onSegmentsChange(s.segments); hook.setRawText(s.rawText); hook.setCurrentScriptId(s.id); hook.setActiveTab('write'); }} className={`p-3 rounded-lg border cursor-pointer ${hook.currentScriptId === s.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'}`}>
                                <div className="font-medium text-white">{s.title}</div>
                                <div className="text-xs text-zinc-500">{new Date(s.date).toLocaleDateString()} • {s.segments.length} segments</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
