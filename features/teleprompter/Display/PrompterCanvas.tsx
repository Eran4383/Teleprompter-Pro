import React, { forwardRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { SegmentText } from './SegmentText';

interface PrompterCanvasProps {
    segmentRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    elapsedTime: number;
    segmentTimeMap: { start: number; end: number; id: string }[];
    onUserInteraction: () => void;
    onScroll: () => void;
}

export const PrompterCanvas = forwardRef<HTMLDivElement, PrompterCanvasProps>(({
    segmentRefs,
    elapsedTime,
    segmentTimeMap,
    onUserInteraction,
    onScroll
}, ref) => {
    const { segments, config } = useAppStore();

    return (
        <div className="flex-1 relative overflow-hidden z-10" onDoubleClick={e => e.stopPropagation()}>
            {/* Focal Line Guide */}
            <div className="absolute inset-0 pointer-events-none z-20 flex items-center">
                <div className="w-full h-[2px] bg-red-600/50 shadow-[0_0_15px_rgba(220,38,38,0.6)]" />
            </div>

            <div 
                ref={ref} 
                onWheel={onUserInteraction} 
                onTouchStart={onUserInteraction} 
                onMouseDown={onUserInteraction} 
                onScroll={onScroll} 
                className={`h-full overflow-y-auto relative ${config.isMirrored ? 'scale-y-[-1] scale-x-[-1]' : ''} touch-pan-y no-scrollbar`}
            >
                <div className="py-[50vh] px-8 max-w-5xl mx-auto">
                    {segments.map((seg, idx) => {
                        const isActive = elapsedTime >= segmentTimeMap[idx]?.start && elapsedTime < segmentTimeMap[idx]?.end;
                        return (
                            <SegmentText 
                                key={seg.id}
                                segment={seg}
                                isActive={isActive}
                                ref={(el) => { segmentRefs.current[idx] = el; }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

PrompterCanvas.displayName = 'PrompterCanvas';