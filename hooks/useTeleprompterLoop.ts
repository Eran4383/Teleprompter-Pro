
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useTeleprompterLoop = (
    containerRef: React.RefObject<HTMLDivElement | null>,
    segmentRefs: React.MutableRefObject<(HTMLDivElement | null)[]>,
    videoRef: React.RefObject<HTMLVideoElement | null>
) => {
    const {
        segments, isPlaying, setIsPlaying,
        elapsedTime, setElapsedTime,
        speedMultiplier, config
    } = useAppStore();

    const requestRef = useRef<number | undefined>(undefined);
    const lastTimeRef = useRef<number | undefined>(undefined);
    const isUserInteracting = useRef(false);
    const scrollTimeoutRef = useRef<number | null>(null);

    const totalDuration = useMemo(() => segments.reduce((acc, seg) => acc + seg.duration, 0), [segments]);

    const segmentTimeMap = useMemo(() => {
        let acc = 0;
        return segments.map(s => {
            const start = acc; acc += s.duration;
            return { start, end: acc, id: s.id, duration: s.duration };
        });
    }, [segments]);

    const syncTimeFromScroll = useCallback(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const focalY = container.scrollTop + (container.clientHeight * config.focalPosition);
        
        let activeIdx = -1;
        for (let i = 0; i < segmentRefs.current.length; i++) {
            const el = segmentRefs.current[i];
            if (el && el.offsetTop <= focalY && (el.offsetTop + el.clientHeight) >= focalY) {
                activeIdx = i; break;
            }
            if (el && el.offsetTop > focalY) {
                activeIdx = i > 0 ? i - 1 : 0; break;
            }
        }
        
        if (activeIdx === -1) {
            if (container.scrollTop < 100) { setElapsedTime(0); return; }
            activeIdx = segments.length - 1;
        }

        const el = segmentRefs.current[activeIdx];
        const segMap = segmentTimeMap[activeIdx];
        if (el && segMap) {
            const ratio = Math.max(0, Math.min(1, (focalY - el.offsetTop) / el.clientHeight));
            const newTime = segMap.start + (segMap.duration * ratio);
            setElapsedTime(newTime);
            return newTime;
        }
        return elapsedTime;
    }, [containerRef, segmentRefs, segments.length, setElapsedTime, segmentTimeMap, config.focalPosition, elapsedTime]);

    const animate = useCallback((time: number) => {
        if (lastTimeRef.current !== undefined && isPlaying) {
            const deltaTime = time - lastTimeRef.current;
            
            if (!isUserInteracting.current) {
                const nextTime = elapsedTime + (deltaTime * speedMultiplier);
                const currentElapsed = Math.min(totalDuration, nextTime);
                setElapsedTime(currentElapsed);
                
                // Fix: Stop prompter when end reached for ALL modes to prevent stutter
                if (currentElapsed >= totalDuration) {
                    setIsPlaying(false);
                    if (videoRef.current) videoRef.current.pause();
                }

                if (config.bgMode === 'video' && videoRef.current) {
                    const video = videoRef.current;
                    if (video.paused && !video.ended && isPlaying) video.play().catch(() => {});
                    if (video.playbackRate !== speedMultiplier) video.playbackRate = speedMultiplier;
                    
                    if (config.videoSyncEnabled) {
                        const diff = Math.abs(currentElapsed / 1000 - video.currentTime);
                        if (diff > 0.15 && !video.ended) {
                            video.currentTime = currentElapsed / 1000;
                        }
                    }
                }
            } else if (config.videoSyncEnabled && config.bgMode === 'video' && videoRef.current) {
                // If user is interacting, pause video to prevent stuttering while seeking
                const video = videoRef.current;
                if (!video.paused) video.pause();
                
                const diff = Math.abs(elapsedTime / 1000 - video.currentTime);
                if (diff > 0.3) { 
                    video.currentTime = elapsedTime / 1000;
                }
            }
        }
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }, [isPlaying, speedMultiplier, totalDuration, setElapsedTime, elapsedTime, config.bgMode, config.videoSyncEnabled, videoRef, setIsPlaying]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => { 
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
        };
    }, [animate]);

    useEffect(() => {
        if (!isPlaying || isUserInteracting.current || !containerRef.current) return;
        const activeIdx = segmentTimeMap.findIndex(m => elapsedTime >= m.start && elapsedTime < m.end);
        if (activeIdx !== -1) {
            const activeEl = segmentRefs.current[activeIdx];
            if (activeEl) {
                const segData = segmentTimeMap[activeIdx];
                const progress = (elapsedTime - segData.start) / segData.duration;
                const scrollOffset = (activeEl.offsetTop - (containerRef.current.clientHeight * config.focalPosition)) + (activeEl.clientHeight * progress);
                containerRef.current.scrollTo({ top: scrollOffset, behavior: 'auto' });
            }
        }
    }, [elapsedTime, segmentTimeMap, isPlaying, config.focalPosition]);

    const handlePlayPause = () => {
        if (isUserInteracting.current) { 
            syncTimeFromScroll(); 
            isUserInteracting.current = false; 
        }
        const nextState = !isPlaying;
        setIsPlaying(nextState);
        lastTimeRef.current = undefined;
        
        if (!nextState && videoRef.current) {
            videoRef.current.pause();
        }
    };

    const handleStop = () => {
        setIsPlaying(false); setElapsedTime(0); isUserInteracting.current = false;
        lastTimeRef.current = undefined;
        if (videoRef.current) { 
            videoRef.current.currentTime = 0; 
            videoRef.current.pause(); 
        }
    };

    const handleUserInteraction = () => {
        isUserInteracting.current = true;
        if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
        lastTimeRef.current = performance.now();
    };

    const handleScroll = () => {
        if (isUserInteracting.current) {
            syncTimeFromScroll();
        }
        
        if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = window.setTimeout(() => { 
            isUserInteracting.current = false;
            lastTimeRef.current = performance.now();
            // Resume video if prompter is playing
            if (isPlaying && videoRef.current) {
                videoRef.current.play().catch(() => {});
            }
        }, 150); 
    };

    return {
        handlePlayPause, handleStop, handleUserInteraction, handleScroll,
        syncTimeFromScroll, totalDuration, segmentTimeMap, elapsedTime, isPlaying
    };
};
