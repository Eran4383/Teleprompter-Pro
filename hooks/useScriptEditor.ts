import { useState, useEffect, useCallback } from 'react';
import { ScriptSegment, SavedScript, TextAlign } from '../types';
import { generateScriptFromTopic, optimizeScript } from '../services/geminiService';

export const useScriptEditor = (
    segments: ScriptSegment[], 
    onSegmentsChange: (segments: ScriptSegment[]) => void,
    onStartPrompt: () => void
) => {
    const [activeTab, setActiveTab] = useState<'write' | 'tune' | 'history'>('write');
    const [rawText, setRawText] = useState(segments.map(s => s.text).join('\n'));
    const [isProcessing, setIsProcessing] = useState(false);
    const [topicInput, setTopicInput] = useState('');
    const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
    const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
    const [currentScriptId, setCurrentScriptId] = useState<string | null>(null);
    const [modalConfig, setModalConfig] = useState<any>({ isOpen: false });
    const [tempInput, setTempInput] = useState('');
    const [textAlign, setTextAlign] = useState<TextAlign>('center');

    const showToast = (msg: string, type: 'success'|'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadHistory = useCallback(() => {
        const stored = localStorage.getItem('teleprompter_history');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) setSavedScripts(parsed);
            } catch (e) { console.error(e); }
        }
    }, []);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    // Update segments when alignment changes manually
    const updateAlignment = (align: TextAlign) => {
        setTextAlign(align);
        const updated = segments.map(s => ({ ...s, textAlign: align }));
        onSegmentsChange(updated);
    };

    const saveToHistory = (segmentsToSave: ScriptSegment[]) => {
        if (!segmentsToSave.length || (segmentsToSave.length === 1 && !segmentsToSave[0].text.trim())) return;
        const rawContent = segmentsToSave.map(s => s.text).join('\n');
        const firstLine = segmentsToSave.find(s => s.text.trim())?.text || "Untitled";
        const title = firstLine.split(' ').slice(0, 3).join(' ') + (firstLine.split(' ').length > 3 ? '...' : '');

        let updated = [...savedScripts];
        if (currentScriptId) {
            updated = updated.map(s => s.id === currentScriptId ? { ...s, segments: segmentsToSave, rawText: rawContent, date: new Date().toISOString(), textAlign } : s);
        } else {
            const id = Date.now().toString();
            updated = [{ id, title, date: new Date().toISOString(), segments: segmentsToSave, rawText: rawContent, textAlign }, ...updated];
            setCurrentScriptId(id);
        }
        setSavedScripts(updated);
        localStorage.setItem('teleprompter_history', JSON.stringify(updated));
    };

    const syncSegments = () => {
        const newSegments = rawText.split('\n').filter(l => l.trim()).map((line, i) => ({
            id: segments[i]?.text === line ? segments[i].id : `seg-${Date.now()}-${i}`,
            text: line,
            words: line.split(' ').map(w => ({ text: w })),
            duration: segments[i]?.text === line ? segments[i].duration : Math.max(1000, line.split(' ').length * 500),
            textAlign: textAlign
        }));
        onSegmentsChange(newSegments);
        saveToHistory(newSegments);
        return newSegments;
    };

    const handleAIOptimize = async () => {
        setIsProcessing(true);
        try {
            const opt = await optimizeScript(rawText);
            const optWithAlign = opt.map(s => ({ ...s, textAlign }));
            onSegmentsChange(optWithAlign);
            setRawText(opt.map(s => s.text).join('\n'));
            saveToHistory(optWithAlign);
            setActiveTab('tune');
        } catch (e) { setModalConfig({ isOpen: true, title: "AI Error", message: "Failed to optimize script.", type: 'danger' }); }
        finally { setIsProcessing(false); }
    };

    const handleAIGenerate = async () => {
        setIsProcessing(true);
        try {
            const gen = await generateScriptFromTopic(topicInput);
            const genWithAlign = gen.map(s => ({ ...s, textAlign }));
            onSegmentsChange(genWithAlign);
            setRawText(gen.map(s => s.text).join('\n'));
            saveToHistory(genWithAlign);
            setTopicInput('');
            setActiveTab('tune');
        } catch (e) { setModalConfig({ isOpen: true, title: "AI Error", message: "Failed to generate script.", type: 'danger' }); }
        finally { setIsProcessing(false); }
    };

    const selectFromHistory = (s: SavedScript) => {
        onSegmentsChange(s.segments);
        setRawText(s.rawText);
        setCurrentScriptId(s.id);
        if (s.textAlign) setTextAlign(s.textAlign);
        setActiveTab('write');
    };

    return {
        activeTab, setActiveTab, rawText, setRawText, isProcessing, topicInput, setTopicInput, toast, savedScripts,
        currentScriptId, setCurrentScriptId, modalConfig, setModalConfig, tempInput, setTempInput, textAlign,
        updateAlignment, selectFromHistory, showToast, syncSegments, handleAIOptimize, handleAIGenerate, onStartPrompt, saveToHistory, loadHistory, onSegmentsChange
    };
};