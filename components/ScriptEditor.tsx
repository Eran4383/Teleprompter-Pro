הנה הקוד המלא והמעודכן עבור `ScriptEditor.tsx`. הטמעתי בו את פונקציות ה-Import וה-Export וחיברתי אותן לכפתורים הקיימים, כולל הגדרה נכונה של ה-input כדי שתוכל לבחור את קבצי ה-JSON שלך.

```tsx
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

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const newText = segments.map(s => s.text).join('\n');
        if (activeTab !== 'write') {
             setRawText(newText);
        }
    }, [segments, activeTab]);

    const loadHistoryFromStorage = () => {
        const stored = localStorage.getItem('teleprompter_history');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) setSavedScripts(parsed);
            } catch (e) { console.error(e); }
        }
    };

    useEffect(() => { loadHistoryFromStorage(); }, []);

    const showToast = (msg: string, type: 'success'|'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // --- Import / Export Logic ---
    const handleExportJSON = () => {
        if (segments.length === 0) {
            showToast("Nothing to export", "error");
            return;
        }
        const dataStr = JSON.stringify(segments, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `teleprompter-script-${Date.now()}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        showToast("Exported JSON");
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (Array.isArray(json)) {
                    onSegmentsChange(json);
                    setRawText(json.map((s: ScriptSegment) => s.text).join('\n'));
                    showToast("Imported successfully");
                } else {
                    showToast("Invalid format", "error");
                }
            } catch (err) {
                showToast("Failed to parse file", "error");
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

    // --- Auto Save Logic ---
    const saveCurrentToHistory = (segmentsToSave: ScriptSegment[]) => {
        if (!segmentsToSave || segmentsToSave.length === 0 || (segmentsToSave.length === 1 && !segmentsToSave[0].text.trim())) return;

        const rawContent = segmentsToSave.map(s => s.text).join('\n');
        const firstLine = segmentsToSave.find(s => s.text.trim().length > 0)?.text || "Untitled Script";
        const generatedTitle = firstLine.split(' ').slice(0, 3).join(' ') + (firstLine.split(' ').length > 3 ? '...' : '');

        let updatedHistory = [...savedScripts];
        let newId = currentScriptId;

        if (currentScriptId) {
            updatedHistory = updatedHistory.map(s => s.id === currentScriptId ? {
                ...s,
                segments: segmentsToSave,
                rawText: rawContent,
                date: new Date().toISOString()
            } : s);
        } else {
            newId = Date.now().toString();
            const newScript: SavedScript = {
                id: newId,
                title: generatedTitle,
                date: new Date().toISOString(),
                segments: segmentsToSave,
                rawText: rawContent
            };
            updatedHistory = [newScript, ...updatedHistory];
            setCurrentScriptId(newId);
        }

        setSavedScripts(updatedHistory);
        localStorage.setItem('teleprompter_history', JSON.stringify(updatedHistory));
    };

    const syncTextToSegments = () => {
        const lines = rawText.split('\n').filter(line => line.trim() !== '');
        const newSegments: ScriptSegment[] = lines.map((line, index) => {
            const existing = segments[index];
            if (existing && existing.text === line) return existing;
            return {
                id: existing?.id || `seg-${Date.now()}-${index}`,
                text: line,
                words: line.split(' ').map(w => ({ text: w })),
                duration: Math.max(1000, line.split(' ').length * 500)
            };
        });
        onSegmentsChange(newSegments);
        saveCurrentToHistory(newSegments);
        return newSegments;
    };

    const handleSaveAndSync = () => {
        syncTextToSegments();
        showToast("Saved & Synced");
    };

    const handleSwitchToTune = () => {
        syncTextToSegments();
        setActiveTab('tune');
    };

    const handleSwitchToWrite = () => {
        setRawText(segments.map(s => s.text).join('\n'));
        setActiveTab('write');
    };

    const handleSwitchToHistory = () => {
        loadHistoryFromStorage();
        setActiveTab('history');
    };

    const handleSelectAll = () => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) setRawText(prev => prev ? prev + '\n' + text : text);
        } catch (err) { console.error(err); }
    };

    const handleStartWithSync = () => {
        if (activeTab === 'write') syncTextToSegments();
        else saveCurrentToHistory(segments);
        onStartPrompt();
    };

    const handleLoadFromHistory = (script: SavedScript) => {
        setModalConfig({
            isOpen: true,
            title: "Load Script?",
            message: `Load "${script.title}"?`,
            confirmText: "Load",
            onConfirm: () => {
                onSegmentsChange(script.segments);
                setRawText(script.rawText);
                setCurrentScriptId(script.id);
                setActiveTab('write');
                showToast("Loaded");
            }
        });
    };

    const handleDeleteFromHistory = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setModalConfig({
            isOpen: true,
            title: "Delete Script",
            message: "Permanently delete this script?",
            type: "danger",
            confirmText: "Delete",
            onConfirm: () => {
                const updated = savedScripts.filter(s => s.id !== id);
                setSavedScripts(updated);
                localStorage.setItem('teleprompter_history', JSON.stringify(updated));
                if (currentScriptId === id) setCurrentScriptId(null);
                showToast("Deleted");
            }
        });
    };

    const confirmRename = (id: string, newName: string) => {
        const updated = savedScripts.map(s => s.id === id ? { ...s, title: newName } : s);
        setSavedScripts(updated);
        localStorage.setItem('teleprompter_history', JSON.stringify(updated));
        showToast("Renamed");
    };

    const handleAIOptimize = async () => {
        if (!rawText.trim()) return;
        setIsProcessing(true);
        try {
            const optimized = await optimizeScript(rawText);
            onSegmentsChange(optimized);
            setRawText(optimized.map(s => s.text).join('\n'));
            setActiveTab('tune');
            saveCurrentToHistory(optimized);
        } catch (e) {
            setModalConfig({isOpen: true, title: "AI Error", message: "Failed to optimize script.", type: 'danger'});
        } finally { setIsProcessing(false); }
    };

    const handleAIGenerate = async () => {
        if (!topicInput.trim()) return;
        setIsProcessing(true);
        try {
            const generated = await generateScriptFromTopic(topicInput);
            onSegmentsChange(generated);
            setRawText(generated.map(s => s.text).join('\n'));
            setTopicInput('');
            setActiveTab('tune');
            saveCurrentToHistory(generated);
        } catch (e) {
            setModalConfig({isOpen: true, title: "AI Error", message: "Failed to generate script.", type: 'danger'});
        } finally { setIsProcessing(false); }
    };

    const updateSegment = (id: string, updates: Partial<ScriptSegment>) => {
        const newSegs = segments.map(s => {
            if (s.id !== id) return s;
            const updated = { ...s, ...updates };
            if (updates.text !== undefined && updates.text !== s.text) {
                updated.words = updates.text.split(' ').map(w => ({ text: w }));
            }
            return updated;
        });
        onSegmentsChange(newSegs);
    };

    const applyColorToSelection = (colorClass: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const newSegments = segments.map(seg => {
            const newWords = seg.words.map((word, wIdx) => {
                const el = document.querySelector(`[data-seg-id="${seg.id}"][data-word-idx="${wIdx}"]`);
                return (el && range.intersectsNode(el)) ? { ...word, color: colorClass } : word;
            });
            return { ...seg, words: newWords };
        });
        onSegmentsChange(newSegments);
        saveCurrentToHistory(newSegments);
    };

    const splitSegment = (segment: ScriptSegment) => {
        const words = segment.words;
        if (words.length <= 1) return;
        const mid = Math.ceil(words.length / 2);
        const firstWords = words.slice(0, mid);
        const secondWords = words.slice(mid);
        const durationSplit = Math.floor(segment.duration / 2);
        const newSeg1 = { ...segment, text: firstWords.map(w => w.text).join(' '), words: firstWords, duration: durationSplit };
        const newSeg2 = { id: `seg-${Date.now()}-split`, text: secondWords.map(w => w.text).join(' '), words: secondWords, duration: durationSplit };
        const index = segments.findIndex(s => s.id === segment.id);
        const newSegments = [...segments];
        newSegments.splice(index, 1, newSeg1, newSeg2);
        onSegmentsChange(newSegments);
        saveCurrentToHistory(newSegments);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 relative">
            <Modal 
                isOpen={modalConfig.isOpen} 
                title={modalConfig.title} 
                message={modalConfig.message}
                confirmText={modalConfig.confirmText}
                type={modalConfig.type}
                isInput={modalConfig.isInput}
                inputValue={tempInput}
                onInputChange={setTempInput}
                onClose={() => setModalConfig({...modalConfig, isOpen: false})}
                onConfirm={() => {
                    if (modalConfig.isInput && modalConfig.editingId) confirmRename(modalConfig.editingId, tempInput);
                    else if (modalConfig.onConfirm) modalConfig.onConfirm();
                }}
            />

            {toast && (
                <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full border backdrop-blur-md animate-fade-in-down ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    <span className="text-xs font-medium">{toast.msg}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800 gap-3">
                <div className="flex space-x-2">
                    {['write', 'tune', 'history'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => tab === 'write' ? handleSwitchToWrite() : tab === 'tune' ? handleSwitchToTune() : handleSwitchToHistory()}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setModalConfig({ isOpen: true, title: "Clear Script", message: "Clear all text?", type: "danger", confirmText: "Clear", onConfirm: () => { onSegmentsChange([]); setRawText(''); setCurrentScriptId(null); } })} size="sm">Clear</Button>
                    <Button onClick={handleStartWithSync} icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}>Start</Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                {activeTab === 'write' && (
                    <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
                        <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col lg:flex-row gap-2">
                            <div className="flex items-center gap-2 flex-1 lg:border-r border-zinc-800 pr-2">
                                <Button variant="secondary" size="sm" onClick={handleAIOptimize} isLoading={isProcessing} className="h-9">AI Timing</Button>
                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <input type="text" placeholder="Topic..." className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-md px-3 h-9 text-xs text-white" value={topicInput} onChange={(e) => setTopicInput(e.target.value)} dir="auto" />
                                    <Button size="sm" className="h-9" onClick={handleAIGenerate} isLoading={isProcessing} disabled={!topicInput.trim()}>Gen</Button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="file" accept="application/json" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportJSON} />
                                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>Import</Button>
                                <Button variant="ghost" size="sm" onClick={handleExportJSON}>Export</Button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-1">
                            <Button variant="ghost" size="sm" onClick={handleSelectAll}>Select All</Button>
                            <Button variant="ghost" size="sm" onClick={handlePaste}>Paste</Button>
                            <Button variant="primary" size="sm" onClick={handleSaveAndSync}>Save & Sync</Button>
                        </div>
                        <textarea
                            ref={textareaRef}
                            className="flex-1 w-full bg-zinc-950 text-zinc-100 p-4 rounded-lg resize-none border border-zinc-800 font-mono text-base"
                            placeholder="Type or paste your text here..."
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            dir="auto"
                        />
                    </div>
                )}

                {activeTab === 'tune' && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="p-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-center gap-2">
                            {COLOR_PALETTE.map((c, i) => (
                                <button key={i} onMouseDown={(e) => { e.preventDefault(); applyColorToSelection(c.class); }} className={`w-6 h-6 rounded-full border border-zinc-700 ${c.bg} flex items-center justify-center`}>
                                    {c.class === '' && <span className="text-[10px]">✕</span>}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar select-text">
                            {segments.map((segment) => (
                                <div key={segment.id} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                                    <div className="mb-3 flex flex-wrap gap-1.5 leading-relaxed" dir="auto">
                                        {segment.words.map((word, wIdx) => (
                                            <span key={wIdx} data-seg-id={segment.id} data-word-idx={wIdx} className={`text-lg font-medium ${word.color || 'text-zinc-200'}`}>{word.text}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-900">
                                        <div className="flex items-center gap-3 flex-1">
                                            <input type="range" min="100" max="15000" step="100" value={segment.duration} onChange={(e) => updateSegment(segment.id, { duration: parseInt(e.target.value) })} className="flex-1 accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                                            <span className="text-xs font-mono text-zinc-500">{(segment.duration / 1000).toFixed(1)}s</span>
                                        </div>
                                        <button onClick={() => splitSegment(segment)} className="p-2 text-zinc-500 hover:text-indigo-400">✂️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                        {savedScripts.length === 0 ? <p className="text-center text-zinc-600 mt-10">No saved scripts.</p> : 
                            savedScripts.map((script) => (
                                <div key={script.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between">
                                    <div className="flex-1 cursor-pointer" onClick={() => handleLoadFromHistory(script)}>
                                        <h3 className="font-medium text-zinc-200">{script.title}</h3>
                                        <p className="text-[10px] text-zinc-500">{new Date(script.date).toLocaleDateString()} • {script.segments.length} lines</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleLoadFromHistory(script)} className="text-indigo-400 text-xs font-bold">Load</button>
                                        <button onClick={(e) => handleDeleteFromHistory(script.id, e)} className="text-zinc-600 hover:text-red-400 text-xs">Delete</button>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>
        </div>
    );
};

```
