import React, { useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useScriptActions } from '../../../hooks/useScriptActions';
import { Button } from '../../../components/ui/Button';

export const ScriptTextArea: React.FC = () => {
    const { rawText, setRawText } = useAppStore();
    const { syncTextToSegments } = useScriptActions();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
                setRawText(rawText ? rawText + '\n' + text : text);
            }
        } catch (err) {
            console.error('Failed to read clipboard', err);
        }
    };

    const handleSync = () => {
        syncTextToSegments();
    };

    return (
        <div className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-end gap-2 px-1">
                <Button variant="ghost" size="sm" className="h-8 text-[10px]" onClick={handleSelectAll}>Select All</Button>
                <Button variant="ghost" size="sm" className="h-8 text-[10px]" onClick={handlePaste}>Paste</Button>
                <Button variant="primary" size="sm" className="h-8 text-[10px] px-4" onClick={handleSync}>Save & Sync</Button>
            </div>
            <textarea
                ref={textareaRef}
                className="flex-1 w-full bg-zinc-950 text-zinc-100 p-4 rounded-lg resize-none border border-zinc-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono text-base leading-relaxed overflow-y-auto select-text"
                placeholder="Type or paste your text here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                dir="auto"
            />
        </div>
    );
};