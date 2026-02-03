
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';

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
        config
    } = useAppStore();

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
                
                // Ensure video plays/pauses with prompter
                if (video.paused && !video.ended) {
                    video.play().catch(() => {});
                }
                if (video.playbackRate !== speedMultiplier) {
                    video.playbackRate = speedMultiplier;
                }

                // Only force sync if enabled
                if (config.videoSyncEnabled && time - lastSyncTimeRef.current > 500) {
                    const expectedVideoTime = currentElapsed / 1000;
                    const actualVideoTime = video.currentTime;
                    if (!video.ended) {
                        const drift = Math.abs(expectedVideoTime - actualVideoTime);
                        if (drift > 0.15) {
                            video.currentTime = expectedVideoTime;
                        }
                    }
                    lastSyncTimeRef.current = time;
                }
            }
        } else if (!isPlaying && config.bgMode === 'video' && videoRef.current) {
            if (!videoRef.current.paused) videoRef.current.pause();
        }

        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }, [isPlaying, speedMultiplier, totalDuration, setElapsedTime, elapsedTime, config.bgMode, config.videoSyncEnabled, videoRef, setIsPlaying]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

    useEffect(() => {
        if (!isPlaying || isManualScroll.current || !containerRef.current) return;

        const activeSegmentIndex = segmentTimeMap.findIndex(
            map => elapsedTime >= map.start && elapsedTime < map.end
        );

        if (activeSegmentIndex !== -1) {
            const activeEl = segmentRefs.current[activeSegmentIndex];
            if (activeEl) {
                const containerHeight = containerRef.current.clientHeight;
                const elTop = activeEl.offsetTop;
                const elHeight = activeEl.clientHeight;
                const segmentData = segmentTimeMap[activeSegmentIndex];
                const segmentProgress = (elapsedTime - segmentData.start) / (segmentData.end - segmentData.start);
                
                // Target: Segment center aligns with Focal Position
                const targetScroll = elTop - (containerHeight * config.focalPosition) + (elHeight / 2);
                const scrollOffset = targetScroll + (elHeight * segmentProgress) - (elHeight/2);

                containerRef.current.scrollTo({ top: scrollOffset, behavior: 'auto' });
            }
        } else if (elapsedTime === 0) {
            const firstEl = segmentRefs.current[0];
            if (firstEl && containerRef.current) {
                 const containerHeight = containerRef.current.clientHeight;
                 const targetScroll = firstEl.offsetTop - (containerHeight * config.focalPosition) + (firstEl.clientHeight / 2);
                 containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }
        }
    }, [elapsedTime, segmentTimeMap, isPlaying, containerRef, segmentRefs, config.focalPosition]);

    const handlePlayPause = () => {
        if (!isPlaying && isManualScroll.current) {
            syncTimeFromScroll();
            isManualScroll.current = false;
        }
        setIsPlaying(!isPlaying);
        lastTimeRef.current = undefined;
    };

    const handleStop = () => {
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
        if (isPlaying) setIsPlaying(false);
        isManualScroll.current = true;
    };

    const handleScroll = () => {
        if (!isPlaying) {
            syncTimeFromScroll();
        }
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
