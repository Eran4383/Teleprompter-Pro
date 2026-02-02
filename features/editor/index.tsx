import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useScriptActions } from '../../hooks/useScriptActions';
import { AppMode } from '../../types';
import { Button } from '../../components/ui/Button';
import { TabButton } from '../../components/ui/TabButton';
import { Toast } from '../../components/ui/Toast';
import { WriteTab } from './WriteTab/index';
import { TuneTab } from './TuneTab/TuneContainer';
import { HistoryTab } from './HistoryTab/HistoryContainer';

export const EditorFeature: React.FC = () => {
    const { 
        activeEditorTab, setActiveEditorTab, 
        setMode, segments, setRawText, 
        setCurrentScriptId, setSegments 
    } = useAppStore();
    
    const { syncTextToSegments, saveCurrentToHistory } = useScriptActions();

    const handleStartPrompt = () => {
        if (activeEditorTab === 'write') {
            syncTextToSegments();
        } else {
            saveCurrentToHistory(segments);
        }
        setMode(AppMode.PROMPTER);
    };

    const handleClear = () => {
        if (confirm("Clear all text?")) {
            setSegments([]);
            setRawText('');
            setCurrentScriptId(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 relative">
            <Toast />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800 gap-3">
                <div className="flex space-x-2">
                    <TabButton active={activeEditorTab === 'write'} onClick={() => setActiveEditorTab('write')}>Write</TabButton>
                    <TabButton active={activeEditorTab === 'tune'} onClick={() => { syncTextToSegments(); setActiveEditorTab('tune'); }}>Tune</TabButton>
                    <TabButton active={activeEditorTab === 'history'} onClick={() => setActiveEditorTab('history')}>History</TabButton>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={handleClear} size="sm" className="flex-1 sm:flex-none">Clear</Button>
                    <Button onClick={handleStartPrompt} className="flex-1 sm:flex-none" icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}>Start</Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                {activeEditorTab === 'write' && <WriteTab />}
                {activeEditorTab === 'tune' && <TuneTab />}
                {activeEditorTab === 'history' && <HistoryTab />}
            </div>
        </div>
    );
};