
import { useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AutomationKeyframe, AutomationTake } from '../../types';

export const useDirectorCapture = () => {
    const { addTake, currentScriptId } = useAppStore();
    const bufferRef = useRef<AutomationKeyframe[]>([]);

    const recordFrame = useCallback((time: number, offset: number) => {
        // Only record if offset changed or at significant intervals to save space
        const last = bufferRef.current[bufferRef.current.length - 1];
        if (!last || Math.abs(last.offset - offset) > 0.5 || (time - last.time) > 100) {
            bufferRef.current.push({ time, offset });
        }
    }, []);

    const flush = useCallback((totalDuration: number) => {
        if (bufferRef.current.length < 5) {
            bufferRef.current = [];
            return null;
        }

        const newTake: AutomationTake = {
            id: `take-${Date.now()}`,
            scriptId: currentScriptId || 'unsaved',
            date: new Date().toISOString(),
            keyframes: [...bufferRef.current],
            duration: totalDuration
        };

        addTake(newTake);
        bufferRef.current = [];
        return newTake.id;
    }, [addTake, currentScriptId]);

    const reset = useCallback(() => {
        bufferRef.current = [];
    }, []);

    return { recordFrame, flush, reset };
};
