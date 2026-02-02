import React, { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { SavedScript } from '../../../types';
import { Modal } from '../../../components/ui/Modal';

interface HistoryItemProps {
    script: SavedScript;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ script }) => {
    const { 
        currentScriptId, setCurrentScriptId, 
        savedScripts, setSavedScripts, 
        setSegments, setRawText, 
        setActiveEditorTab, setToast 
    } = useAppStore();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [newName, setNewName] = useState(script.title);

    const handleLoad = () => {
        setSegments(script.segments);
        setRawText(script.rawText);
        setCurrentScriptId(script.id);
        setActiveEditorTab('write');
        setToast({ msg: "Script loaded", type: "success" });
    };

    const handleDelete = () => {
        const updated = savedScripts.filter(s => s.id !== script.id);
        setSavedScripts(updated);
        if (currentScriptId === script.id) setCurrentScriptId(null);
        setToast({ msg: "Script deleted", type: "success" });
    };

    const handleRename = () => {
        if (!newName.trim()) return;
        const updated = savedScripts.map(s => s.id === script.id ? { ...s, title: newName } : s);
        setSavedScripts(updated);
        setToast({ msg: "Script renamed", type: "success" });
    };

    const isActive = currentScriptId === script.id;

    return (
        <div className={`bg-zinc-950 border rounded-lg p-3 hover:border-zinc-600 transition-colors flex items-center justify-between group ${isActive ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800'}`}>
            <div className="flex-1 min-w-0 mr-4 cursor-pointer" onClick={handleLoad}>
                <div className="flex items-center gap-2">
                    <h3 className="font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{script.title}</h3>
                    {isActive && <span className="text-[9px] uppercase bg-indigo-600 px-1.5 rounded text-white font-bold tracking-wider">Active</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{new Date(script.date).toLocaleDateString()}</span>
                    <span className="text-[10px] text-zinc-600">{script.segments.length} lines</span>
                </div>
            </div>
            
            <div className="flex items-center gap-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsRenameModalOpen(true); }}
                    className="p-2 text-zinc-600 hover:text-zinc-300 rounded-lg transition-colors"
                    title="Rename"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button 
                    onClick={handleLoad}
                    className="p-2 text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors text-xs font-medium"
                >
                    Load
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }}
                    className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>

            <Modal 
                isOpen={isRenameModalOpen}
                title="Rename Script"
                isInput
                inputValue={newName}
                onInputChange={setNewName}
                onConfirm={handleRename}
                onClose={() => setIsRenameModalOpen(false)}
            />

            <Modal 
                isOpen={isDeleteModalOpen}
                title="Delete Script"
                message="Are you sure you want to permanently delete this script?"
                type="danger"
                confirmText="Delete"
                onConfirm={handleDelete}
                onClose={() => setIsDeleteModalOpen(false)}
            />
        </div>
    );
};