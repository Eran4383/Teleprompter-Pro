
import { useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const useDirectorPlayback = () => {
    const { takes, activeTakeId } = useAppStore();

    const getInterpolatedOffset = useCallback((elapsedTime: number): number | null => {
        const activeTake = takes.find(t => t.id === activeTakeId);
        if (!activeTake || activeTake.keyframes.length === 0) return null;

        const keys = activeTake.keyframes;
        
        // Find surrounding keyframes
        let nextIdx = keys.findIndex(k => k.time > elapsedTime);
        
        if (nextIdx === -1) return keys[keys.length - 1].offset;
        if (nextIdx === 0) return keys[0].offset;

        const prev = keys[nextIdx - 1];
        const next = keys[nextIdx];

        // Linear interpolation
        const range = next.time - prev.time;
        const progress = (elapsedTime - prev.time) / range;
        
        return prev.offset + (next.offset - prev.offset) * progress;
    }, [takes, activeTakeId]);

    return { getInterpolatedOffset };
};
