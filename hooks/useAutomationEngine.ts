
import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAutomationStore } from '../store/useAutomationStore';
import { AutomationKeyframe } from '../types';

export const useAutomationEngine = () => {
    const { currentScriptId, elapsedTime } = useAppStore();
    const { tracks, setTrack } = useAutomationStore();
    
    const lastRecordedTime = useRef<number>(0);
    const lastRecordedPos = useRef<number>(-1);

    const record = useCallback((scrollTop: number) => {
        if (!currentScriptId) return;
        
        // Only record if value changed significantly or enough time passed
        // This is "Keyframe Delta Compression"
        const timeDiff = elapsedTime - lastRecordedTime.current;
        const posDiff = Math.abs(scrollTop - lastRecordedPos.current);

        if (posDiff > 1 || timeDiff > 100) {
            const currentTrack = tracks[currentScriptId] || [];
            
            // Remove any keyframes that exist after the current time (if re-recording over a section)
            const cleanTrack = currentTrack.filter(k => k.t < elapsedTime);
            
            const newKeyframe: AutomationKeyframe = { t: elapsedTime, s: scrollTop };
            setTrack(currentScriptId, [...cleanTrack, newKeyframe]);
            
            lastRecordedTime.current = elapsedTime;
            lastRecordedPos.current = scrollTop;
        }
    }, [currentScriptId, elapsedTime, tracks, setTrack]);

    const getInterpolatedPosition = useCallback((time: number): number | null => {
        if (!currentScriptId) return null;
        const track = tracks[currentScriptId];
        if (!track || track.length === 0) return null;

        // Binary search to find K1 and K2
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

        // low is the index of K2, low-1 is the index of K1
        const k1 = track[low - 1];
        const k2 = track[low];

        // Linear Interpolation (Lerp)
        const tDiff = k2.t - k1.t;
        if (tDiff === 0) return k1.s;
        
        const ratio = (time - k1.t) / tDiff;
        return k1.s + (k2.s - k1.s) * ratio;
    }, [currentScriptId, tracks]);

    return {
        record,
        getInterpolatedPosition
    };
};
