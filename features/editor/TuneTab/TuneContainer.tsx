import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { SegmentRow } from './SegmentRow';
import { HighlightToolbar } from './HighlightToolbar';

export const TuneTab: React.FC = () => {
    const { segments } = useAppStore();

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="shrink-0 p-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-center gap-2">
                <HighlightToolbar />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar select-text">
                {segments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                        <p>No segments to tune. Add text in the Write tab first.</p>
                    </div>
                ) : (
                    segments.map((segment) => (
                        <SegmentRow key={segment.id} segment={segment} />
                    ))
                )}
            </div>
        </div>
    );
};