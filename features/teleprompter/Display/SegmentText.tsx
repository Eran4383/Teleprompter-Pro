import React, { forwardRef } from 'react';
import { ScriptSegment } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';

interface SegmentTextProps {
    segment: ScriptSegment;
    isActive: boolean;
}

export const SegmentText = forwardRef<HTMLDivElement, SegmentTextProps>(({ segment, isActive }, ref) => {
    const { config, isCameraActive } = useAppStore();

    return (
        <div 
            ref={ref} 
            className="mb-10 font-bold text-center leading-[1.1] transition-all duration-300 drop-shadow-lg select-none"
            style={{ 
                fontSize: config.fontSize + 'px', 
                textShadow: isCameraActive ? '0 4px 8px rgba(0,0,0,0.9)' : 'none',
                opacity: isActive ? 1 : config.guideOpacity,
                filter: isActive ? 'none' : 'blur(1px)',
                transform: isActive ? 'scale(1.02)' : 'scale(0.98)'
            }} 
            dir="auto"
        >
            {segment.words.map((word, idx) => (
                <span key={idx} className={`inline-block mr-[0.25em] ${word.color || 'text-white'}`}>
                    {word.text}
                </span>
            ))}
        </div>
    );
});

SegmentText.displayName = 'SegmentText';