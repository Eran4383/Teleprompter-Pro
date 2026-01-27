
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ScriptSegment } from '../types';

export const useTeleprompter = (segments: ScriptSegment[]) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);
    
    const containerRef = useRef<HTMLDivElement>(null);
    // Fix: Added undefined initial value to avoid TypeScript error about missing arguments.
    const requestRef = useRef<number | undefined>(undefined);
    // Fix: Added undefined initial value to avoid TypeScript error about missing arguments.
    const lastTimeRef = useRef<number | undefined>(undefined);
    const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
    const isManualScroll = useRef(false);

    const totalDuration = useMemo(() => segments.reduce((acc, seg) => acc + seg.duration, 0), [segments]);

    const segmentTimeMap = useMemo(() => {
        let acc = 0;
        return segments.map(s => {
            const start = acc;
            acc += s.duration;
            return { start, end: acc, id: s.id, duration: s.duration };
        });
    }, [segments]);

    const syncTimeFromScroll = useCallback(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const center = container.scrollTop + (container.clientHeight / 2);
        let activeIdx = -1;
        for (let i = 0; i < segmentRefs.current.length; i++) {
            const el = segmentRefs.current[i];
            if (el && (el.offsetTop <= center && el.offsetTop + el.clientHeight >= center)) {
                activeIdx = i; break;
            }
            if (el && el.offsetTop > center) {
                activeIdx = i > 0 ? i - 1 : 0; break;
            }
        }
        if (activeIdx === -1) {
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
                setElapsedTime(totalDuration); return;
            }
            if (container.scrollTop < 100) { setElapsedTime(0); return; }
        }
        const el = segmentRefs.current[activeIdx];
        const segMap = segmentTimeMap[activeIdx];
        if (el && segMap) {
            const dist = center - el.offsetTop;
            const ratio = Math.max(0, Math.min(1, dist / el.clientHeight));
            setElapsedTime(segMap.start + (segMap.duration * ratio));
        }
    }, [segmentTimeMap, totalDuration]);

    const animate = useCallback((time: number) => {
        if (lastTimeRef.current !== undefined && isPlaying) {
            const deltaTime = time - lastTimeRef.current;
            setElapsedTime(prev => {
                const next = prev + (deltaTime * speedMultiplier);
                return next >= totalDuration ? totalDuration : next;
            });
        }
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }, [isPlaying, speedMultiplier, totalDuration]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [animate]);

    useEffect(() => {
        if (!isPlaying || isManualScroll.current || !containerRef.current) return;
        const activeIdx = segmentTimeMap.findIndex(m => elapsedTime >= m.start && elapsedTime < m.end);
        if (activeIdx !== -1) {
            const activeEl = segmentRefs.current[activeIdx];
            if (activeEl) {
                const containerHeight = containerRef.current.clientHeight;
                const segmentData = segmentTimeMap[activeIdx];
                const segmentProgress = (elapsedTime - segmentData.start) / (segmentData.end - segmentData.start);
                const targetScroll = activeEl.offsetTop - (containerHeight / 2) + (activeEl.clientHeight / 2);
                const scrollOffset = targetScroll + (activeEl.clientHeight * segmentProgress) - (activeEl.clientHeight/2);
                containerRef.current.scrollTo({ top: scrollOffset, behavior: 'auto' });
            }
        }
    }, [elapsedTime, isPlaying, segmentTimeMap]);

    const handlePlayPause = useCallback(() => {
        if (!isPlaying && isManualScroll.current) {
            syncTimeFromScroll();
            isManualScroll.current = false;
        }
        setIsPlaying(!isPlaying);
        lastTimeRef.current = undefined;
    }, [isPlaying, syncTimeFromScroll]);

    const handleStop = useCallback(() => {
        setIsPlaying(false); setElapsedTime(0); isManualScroll.current = false; lastTimeRef.current = undefined;
    }, []);

    const handleUserInteraction = useCallback(() => {
        if (isPlaying) setIsPlaying(false);
        isManualScroll.current = true;
    }, [isPlaying]);

    return {
        isPlaying, elapsedTime, setElapsedTime, speedMultiplier, setSpeedMultiplier, 
        containerRef, segmentRefs, totalDuration, segmentTimeMap,
        handlePlayPause, handleStop, handleUserInteraction, syncTimeFromScroll
    };
};
