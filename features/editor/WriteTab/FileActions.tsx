import React, { useRef, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { SavedScript } from '../../../types';

export const FileActions: React.FC = () => {
    const { setSavedScripts, savedScripts, setToast, setActiveEditorTab } = useAppStore();
    const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
    const [pasteValue, setPasteValue] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                processImport(data);
            } catch (err) {
                setToast({ msg: "Invalid JSON file", type: "error" });
            }
        };
        reader.readAsText(file);
    };

    const processImport = (data: any) => {
        if (Array.isArray(data)) {
            setSavedScripts(data);
            setToast({ msg: "History imported", type: "success" });
            setActiveEditorTab('history');
        } else if (data && typeof data === 'object' && data.segments) {
            const updated = [data as SavedScript, ...savedScripts];
            setSavedScripts(updated);
            setToast({ msg: "Script imported", type: "success" });
            setActiveEditorTab('history');
        } else {
            setToast({ msg: "Unsupported format", type: "error" });
        }
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(savedScripts, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `teleprompter-history-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const confirmPasteImport = () => {
        try {
            const data = JSON.parse(pasteValue);
            processImport(data);
            setIsPasteModalOpen(false);
            setPasteValue('');
        } catch (e) {
            setToast({ msg: "Invalid JSON data", type: "error" });
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
            />
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => fileInputRef.current?.click()}>Import</Button>
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setIsPasteModalOpen(true)}>Paste Data</Button>
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={handleExport}>Export</Button>

            <Modal 
                isOpen={isPasteModalOpen}
                title="Import from Text"
                message="Paste your exported history or script JSON below:"
                isInput
                isTextArea
                inputValue={pasteValue}
                onInputChange={setPasteValue}
                confirmText="Import"
                onConfirm={confirmPasteImport}
                onClose={() => setIsPasteModalOpen(false)}
            />
        </div>
    );
};