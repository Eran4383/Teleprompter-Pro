
import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ScriptSegment, SavedScript } from '../types';
import { optimizeScript, generateScriptFromTopic } from '../services/geminiService';

export const useScriptActions = () => {
    const {
        segments, setSegments,
        rawText, setRawText,
        currentScriptId, setCurrentScriptId,
        savedScripts, setSavedScripts,
        setToast,
        setActiveEditorTab
    } = useAppStore();

    const saveCurrentToHistory = useCallback((segmentsToSave: ScriptSegment[]) => {
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
    }, [currentScriptId, savedScripts, setCurrentScriptId, setSavedScripts]);

    const syncTextToSegments = useCallback(() => {
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
        
        setSegments(newSegments);
        saveCurrentToHistory(newSegments);
        return newSegments;
    }, [rawText, segments, setSegments, saveCurrentToHistory]);

    const handleAIOptimize = useCallback(async () => {
        if (!rawText.trim()) return;
        try {
            const optimized = await optimizeScript(rawText);
            setSegments(optimized);
            setRawText(optimized.map(s => s.text).join('\n'));
            setActiveEditorTab('tune');
            saveCurrentToHistory(optimized);
        } catch (e) {
            setToast({ msg: "AI Optimization failed", type: "error" });
        }
    }, [rawText, setSegments, setRawText, setActiveEditorTab, saveCurrentToHistory, setToast]);

    const handleAIGenerate = useCallback(async (topicInput: string) => {
        if (!topicInput.trim()) return;
        try {
            const generated = await generateScriptFromTopic(topicInput);
            setSegments(generated);
            setRawText(generated.map(s => s.text).join('\n'));
            setActiveEditorTab('tune');
            saveCurrentToHistory(generated);
        } catch (e) {
            setToast({ msg: "AI Generation failed", type: "error" });
        }
    }, [setSegments, setRawText, setActiveEditorTab, saveCurrentToHistory, setToast]);

    return {
        saveCurrentToHistory,
        syncTextToSegments,
        handleAIOptimize,
        handleAIGenerate
    };
};
