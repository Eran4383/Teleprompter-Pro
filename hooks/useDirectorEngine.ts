
import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useDirectorCapture } from './director/useDirectorCapture';
import { useDirectorPlayback } from './director/useDirectorPlayback';

export const useDirectorEngine = () => {
    const { 
        automationMode, setAutomationMode, 
        elapsedTime, setElapsedTime,
        setIsPlaying, setToast,
        setActiveTakeId
    } = useAppStore();

    const { recordFrame, flush, reset } = useDirectorCapture();
    const { getInterpolatedOffset } = useDirectorPlayback();

    useEffect(() => {
        if (automationMode === 'RECORDING') {
            setElapsedTime(0);
            setIsPlaying(true);
            reset();
            setToast({ msg: "Director: Recording Performance...", type: "success" });
        }
    }, [automationMode, setElapsedTime, setIsPlaying, reset, setToast]);

    const stopDirector = useCallback((totalDuration: number) => {
        if (automationMode === 'RECORDING') {
            const takeId = flush(totalDuration);
            if (takeId) {
                setToast({ msg: "Performance Captured", type: "success" });
                setActiveTakeId(takeId);
            }
        }
        setAutomationMode('IDLE');
        setIsPlaying(false);
    }, [automationMode, flush, setAutomationMode, setIsPlaying, setToast, setActiveTakeId]);

    return { 
        recordFrame, 
        getInterpolatedOffset,
        stopDirector
    };
};
