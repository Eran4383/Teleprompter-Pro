
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AutomationKeyframe } from '../types';

interface AutomationState {
    tracks: Record<string, AutomationKeyframe[]>;
    setTrack: (scriptId: string, keyframes: AutomationKeyframe[]) => void;
    clearTrack: (scriptId: string) => void;
}

export const useAutomationStore = create<AutomationState>()(
    persist(
        (set, get) => ({
            tracks: {},
            setTrack: (scriptId, keyframes) => set((state) => ({
                tracks: { ...state.tracks, [scriptId]: keyframes }
            })),
            clearTrack: (scriptId) => set((state) => {
                const newTracks = { ...state.tracks };
                delete newTracks[scriptId];
                return { tracks: newTracks };
            }),
        }),
        {
            name: 'teleprompter_automation_v1',
        }
    )
);
