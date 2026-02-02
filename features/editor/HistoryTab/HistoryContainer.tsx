import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { HistoryItem } from './HistoryItem';

export const HistoryTab: React.FC = () => {
    const { savedScripts } = useAppStore();

    return (
        <div className="flex flex-col h-full overflow-hidden p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Saved Scripts Archive</h2>
                <span className="text-xs text-zinc-600">{savedScripts.length} items</span>
            </div>
            {savedScripts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                    <p>No saved scripts.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                    {savedScripts.map((script) => (
                        <HistoryItem key={script.id} script={script} />
                    ))}
                </div>
            )}
        </div>
    );
};