import React, { useState, useRef, useEffect } from 'react';
import { ScriptSegment, SavedScript } from '../types';
import { Button } from './Button';
import { generateScriptFromTopic, optimizeScript } from '../services/geminiService';

interface ScriptEditorProps {
    segments: ScriptSegment[];
    onSegmentsChange: (segments: ScriptSegment[]) => void;
    onStartPrompt: () => void;
}

const COLOR_PALETTE = [
    { class: '', label: 'White', bg: 'bg-zinc-200' },
    { class: 'text-yellow-400', label: 'Yellow', bg: 'bg-yellow-400' },
    { class: 'text-red-500', label: 'Red', bg: 'bg-red-500' },
    { class: 'text-green-400', label: 'Green', bg: 'bg-green-400' },
    { class: 'text-cyan-400', label: 'Cyan', bg: 'bg-cyan-400' },
    { class: 'text-purple-400', label: 'Purple', bg: 'bg-purple-400' },
];

interface ModalProps {
    isOpen: boolean;
    title: string;
    message?: string;
    onClose: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    isInput?: boolean;
    inputValue?: string;
    onInputChange?: (val: string) => void;
    type?: 'info' | 'danger' | 'input';
}

const Modal: React.FC<ModalProps> = ({ 
    isOpen, title, message, onClose, onConfirm, confirmText = "OK", isInput, inputValue, onInputChange, type = 'info' 
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm p-5 animate-modal-pop" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                {message && <p className="text-zinc-400 text-sm mb-4 leading-relaxed">{message}</p>}
                
                {isInput && onInputChange && (
                    <input 
                        type="text" 
                        value={inputValue} 
                        onChange={e => onInputChange(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-sm mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                        autoFocus
                    />
                )}

                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
                    {onConfirm && (
                        <button 
                            onClick={() => { onConfirm(); onClose(); }} 
                            className={`px-4 py-2 text-xs font-medium rounded-lg text-white transition-colors ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ segments, onSegmentsChange, onStartPrompt }) => {
    const [activeTab, setActiveTab] = useState<'write' | 'tune' | 'history'>('write');
    const [rawText, setRawText] = useState(segments.map(s => s.text).join('\n'));
    const [isProcessing, setIsProcessing] = useState(false);
    const [topicInput, setTopicInput] = useState('');
    const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
    const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
    const [currentScriptId, setCurrentScriptId] = useState<string | null>(null);
    const [modalConfig, setModalConfig] = useState<any>({ isOpen: false });
    const [tempInput, setTempInput] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const stored = localStorage.getItem('teleprompter_history');
        if (stored) {
            try { setSavedScripts(JSON.parse(stored)); } catch (e) {}
        }
    }, []);

    const showToast = (msg: string, type: 'success'|'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const saveToHistory = (newSegments: ScriptSegment[]) => {
        if (!newSegments.length) return;
        const raw = newSegments.map(s => s.text).join('\n');
        const firstLine = newSegments[0].text.slice(0, 20) + "...";
        let updated = [...savedScripts];
        if (currentScriptId) {
            updated = updated.map(s => s.id === currentScriptId ? { ...s, segments: newSegments, rawText: raw, date: new Date().toISOString() } : s);
        } else {
            const id = Date.now().toString();
            updated.unshift({ id, title: firstLine, date: new Date().toISOString(), segments: newSegments, rawText: raw });
            setCurrentScriptId(id);
        }
        setSavedScripts(updated);
        localStorage.setItem('teleprompter_history', JSON.stringify(updated));
    };

    const syncToSegments = () => {
        const lines = rawText.split('\n').filter(l => l.trim());
        const newSegs = lines.map((l, i) => ({
            id: segments[i]?.id || `seg-${Date.now()}-${i}`,
            text: l,
            words: l.split(' ').map(w => ({ text: w })),
            duration: Math.max(1000, l.split(' ').length * 500)
        }));
        onSegmentsChange(newSegs);
        saveToHistory(newSegs);
        return newSegs;
    };

    const handleStart = () => {
        if (activeTab === 'write') syncToSegments();
        onStartPrompt();
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 relative">
            <Modal isOpen={modalConfig.isOpen} title={modalConfig.title} message={modalConfig.message} confirmText={modalConfig.confirmText} type={modalConfig.type} isInput={modalConfig.isInput} inputValue={tempInput} onInputChange={setTempInput} onClose={() => setModalConfig({...modalConfig, isOpen: false})} onConfirm={modalConfig.onConfirm} />
            
            {toast && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-indigo-600 text-white shadow-lg text-xs font-medium">
                    {toast.msg}
                </div>
            )}

            <div className="flex justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('write')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'write' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Write</button>
                    <button onClick={() => { syncToSegments(); setActiveTab('tune'); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tune' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Tune</button>
                    <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>History</button>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => onSegmentsChange([])}>Clear</Button>
                    <Button size="sm" onClick={handleStart} icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}>Start</Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                {activeTab === 'write' && (
                    <div className="flex-1 flex flex-col p-4 gap-4">
                        <div className="flex justify-between items-center bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>Import</Button>
                                <Button variant="ghost" size="sm" onClick={() => {/* export logic */}}>Export</Button>
                            </div>
                            <div className="flex gap-2">
                                <input type="text" placeholder="AI Topic..." className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500" value={topicInput} onChange={e=>setTopicInput(e.target.value)} />
                                <Button size="sm" onClick={() => {/* ai gen logic */}} disabled={!topicInput.trim()}>Generate</Button>
                            </div>
                        </div>
                        <textarea className="flex-1 bg-zinc-950 text-white p-4 rounded-lg resize-none border border-zinc-800 focus:outline-none font-mono text-base" value={rawText} onChange={e=>setRawText(e.target.value)} placeholder="Type script here..."/>
                    </div>
                )}
                {activeTab === 'tune' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                        {segments.map(seg => (
                            <div key={seg.id} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                                <div className="mb-3 text-lg font-medium">{seg.text}</div>
                                <div className="flex items-center gap-4">
                                    <input type="range" min="100" max="15000" step="100" value={seg.duration} onChange={e => {
                                        const next = segments.map(s => s.id === seg.id ? { ...s, duration: parseInt(e.target.value) } : s);
                                        onSegmentsChange(next);
                                    }} className="flex-1 accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"/>
                                    <span className="text-xs font-mono text-zinc-500">{(seg.duration/1000).toFixed(1)}s</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 'history' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                        {savedScripts.map(script => (
                            <div key={script.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex justify-between items-center hover:border-zinc-600 cursor-pointer" onClick={() => { onSegmentsChange(script.segments); setRawText(script.rawText); setCurrentScriptId(script.id); setActiveTab('write'); showToast("Loaded"); }}>
                                <div>
                                    <div className="font-bold text-zinc-200">{script.title}</div>
                                    <div className="text-[10px] text-zinc-500">{new Date(script.date).toLocaleDateString()}</div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); const next = savedScripts.filter(s => s.id !== script.id); setSavedScripts(next); localStorage.setItem('teleprompter_history', JSON.stringify(next)); }} className="text-zinc-600 hover:text-red-400">🗑️</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={() => {/* import logic */}} />
        </div>
    );
};