import React, { useState, useRef, useEffect } from 'react';
import { ScriptSegment, SegmentWord } from '../types';
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
Please output a raw JSON Array (and nothing else).
Each object in the array represents a segment and must follow this structure:

[
  {
    "id": "unique_string_1",
    "text": "The full sentence or phrase for this line.",
    "duration": 3000,
    "words": [
      { "text": "The" },
      { "text": "full" },
      { "text": "sentence", "color": "text-yellow-400" },
      { "text": "or" },
      { "text": "phrase", "color": "text-red-500" }
    ]
  }
]

**Rules:**
1. "duration" is in milliseconds. Estimate approx 300ms per word + 500ms for pauses.
2. "words" is an array breaking down the "text".
3. You can add "color" to specific words to highlight them. Use Tailwind classes: 'text-yellow-400', 'text-red-500', 'text-green-400', 'text-cyan-400', 'text-purple-400'.
4. Ensure the JSON is valid.`;

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ segments, onSegmentsChange, onStartPrompt }) => {
    const [activeTab, setActiveTab] = useState<'write' | 'tune'>('write');
    const [rawText, setRawText] = useState(segments.map(s => s.text).join('\n'));
    const [isProcessing, setIsProcessing] = useState(false);
    const [topicInput, setTopicInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const tuneContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync raw text from Write tab to structured Segments
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
        return newSegments;
    };

    const handleSwitchToTune = () => {
        syncTextToSegments();
        setActiveTab('tune');
    };

    const handleSwitchToWrite = () => {
        setRawText(segments.map(s => s.text).join('\n'));
        setActiveTab('write');
    };

    const handleSave = () => {
        syncTextToSegments();
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
        }
        onStartPrompt();
    };

    // --- Import / Export / Prompt Logic ---

    const handleCopySystemPrompt = async () => {
        try {
            await navigator.clipboard.writeText(AI_SYSTEM_PROMPT);
            alert("System Prompt copied to clipboard!\n\nPaste this into Gemini/ChatGPT to generate a compatible JSON script.");
        } catch (err) {
            alert("Failed to copy prompt.");
        }
    };

    const handleExportJSON = () => {
        // We export the current segments. If user is in Write tab, we might want to sync first?
        // Let's assume export captures the *current state* of segments.
        // If the user typed in Write but didn't save, segments is outdated.
        // So we sync first if in write mode.
        let dataToExport = segments;
        if (activeTab === 'write') {
            dataToExport = syncTextToSegments();
        }

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `teleprompter_script_${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileObj = event.target.files && event.target.files[0];
        if (!fileObj) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (Array.isArray(json)) {
                    // Basic validation and hydration
                    const importedSegments: ScriptSegment[] = json.map((item: any, idx: number) => ({
                        id: item.id || `imported-${Date.now()}-${idx}`,
                        text: item.text || "",
                        duration: typeof item.duration === 'number' ? item.duration : 2000,
                        words: Array.isArray(item.words) ? item.words : (item.text || "").split(' ').map((w: string) => ({ text: w }))
                    }));
                    
                    onSegmentsChange(importedSegments);
                    setRawText(importedSegments.map(s => s.text).join('\n'));
                    alert(`Successfully imported ${importedSegments.length} segments.`);
                    // Switch to tune to see the result effectively
                    setActiveTab('tune');
                } else {
                    alert("Invalid JSON format: Expected an array.");
                }
            } catch (err) {
                console.error(err);
                alert("Failed to parse JSON file.");
            }
            // Reset input so same file can be selected again
            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsText(fileObj);
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
        } catch (e) {
            alert('Failed to optimize script. Please check your API key.');
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
        } catch (e) {
            alert('Failed to generate script.');
        } finally {
            setIsProcessing(false);
        }
    };

    const updateSegment = (id: string, updates: Partial<ScriptSegment>) => {
        onSegmentsChange(segments.map(s => {
            if (s.id !== id) return s;
            const updated = { ...s, ...updates };
            if (updates.text !== undefined && updates.text !== s.text) {
                updated.words = updates.text.split(' ').map(w => ({ text: w }));
            }
            return updated;
        }));
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
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
            {/* Main Tabs and Launch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800 gap-3">
                <div className="flex space-x-2">
                    <button 
                        onClick={handleSwitchToWrite}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'write' ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-500 hover:text-white'}`}
                        title="Edit raw text"
                    >
                        Write
                    </button>
                    <button 
                        onClick={handleSwitchToTune}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tune' ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-500 hover:text-white'}`}
                        title="Color words and adjust timing"
                    >
                        Tune (Color & Time)
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => { if(confirm('Clear all text?')) onSegmentsChange([]) }} size="sm" className="flex-1 sm:flex-none" title="Clear all script text">Clear</Button>
                    <Button onClick={handleStartWithSync} className="flex-1 sm:flex-none" icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>} title="Start Teleprompter">Start</Button>
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
                                            title="Enter a topic to generate a script"
                                        />
                                        <Button size="sm" className="h-9" onClick={handleAIGenerate} isLoading={isProcessing} disabled={!topicInput.trim()} title="Generate script from topic">Gen</Button>
                                    </div>
                                </div>

                                {/* File Operations */}
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="file" 
                                        accept=".json" 
                                        ref={fileInputRef} 
                                        style={{ display: 'none' }} 
                                        onChange={handleImportJSON} 
                                    />
                                    
                                    <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={handleCopySystemPrompt} title="Copy Prompt for Gemini/ChatGPT">
                                        <svg className="w-4 h-4 mr-1 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                        Copy AI Prompt
                                    </Button>

                                    <div className="w-px h-6 bg-zinc-800 mx-1"></div>

                                    <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => fileInputRef.current?.click()} title="Import JSON">
                                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        Import
                                    </Button>

                                    <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={handleExportJSON} title="Export JSON">
                                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Export
                                    </Button>
                                </div>
                            </div>

                            {/* Row 2: Basic Text Actions */}
                            <div className="flex items-center justify-end gap-2 px-1">
                                <Button variant="ghost" size="sm" className="h-8 text-[10px]" onClick={handleSelectAll} title="Select all text">Select All</Button>
                                <Button variant="ghost" size="sm" className="h-8 text-[10px]" onClick={handlePaste} title="Paste text from clipboard">Paste</Button>
                                <Button variant="primary" size="sm" className="h-8 text-[10px] px-4" onClick={handleSave} title="Save text changes">Save & Sync</Button>
                            </div>
                        </div>

                        <textarea
                            ref={textareaRef}
                            className="flex-1 w-full bg-zinc-950 text-zinc-100 p-4 rounded-lg resize-none border border-zinc-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono text-base leading-relaxed overflow-y-auto select-text"
                            placeholder="Type or paste your text here..."
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            dir="auto"
                            title="Editor Area: Type your script here"
                            onContextMenu={(e) => e.stopPropagation()} // Allow native context menu
                        />
                        <p className="text-[10px] text-zinc-500 text-center">Coloring is available in the "Tune" tab.</p>
                    </div>
                )}

                {activeTab === 'tune' && (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Color Toolbar */}
                        <div className="shrink-0 p-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-center gap-2">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold mr-2">Highlight Color:</span>
                            {COLOR_PALETTE.map((c, i) => (
                                <button
                                    key={i}
                                    onMouseDown={(e) => { e.preventDefault(); applyColorToSelection(c.class); }}
                                    className={`w-6 h-6 rounded-full border border-zinc-700 hover:scale-110 transition-transform ${c.bg} ${c.class === '' ? 'bg-zinc-800 text-zinc-400' : ''}`}
                                    title={`Apply ${c.label} color to selected text`}
                                >
                                    {c.class === '' && <span className="flex items-center justify-center text-[10px]">✕</span>}
                                </button>
                            ))}
                            <div className="w-px h-4 bg-zinc-800 mx-2"/>
                            <span className="text-[10px] text-zinc-600">Select text & click color</span>
                        </div>

                        <div ref={tuneContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar select-text" title="Tune Mode: Select text to color, or adjust slider for timing">
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
                                        <div className="flex items-center gap-3 flex-1" title="Adjust time duration for this segment">
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
                                        <button 
                                            onClick={() => splitSegment(segment)}
                                            className="p-2 text-zinc-500 hover:text-indigo-400 transition-colors"
                                            title="Split segment into two"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};