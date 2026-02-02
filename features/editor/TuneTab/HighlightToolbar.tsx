import React from 'react';
import { useAppStore } from '../../../store/useAppStore';

const COLOR_PALETTE = [
    { class: '', label: 'White', bg: 'bg-zinc-200' },
    { class: 'text-yellow-400', label: 'Yellow', bg: 'bg-yellow-400' },
    { class: 'text-red-500', label: 'Red', bg: 'bg-red-500' },
    { class: 'text-green-400', label: 'Green', bg: 'bg-green-400' },
    { class: 'text-cyan-400', label: 'Cyan', bg: 'bg-cyan-400' },
    { class: 'text-purple-400', label: 'Purple', bg: 'bg-purple-400' },
];

export const HighlightToolbar: React.FC = () => {
    const { segments, setSegments } = useAppStore();

    const applyColorToSelection = (colorClass: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        
        const newSegments = segments.map(seg => {
            const newWords = seg.words.map((word, wIdx) => {
                const el = document.querySelector(`[data-seg-id="${seg.id}"][data-word-idx="${wIdx}"]`);
                if (el && range.intersectsNode(el)) {
                    return { ...word, color: colorClass };
                }
                return word;
            });
            return { ...seg, words: newWords };
        });
        setSegments(newSegments);
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold mr-2">Highlight:</span>
            {COLOR_PALETTE.map((c, i) => (
                <button
                    key={i}
                    onMouseDown={(e) => { e.preventDefault(); applyColorToSelection(c.class); }}
                    className={`w-6 h-6 rounded-full border border-zinc-700 hover:scale-110 transition-transform ${c.bg} ${c.class === '' ? 'bg-zinc-800 text-zinc-400' : ''}`}
                    title={c.label}
                >
                    {c.class === '' && <span className="flex items-center justify-center text-[10px]">✕</span>}
                </button>
            ))}
        </div>
    );
};