import React from 'react';
import { ScriptTextArea } from './ScriptTextArea';
import { AIToolbar } from './AIToolbar';
import { FileActions } from './FileActions';

export const WriteTab: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col p-3 sm:p-4 gap-3 min-h-0">
            <div className="flex flex-col gap-2 shrink-0">
                <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col lg:flex-row gap-2">
                    <AIToolbar />
                    <FileActions />
                </div>
            </div>

            <ScriptTextArea />
            <p className="text-[10px] text-zinc-500 text-center">Changes are auto-saved to History when synced.</p>
        </div>
    );
};