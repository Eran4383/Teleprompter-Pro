import React, { useState } from 'react';
import { useScriptActions } from '../../../hooks/useScriptActions';
import { Button } from '../../../components/ui/Button';

export const AIToolbar: React.FC = () => {
    const [topicInput, setTopicInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const { handleAIOptimize, handleAIGenerate } = useScriptActions();

    const onOptimize = async () => {
        setIsProcessing(true);
        await handleAIOptimize();
        setIsProcessing(false);
    };

    const onGenerate = async () => {
        if (!topicInput.trim()) return;
        setIsProcessing(true);
        await handleAIGenerate(topicInput);
        setTopicInput('');
        setIsProcessing(false);
    };

    return (
        <div className="flex items-center gap-2 flex-1 border-r border-zinc-800 pr-2">
            <Button 
                variant="secondary" 
                size="sm" 
                onClick={onOptimize}
                isLoading={isProcessing}
                className="whitespace-nowrap h-9"
                icon={<svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
                title="AI Timing"
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
                />
                <Button size="sm" className="h-9" onClick={onGenerate} isLoading={isProcessing} disabled={!topicInput.trim()}>Gen</Button>
            </div>
        </div>
    );
};