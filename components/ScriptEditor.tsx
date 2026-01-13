import React, { useState, useRef, useEffect } from 'react';
import { ScriptSegment, SavedScript } from '../types';
import { Button } from './Button';
import { generateScriptFromTopic, optimizeScript } from '../services/geminiService';

interface ScriptEditorProps {
    segments: ScriptSegment[];
    onSegmentsChange: (segments: ScriptSegment[]) => void;
    onStartPrompt: () => void;
}

// Color definitions with label for tooltip
const COLOR_PALETTE = [
    { class: '', label: 'White', bg: 'bg-zinc-200' },
    { class: 'text-yellow-400', label: 'Yellow', bg: 'bg-yellow-400' },
    { class: 'text-red-500', label: 'Red', bg: 'bg-red-500' },
    { class: 'text-green-400', label: 'Green', bg: 'bg-green-400' },
    { class: 'text-cyan-400', label: 'Cyan', bg: 'bg-cyan-400' },
    { class: 'text-purple-400', label: 'Purple', bg: 'bg-purple-400' },
];

const AI_SYSTEM_PROMPT = `You are a script generator for a Teleprompter App.
Please output a raw JSON Array (and nothing else).`;

// --- Custom Modal Component ---
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

    // Modal State
    const [modalConfig, setModalConfig] = useState<any>({ isOpen: false });
    const [tempInput, setTempInput] = useState('');

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const tuneContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync raw text when segments change externally
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

    // --- Auto Save Logic ---
    const saveCurrentToHistory = (segmentsToSave: ScriptSegment[]) => {
        if (!segmentsToSave || segmentsToSave.length === 0 || (segmentsToSave.length === 1 && !segmentsToSave[0].text.trim())) return;

        const rawContent = segmentsToSave.map(s => s.text).join('\n');
        
        // Generate Title: First 3 words
        const firstLine = segmentsToSave.find(s => s.text.trim().length > 0)?.text || "Untitled Script";
        const generatedTitle = firstLine.split(' ').slice(0, 3).join(' ') + (firstLine.split(' ').length > 3 ? '...' : '');

        let updatedHistory = [...savedScripts];
        let newId = currentScriptId;

        if (currentScriptId) {
            // Update existing
            updatedHistory = updatedHistory.map(s => s.id === currentScriptId ? {
                ...s,
                segments: segmentsToSave,
                rawText: rawContent,
                date: new Date().toISOString()
            } : s);
        } else {
            // Create New
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
        // We don't toast on auto-save to avoid annoyance, unless it's explicitly requested? 
        // Let's just do it silently for smooth UX.
    };

    const syncTextToSegments = () => {
        const lines = rawText.split('\n').filter(line => line.trim() !== '');
        const newSegments: ScriptSegment[] = lines.map((line, index) => {
            const existing = segments[index];
            if (existing && existing.text === line) {
                return existing;
            }
            return {
                id: existing?.id || `seg-${Date.now()}-${index}`,
                text: line,
                words: line.split(' ').map(w => ({ text: w })),
                duration: Math.max(1000, line.split(' ').length * 500)
            };
        });
        
        onSegmentsChange(newSegments);
        saveCurrentToHistory(newSegments); // Auto-Save trigger
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
            if (text) {
                setRawText(prev => prev ? prev + '\n' + text : text);
            }
        } catch (err) {
            console.error('Failed to read clipboard', err);
        }
    };

    const handleStartWithSync = () => {
        if (activeTab === 'write') {
            syncTextToSegments();
        } else {
            // Even if in Tune mode, let's ensure latest state is saved
            saveCurrentToHistory(segments);
        }
        onStartPrompt();
    };

    // --- History Actions ---

    const handleLoadFromHistory = (script: SavedScript) => {
        setModalConfig({
            isOpen: true,
            title: "Load Script?",
            message: `Load "${script.title}"? Unsaved changes to the current script will be overwritten.`,
            confirmText: "Load",
            onConfirm: () => {
                onSegmentsChange(script.segments);
                setRawText(script.rawText);
                setCurrentScriptId(script.id);
                setActiveTab('write');
                showToast("Script loaded.");
            }
        });
    };

    const handleDeleteFromHistory = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setModalConfig({
            isOpen: true,
            title: "Delete Script",
            message: "Are you sure you want to permanently delete this script from the archive?",
            type: "danger",
            confirmText: "Delete",
            onConfirm: () => {
                const updated = savedScripts.filter(s => s.id !== id);
                setSavedScripts(updated);
                localStorage.setItem('teleprompter_history', JSON.stringify(updated));
                if (currentScriptId === id) setCurrentScriptId(null);
                showToast("Script deleted.");
            }
        });
    };

    const handleRenameScript = (id: string, currentTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTempInput(currentTitle);
        setModalConfig({
            isOpen: true,
            title: "Rename Script",
            isInput: true,
            confirmText: "Save Name",
            type: "input",
            onConfirm: () => {
                // Logic is handled inside the modal callback but we need access to the latest tempInput
                // Since closure captures stale state, we use a ref or pass the value differently.
                // React State pattern: Trigger update
            } 
        });
        
        // Slightly hacky: redefine onConfirm to close over the *future* state? 
        // Better: Use a dedicated useEffect or handle confirm logic separately.
        // Simplified approach for this codebase:
    };
    
    // Improved Rename Logic
    const confirmRename = (id: string, newName: string) => {
        const updated = savedScripts.map(s => s.id === id ? { ...s, title: newName } : s);
        setSavedScripts(updated);
        localStorage.setItem('teleprompter_history', JSON.stringify(updated));
        showToast("Script renamed.");
    };


    // --- AI Logic ---

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
            setModalConfig({isOpen: true, title: "AI Error", message: "Failed to optimize script.", type: 'danger', onClose: () => setModalConfig({...modalConfig, isOpen: false})});
        } finally {
            setIsProcessing(false);
        }
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
            setModalConfig({isOpen: true, title: "AI Error", message: "Failed to generate script.", type: 'danger', onClose: () => setModalConfig({...modalConfig, isOpen: false})});
        } finally {
            setIsProcessing(false);
        }
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
        // We defer auto-save on slider drag to avoid IO thrashing, 
        // or we could debounce it. For now, rely on explicit sync or tab switch.
    };

    const applyColorToSelection = (colorClass: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        
        const newSegments = segments.map(seg => {
            const newWords = seg.words.map((word, wIdx) => {
                const el = document.querySelector(`[data-seg-id="${seg.id}"][data-word-idx="${wIdx}"]`);
                if (el && range.intersectsNode(el)) {
                    return { ...word, color: colorClass };
                }
                return word;
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
                    if (modalConfig.isInput && modalConfig.editingId) {
                        confirmRename(modalConfig.editingId, tempInput);
                    } else if (modalConfig.onConfirm) {
                        modalConfig.onConfirm();
                    }
                }}
            />

            {/* Toast Notification */}
            {toast && (
                <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-xl border backdrop-blur-md transition-all animate-fade-in-down ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    <span className="text-xs font-medium flex items-center gap-2">
                        {toast.type === 'success' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                        {toast.msg}
                    </span>
                </div>
            )}

            {/* Main Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800 gap-3">
                <div className="flex space-x-2">
                    <button 
                        onClick={handleSwitchToWrite}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'write' ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Write
                    </button>
                    <button 
                        onClick={handleSwitchToTune}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tune' ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Tune
                    </button>
                    <button 
                        onClick={handleSwitchToHistory}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-500 hover:text-white'}`}
                    >
                        History
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => { 
                        setModalConfig({
                            isOpen: true, 
                            title: "Clear Script", 
                            message: "Clear all text?", 
                            type: "danger", 
                            confirmText: "Clear",
                            onConfirm: () => {
                                onSegmentsChange([]);
                                setRawText('');
                                setCurrentScriptId(null);
                            }
                        })
                    }} size="sm" className="flex-1 sm:flex-none">Clear</Button>
                    <Button onClick={handleStartWithSync} className="flex-1 sm:flex-none" icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}>Start</Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                {activeTab === 'write' && (
                    <div className="flex-1 flex flex-col p-3 sm:p-4 gap-3 min-h-0">
                        {/* File & Actions Bar */}
                        <div className="flex flex-col gap-2 shrink-0">
                            
                            {/* Row 1: AI & Import/Export */}
                            <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col lg:flex-row gap-2">
                                {/* AI Section */}
                                <div className="flex items-center gap-2 flex-1 border-r border-zinc-800 pr-2">
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        onClick={handleAIOptimize}
                                        isLoading={isProcessing}
                                        className="whitespace-nowrap h-9"
                                        icon={<svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
                                        title="Automatically set timing and segments using AI"
                                    >
                                        AI Timing
                                    </Button>
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <input 
                                            type="text" 
                                            placeholder="Topic..."
                                            className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 h-9 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            value={topicInput}
                                            onChange={(e) => setTopicInput(e.target.value)}
                                            dir="auto"
                                        />
                                        <Button size="sm" className="h-9" onClick={handleAIGenerate} isLoading={isProcessing} disabled={!topicInput.trim()}>Gen</Button>
                                    </div>
                                </div>

                                {/* File Operations */}
                                <div className="flex items-center gap-2">
                                    <input type="file" accept=".json" ref={fileInputRef} style={{ display: 'none' }} onChange={() => { /* ... */ }} />
                                    <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => fileInputRef.current?.click()} title="Import JSON">Import</Button>
                                    <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { /* ... */ }} title="Export JSON">Export</Button>
                                </div>
                            </div>

                            {/* Row 2: Basic Text Actions */}
                            <div className="flex items-center justify-end gap-2 px-1">
                                <Button variant="ghost" size="sm" className="h-8 text-[10px]" onClick={handleSelectAll}>Select All</Button>
                                <Button variant="ghost" size="sm" className="h-8 text-[10px]" onClick={handlePaste}>Paste</Button>
                                <Button variant="primary" size="sm" className="h-8 text-[10px] px-4" onClick={handleSaveAndSync} title="Updates current script in History">Save & Sync</Button>
                            </div>
                        </div>

                        <textarea
                            ref={textareaRef}
                            className="flex-1 w-full bg-zinc-950 text-zinc-100 p-4 rounded-lg resize-none border border-zinc-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono text-base leading-relaxed overflow-y-auto select-text"
                            placeholder="Type or paste your text here..."
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            dir="auto"
                            onContextMenu={(e) => e.stopPropagation()}
                        />
                        <p className="text-[10px] text-zinc-500 text-center">Changes are auto-saved to History when synced.</p>
                    </div>
                )}

                {activeTab === 'tune' && (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Color Toolbar */}
                        <div className="shrink-0 p-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-center gap-2">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold mr-2">Highlight:</span>
                            {COLOR_PALETTE.map((c, i) => (
                                <button
                                    key={i}
                                    onMouseDown={(e) => { e.preventDefault(); applyColorToSelection(c.class); }}
                                    className={`w-6 h-6 rounded-full border border-zinc-700 hover:scale-110 transition-transform ${c.bg} ${c.class === '' ? 'bg-zinc-800 text-zinc-400' : ''}`}
                                >
                                    {c.class === '' && <span className="flex items-center justify-center text-[10px]">✕</span>}
                                </button>
                            ))}
                        </div>

                        <div ref={tuneContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar select-text">
                            {segments.map((segment) => (
                                <div key={segment.id} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 group transition-all hover:border-zinc-600">
                                    <div className="mb-3">
                                        <div className="flex flex-wrap gap-1.5 leading-relaxed" dir="auto">
                                            {segment.words.map((word, wIdx) => (
                                                <span
                                                    key={wIdx}
                                                    data-seg-id={segment.id}
                                                    data-word-idx={wIdx}
                                                    className={`px-1 py-0.5 rounded text-lg font-medium cursor-text selection:bg-indigo-500/50 ${word.color || 'text-zinc-200'}`}
                                                >
                                                    {word.text}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-900 select-none">
                                        <div className="flex items-center gap-3 flex-1">
                                             <input 
                                                type="range"
                                                min="100"
                                                max="15000"
                                                step="100"
                                                value={segment.duration}
                                                onChange={(e) => updateSegment(segment.id, { duration: parseInt(e.target.value) })}
                                                className="flex-1 accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <span className="text-xs font-mono text-zinc-500 whitespace-nowrap">{(segment.duration / 1000).toFixed(1)}s</span>
                                        </div>
                                        <button onClick={() => splitSegment(segment)} className="p-2 text-zinc-500 hover:text-indigo-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="flex flex-col h-full overflow-hidden p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Saved Scripts Archive</h2>
                            <button onClick={loadHistoryFromStorage} className="text-xs text-zinc-500 hover:text-white">Refresh</button>
                        </div>
                        {savedScripts.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                                <p>No saved scripts.</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                                {savedScripts.map((script) => (
                                    <div key={script.id} className={`bg-zinc-950 border rounded-lg p-3 hover:border-zinc-600 transition-colors flex items-center justify-between group ${currentScriptId === script.id ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800'}`}>
                                        <div className="flex-1 min-w-0 mr-4 cursor-pointer" onClick={() => handleLoadFromHistory(script)}>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{script.title}</h3>
                                                {currentScriptId === script.id && <span className="text-[9px] uppercase bg-indigo-600 px-1.5 rounded text-white font-bold tracking-wider">Active</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{new Date(script.date).toLocaleDateString()}</span>
                                                <span className="text-[10px] text-zinc-600">{script.segments.length} lines</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={(e) => {
                                                    setTempInput(script.title);
                                                    setModalConfig({
                                                        isOpen: true, title: "Rename Script", isInput: true, confirmText: "Save", editingId: script.id
                                                    });
                                                }}
                                                className="p-2 text-zinc-600 hover:text-zinc-300 rounded-lg transition-colors"
                                                title="Rename"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => handleLoadFromHistory(script)}
                                                className="p-2 text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                title="Load"
                                            >
                                                Load
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteFromHistory(script.id, e)}
                                                className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};