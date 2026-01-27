
import { useState, useEffect, useCallback } from 'react';
import { ScriptSegment, SavedScript } from '../types';
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

    const saveToHistory = (segmentsToSave: ScriptSegment[]) => {
        if (!segmentsToSave.length || (segmentsToSave.length === 1 && !segmentsToSave[0].text.trim())) return;
        const rawContent = segmentsToSave.map(s => s.text).join('\n');
        const firstLine = segmentsToSave.find(s => s.text.trim())?.text || "Untitled";
        const title = firstLine.split(' ').slice(0, 3).join(' ') + (firstLine.split(' ').length > 3 ? '...' : '');

        let updated = [...savedScripts];
        if (currentScriptId) {
            updated = updated.map(s => s.id === currentScriptId ? { ...s, segments: segmentsToSave, rawText: rawContent, date: new Date().toISOString() } : s);
        } else {
            const id = Date.now().toString();
            updated = [{ id, title, date: new Date().toISOString(), segments: segmentsToSave, rawText: rawContent }, ...updated];
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
            duration: segments[i]?.text === line ? segments[i].duration : Math.max(1000, line.split(' ').length * 500)
        }));
        onSegmentsChange(newSegments);
        saveToHistory(newSegments);
        return newSegments;
    };

    const handleAIOptimize = async () => {
        setIsProcessing(true);
        try {
            const opt = await optimizeScript(rawText);
            onSegmentsChange(opt);
            setRawText(opt.map(s => s.text).join('\n'));
            saveToHistory(opt);
            setActiveTab('tune');
        } catch (e) { setModalConfig({ isOpen: true, title: "AI Error", message: "Failed to optimize script.", type: 'danger' }); }
        finally { setIsProcessing(false); }
    };

    const handleAIGenerate = async () => {
        setIsProcessing(true);
        try {
            const gen = await generateScriptFromTopic(topicInput);
            onSegmentsChange(gen);
            setRawText(gen.map(s => s.text).join('\n'));
            saveToHistory(gen);
            setTopicInput('');
            setActiveTab('tune');
        } catch (e) { setModalConfig({ isOpen: true, title: "AI Error", message: "Failed to generate script.", type: 'danger' }); }
        finally { setIsProcessing(false); }
    };

    return {
        activeTab, setActiveTab, rawText, setRawText, isProcessing, topicInput, setTopicInput, toast, savedScripts,
        currentScriptId, setCurrentScriptId, modalConfig, setModalConfig, tempInput, setTempInput,
        showToast, syncSegments, handleAIOptimize, handleAIGenerate, onStartPrompt, saveToHistory, loadHistory, onSegmentsChange
    };
};
