
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ScriptSegment } from '../types';

export const useTeleprompter = (segments: ScriptSegment[]) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [speed, setSpeed] = useState(1);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
    const lastTimeRef = useRef<number>();

    const totalDuration = useMemo(() => segments.reduce((a, s) => a + s.duration, 0), [segments]);
    const timeMap = useMemo(() => {
        let acc = 0;
        return segments.map(s => {
            const start = acc;
            acc += s.duration;
            return { start, end: acc };
        });
    }, [segments]);

    const animate = useCallback((time: number) => {
        if (lastTimeRef.current !== undefined && isPlaying) {
            const dt = time - lastTimeRef.current;
            setElapsedTime(prev => Math.min(totalDuration, prev + (dt * speed)));
        }
        lastTimeRef.current = time;
        requestAnimationFrame(animate);
    }, [isPlaying, speed, totalDuration]);

    useEffect(() => {
        const id = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(id);
    }, [animate]);

    useEffect(() => {
        if (!isPlaying || !containerRef.current) return;
        const idx = timeMap.findIndex(m => elapsedTime >= m.start && elapsedTime < m.end);
        if (idx !== -1 && segmentRefs.current[idx]) {
            const el = segmentRefs.current[idx]!;
            const targetScroll = el.offsetTop - (containerRef.current.clientHeight / 2) + (el.clientHeight / 2);
            const progress = (elapsedTime - timeMap[idx].start) / (timeMap[idx].end - timeMap[idx].start);
            containerRef.current.scrollTo({ top: targetScroll + (el.clientHeight * progress) - (el.clientHeight/2), behavior: 'auto' });
        }
    }, [elapsedTime, isPlaying, timeMap]);

    return { 
        isPlaying, setIsPlaying, elapsedTime, setElapsedTime, speed, setSpeed, 
        containerRef, segmentRefs, totalDuration, timeMap 
    };
};
