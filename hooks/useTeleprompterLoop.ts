
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAutomationEngine } from './useAutomationEngine';

export const useTeleprompterLoop = (
    containerRef: React.RefObject<HTMLDivElement | null>,
    segmentRefs: React.MutableRefObject<(HTMLDivElement | null)[]>,
    videoRef: React.RefObject<HTMLVideoElement | null>
) => {
    const {
        segments,
        isPlaying, setIsPlaying,
        elapsedTime, setElapsedTime,
        speedMultiplier,
        config, setConfig
    } = useAppStore();

    const { record, commit, getInterpolatedPosition } = useAutomationEngine();

    const requestRef = useRef<number | undefined>(undefined);
    const lastTimeRef = useRef<number | undefined>(undefined);
    const lastSyncTimeRef = useRef<number>(0);
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
        const focalY = container.scrollTop + (container.clientHeight * config.focalPosition);
        
        let activeIdx = -1;
        for (let i = 0; i < segmentRefs.current.length; i++) {
            const el = segmentRefs.current[i];
            if (el && (el.offsetTop <= focalY && el.offsetTop + el.clientHeight >= focalY)) {
                activeIdx = i;
                break;
            }
            if (el && el.offsetTop > focalY) {
                activeIdx = i > 0 ? i - 1 : 0;
                break;
            }
        }
        
        if (activeIdx === -1) {
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
                setElapsedTime(totalDuration);
                return;
            }
            if (container.scrollTop < 100) {
                 setElapsedTime(0);
                 return;
            }
            activeIdx = segments.length - 1;
        }

        const el = segmentRefs.current[activeIdx];
        const segMap = segmentTimeMap[activeIdx];

        if (el && segMap) {
            const dist = focalY - el.offsetTop;
            const ratio = Math.max(0, Math.min(1, dist / el.clientHeight));
            setElapsedTime(segMap.start + (segMap.duration * ratio));
        }
    }, [containerRef, segmentRefs, segments.length, setElapsedTime, totalDuration, segmentTimeMap, config.focalPosition]);

    const animate = useCallback((time: number) => {
        if (lastTimeRef.current !== undefined && isPlaying) {
            const deltaTime = time - lastTimeRef.current;
            const nextTime = elapsedTime + (deltaTime * speedMultiplier);
            
            if (config.bgMode === 'camera' && nextTime >= totalDuration) {
                setElapsedTime(totalDuration);
                setIsPlaying(false);
            } else {
                setElapsedTime(nextTime);
            }

            const currentElapsed = (config.bgMode === 'camera' && nextTime >= totalDuration) ? totalDuration : nextTime;

            if (config.bgMode === 'video' && videoRef.current) {
                const video = videoRef.current;
                
                // Ensure video is playing and speed matches
                if (video.paused && !video.ended) {
                    video.play().catch(() => {});
                }
                if (video.playbackRate !== speedMultiplier) {
                    video.playbackRate = speedMultiplier;
                }

                // Strictly sync video time to text position in Linked mode
                if (config.videoSyncEnabled) {
                    const expectedVideoTime = currentElapsed / 1000;
                    const drift = Math.abs(expectedVideoTime - video.currentTime);
                    
                    // Frequent checks for tight sync
                    if (drift > 0.1) {
                        video.currentTime = expectedVideoTime;
                    }
                }
            }

            // High Performance Buffer Record (Captures final state of scroll in this frame)
            if (config.automationMode === 'recording' && containerRef.current) {
                record(containerRef.current.scrollTop);
            }
            
            // Automation Playback Driver
            if (config.automationMode === 'playback' && containerRef.current) {
                const targetScroll = getInterpolatedPosition(currentElapsed);
                if (targetScroll !== null) {
                    containerRef.current.scrollTo({ top: targetScroll, behavior: 'auto' });
                }
            }
        } else if (!isPlaying && config.bgMode === 'video' && videoRef.current) {
            if (config.videoSyncEnabled && !videoRef.current.paused) {
                videoRef.current.pause();
            }
        }

        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }, [isPlaying, speedMultiplier, totalDuration, setElapsedTime, elapsedTime, config.bgMode, config.videoSyncEnabled, config.automationMode, videoRef, setIsPlaying, record, getInterpolatedPosition, containerRef]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

    useEffect(() => {
        // Auto-scroll logic (Active in Manual & Recording modes)
        // Note: In Recording mode, we still auto-scroll so user only has to "nudge" corrections
        if (!isPlaying || isManualScroll.current || !containerRef.current || config.automationMode === 'playback') return;

        const activeIdx = segmentTimeMap.findIndex(m => elapsedTime >= m.start && elapsedTime < m.end);

        if (activeIdx !== -1) {
            const activeEl = segmentRefs.current[activeIdx];
            if (activeEl) {
                const cHeight = containerRef.current.clientHeight;
                const segData = segmentTimeMap[activeIdx];
                const progress = (elapsedTime - segData.start) / (segData.end - segData.start);
                const targetScroll = activeEl.offsetTop - (cHeight * config.focalPosition) + (activeEl.clientHeight * progress);
                containerRef.current.scrollTo({ top: targetScroll, behavior: 'auto' });
            }
        }
    }, [elapsedTime, segmentTimeMap, isPlaying, containerRef, segmentRefs, config.focalPosition, config.automationMode]);

    const handlePlayPause = () => {
        if (!isPlaying && isManualScroll.current) {
            syncTimeFromScroll();
            isManualScroll.current = false;
        }
        setIsPlaying(!isPlaying);
        lastTimeRef.current = undefined;
    };

    const handleStop = () => {
        if (config.automationMode === 'recording') commit();
        setIsPlaying(false);
        setElapsedTime(0);
        isManualScroll.current = false;
        lastTimeRef.current = undefined;
        if (config.bgMode === 'video' && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.pause();
        }
    };

    const handleUserInteraction = () => {
        // Safety: If in playback, manual interaction pauses drive to prevent fighting
        if (isPlaying && config.automationMode === 'playback') {
            setIsPlaying(false);
            return;
        }

        // CRITICAL FIX: If recording, don't stop playback. This allows "Hybrid Corrections".
        if (isPlaying && config.automationMode === 'recording') {
            isManualScroll.current = true;
            return;
        }

        // Standard behavior: pause on interaction
        if (isPlaying) setIsPlaying(false);
        isManualScroll.current = true;
    };

    const handleScroll = () => {
        if (!isPlaying) syncTimeFromScroll();
    };

    return {
        handlePlayPause,
        handleStop,
        handleUserInteraction,
        handleScroll,
        syncTimeFromScroll,
        totalDuration,
        segmentTimeMap,
        elapsedTime,
        isPlaying
    };
};
