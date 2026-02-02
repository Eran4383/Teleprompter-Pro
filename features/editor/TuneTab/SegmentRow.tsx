import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { ScriptSegment } from '../../../types';
import { ControlSlider } from '../../../components/ui/ControlSlider';

interface SegmentRowProps {
    segment: ScriptSegment;
}

export const SegmentRow: React.FC<SegmentRowProps> = ({ segment }) => {
    const { segments, setSegments } = useAppStore();

    const updateDuration = (duration: number) => {
        const newSegs = segments.map(s => s.id === segment.id ? { ...s, duration } : s);
        setSegments(newSegs);
    };

    const splitSegment = () => {
        const words = segment.words;
        if (words.length <= 1) return;
        const mid = Math.ceil(words.length / 2);
        const firstWords = words.slice(0, mid);
        const secondWords = words.slice(mid);
        const durationSplit = Math.floor(segment.duration / 2);

        const newSeg1 = { ...segment, text: firstWords.map(w => w.text).join(' '), words: firstWords, duration: durationSplit };
        const newSeg2 = { id: `seg-${Date.now()}-split`, text: secondWords.map(w => w.text).join(' '), words: secondWords, duration: durationSplit };

        const index = segments.findIndex(s => s.id === segment.id);
        const newSegments = [...segments];
        newSegments.splice(index, 1, newSeg1, newSeg2);
        setSegments(newSegments);
    };

    return (
        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 group transition-all hover:border-zinc-600">
            <div className="mb-3">
                <div className="flex flex-wrap gap-1.5 leading-relaxed" dir="auto">
                    {segment.words.map((word, wIdx) => (
                        <span
                            key={wIdx}
                            data-seg-id={segment.id}
                            data-word-idx={wIdx}
                            className={`px-1 py-0.5 rounded text-lg font-medium cursor-text selection:bg-indigo-500/50 ${word.color || 'text-zinc-200'}`}
                        >
                            {word.text}
                        </span>
                    ))}
                </div>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-900 select-none">
                <div className="flex items-center gap-3 flex-1">
                     <ControlSlider 
                        value={segment.duration}
                        min={100}
                        max={15000}
                        step={100}
                        onChange={updateDuration}
                        formatValue={(v) => `${(v / 1000).toFixed(1)}s`}
                     />
                </div>
                <button 
                    onClick={splitSegment} 
                    className="p-2 text-zinc-500 hover:text-indigo-400 transition-colors"
                    title="Split Segment"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};