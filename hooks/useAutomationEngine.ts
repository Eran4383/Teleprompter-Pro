
import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAutomationStore } from '../store/useAutomationStore';
import { AutomationKeyframe } from '../types';

export const useAutomationEngine = () => {
    const { currentScriptId, elapsedTime } = useAppStore();
    const { tracks, setTrack } = useAutomationStore();
    
    const bufferRef = useRef<AutomationKeyframe[]>([]);
    const lastRecordedTime = useRef<number>(0);
    const lastRecordedPos = useRef<number>(-1);

    const record = useCallback((scrollTop: number) => {
        if (!currentScriptId) return;
        
        // High-frequency "Hot Buffer" push (no state updates)
        const timeDiff = elapsedTime - lastRecordedTime.current;
        const posDiff = Math.abs(scrollTop - lastRecordedPos.current);

        // Record on change or heartbeat (50ms)
        if (posDiff > 0.5 || timeDiff > 50) {
            // Overwrite future keyframes if we are seeking back and re-recording
            if (timeDiff < 0) {
                bufferRef.current = bufferRef.current.filter(k => k.t < elapsedTime);
            }

            bufferRef.current.push({ t: elapsedTime, s: scrollTop });
            
            lastRecordedTime.current = elapsedTime;
            lastRecordedPos.current = scrollTop;
        }
    }, [currentScriptId, elapsedTime]);

    const commit = useCallback(() => {
        if (!currentScriptId || bufferRef.current.length === 0) return;

        const existingTrack = tracks[currentScriptId] || [];
        // Merge strategy: Buffer overwrites existing points in its time range
        const startTime = bufferRef.current[0].t;
        const endTime = bufferRef.current[bufferRef.current.length - 1].t;
        
        const mergedTrack = [
            ...existingTrack.filter(k => k.t < startTime || k.t > endTime),
            ...bufferRef.current
        ].sort((a, b) => a.t - b.t);

        setTrack(currentScriptId, mergedTrack);
        bufferRef.current = []; // Clear hot buffer
    }, [currentScriptId, setTrack, tracks]);

    const abort = useCallback(() => {
        bufferRef.current = [];
    }, []);

    const getInterpolatedPosition = useCallback((time: number): number | null => {
        if (!currentScriptId) return null;
        const track = tracks[currentScriptId];
        if (!track || track.length === 0) return null;

        let low = 0;
        let high = track.length - 1;

        if (time <= track[0].t) return track[0].s;
        if (time >= track[high].t) return track[high].s;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (track[mid].t === time) return track[mid].s;
            if (track[mid].t < time) low = mid + 1;
            else high = mid - 1;
        }

        const k1 = track[low - 1];
        const k2 = track[low];

        const tDiff = k2.t - k1.t;
        if (tDiff === 0) return k1.s;
        
        const ratio = (time - k1.t) / tDiff;
        return k1.s + (k2.s - k1.s) * ratio;
    }, [currentScriptId, tracks]);

    return {
        record,
        commit,
        abort,
        getInterpolatedPosition
    };
};
