
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useDirectorEngine } from './useDirectorEngine';

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
        config,
        automationMode, setAutomationMode
    } = useAppStore();

    const { recordFrame, getInterpolatedOffset, stopDirector } = useDirectorEngine();

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
        if (!containerRef.current || automationMode === 'PLAYBACK') return;
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
    }, [containerRef, segmentRefs, segments.length, setElapsedTime, totalDuration, segmentTimeMap, config.focalPosition, automationMode]);

    const animate = useCallback((time: number) => {
        if (lastTimeRef.current !== undefined && isPlaying) {
            const deltaTime = time - lastTimeRef.current;
            const nextTime = elapsedTime + (deltaTime * speedMultiplier);
            
            if (nextTime >= totalDuration) {
                setElapsedTime(totalDuration);
                if (automationMode !== 'IDLE') stopDirector(totalDuration);
                else setIsPlaying(false);
            } else {
                setElapsedTime(nextTime);
            }

            const currentElapsed = nextTime >= totalDuration ? totalDuration : nextTime;

            // Automation Recording
            if (automationMode === 'RECORDING' && containerRef.current) {
                recordFrame(currentElapsed, containerRef.current.scrollTop);
            }

            if (config.bgMode === 'video' && videoRef.current) {
                const video = videoRef.current;
                if (video.paused && !video.ended) video.play().catch(() => {});
                if (video.playbackRate !== speedMultiplier) video.playbackRate = speedMultiplier;

                if (config.videoSyncEnabled && time - lastSyncTimeRef.current > 500) {
                    const expectedVideoTime = currentElapsed / 1000;
                    if (Math.abs(expectedVideoTime - video.currentTime) > 0.15 && !video.ended) {
                        video.currentTime = expectedVideoTime;
                    }
                    lastSyncTimeRef.current = time;
                }
            }
        } else if (!isPlaying && config.bgMode === 'video' && videoRef.current && config.videoSyncEnabled) {
            if (!videoRef.current.paused) videoRef.current.pause();
        }

        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }, [isPlaying, speedMultiplier, totalDuration, setElapsedTime, elapsedTime, config.bgMode, config.videoSyncEnabled, videoRef, setIsPlaying, automationMode, recordFrame, stopDirector]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [animate]);

    useEffect(() => {
        if (!isPlaying || isManualScroll.current || !containerRef.current) return;

        if (automationMode === 'PLAYBACK') {
            const targetOffset = getInterpolatedOffset(elapsedTime);
            if (targetOffset !== null) {
                containerRef.current.scrollTo({ top: targetOffset, behavior: 'auto' });
            }
            return;
        }

        const activeSegmentIndex = segmentTimeMap.findIndex(m => elapsedTime >= m.start && elapsedTime < m.end);
        if (activeSegmentIndex !== -1) {
            const activeEl = segmentRefs.current[activeSegmentIndex];
            if (activeEl) {
                const segmentData = segmentTimeMap[activeSegmentIndex];
                const segmentProgress = (elapsedTime - segmentData.start) / (segmentData.end - segmentData.start);
                const targetScroll = activeEl.offsetTop - (containerRef.current.clientHeight * config.focalPosition) + (activeEl.clientHeight * segmentProgress);
                containerRef.current.scrollTo({ top: targetScroll, behavior: 'auto' });
            }
        }
    }, [elapsedTime, segmentTimeMap, isPlaying, containerRef, segmentRefs, config.focalPosition, automationMode, getInterpolatedOffset]);

    const handlePlayPause = () => {
        if (automationMode !== 'IDLE') {
            stopDirector(totalDuration);
            return;
        }
        if (!isPlaying && isManualScroll.current) {
            syncTimeFromScroll();
            isManualScroll.current = false;
        }
        setIsPlaying(!isPlaying);
        lastTimeRef.current = undefined;
    };

    const handleStop = () => {
        if (automationMode !== 'IDLE') stopDirector(totalDuration);
        setIsPlaying(false);
        setElapsedTime(0);
        isManualScroll.current = false;
        lastTimeRef.current = undefined;
        if (config.bgMode === 'video' && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.pause();
        }
    };

    return {
        handlePlayPause,
        handleStop,
        handleUserInteraction: () => {
            if (isPlaying && config.videoSyncEnabled && automationMode === 'IDLE') setIsPlaying(false);
            isManualScroll.current = true;
        },
        handleScroll: () => { if (!isPlaying) syncTimeFromScroll(); },
        syncTimeFromScroll,
        totalDuration,
        segmentTimeMap,
        elapsedTime,
        isPlaying
    };
};
