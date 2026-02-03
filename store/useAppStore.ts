
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppMode, ScriptSegment, SavedScript, PromptConfig } from '../types';
import { DEFAULT_SCRIPT, DEFAULT_FONT_SIZE } from '../constants';

interface AppState {
    // Mode
    mode: AppMode;
    setMode: (mode: AppMode) => void;

    // Script Data
    segments: ScriptSegment[];
    setSegments: (segments: ScriptSegment[]) => void;
    rawText: string;
    setRawText: (text: string) => void;
    currentScriptId: string | null;
    setCurrentScriptId: (id: string | null) => void;
    savedScripts: SavedScript[];
    setSavedScripts: (scripts: SavedScript[]) => void;

    // Playback State
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;
    elapsedTime: number;
    setElapsedTime: (time: number | ((prev: number) => number)) => void;
    speedMultiplier: number;
    setSpeedMultiplier: (speed: number) => void;

    // Config
    config: PromptConfig;
    setConfig: (configUpdate: PromptConfig | ((prev: PromptConfig) => PromptConfig)) => void;

    // Camera & Video State
    isCameraActive: boolean;
    setIsCameraActive: (active: boolean) => void;
    isRecording: boolean;
    setIsRecording: (recording: boolean) => void;
    cameraCapabilities: MediaTrackCapabilities | null;
    setCameraCapabilities: (caps: MediaTrackCapabilities | null) => void;
    cameraSettings: MediaTrackSettings | null;
    setCameraSettings: (settings: MediaTrackSettings | null) => void;
    videoFileUrl: string | null;
    setVideoFileUrl: (url: string | null) => void;

    // UI State
    activeEditorTab: 'write' | 'tune' | 'history';
    setActiveEditorTab: (tab: 'write' | 'tune' | 'history') => void;
    toast: { msg: string; type: 'success' | 'error' } | null;
    setToast: (toast: { msg: string; type: 'success' | 'error' } | null) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            mode: AppMode.EDITOR,
            setMode: (mode) => set({ mode }),

            segments: DEFAULT_SCRIPT,
            setSegments: (segments) => set({ segments }),
            rawText: DEFAULT_SCRIPT.map(s => s.text).join('\n'),
            setRawText: (rawText) => set({ rawText }),
            currentScriptId: null,
            setCurrentScriptId: (currentScriptId) => set({ currentScriptId }),
            savedScripts: [],
            setSavedScripts: (savedScripts) => set({ savedScripts }),

            isPlaying: false,
            setIsPlaying: (isPlaying) => set({ isPlaying }),
            elapsedTime: 0,
            setElapsedTime: (elapsedTimeUpdate) => set((state) => ({
                elapsedTime: typeof elapsedTimeUpdate === 'function' ? elapsedTimeUpdate(state.elapsedTime) : elapsedTimeUpdate
            })),
            speedMultiplier: 1,
            setSpeedMultiplier: (speedMultiplier) => set({ speedMultiplier }),

            config: {
                fontSize: DEFAULT_FONT_SIZE,
                isMirrored: false,
                overlayColor: '#000000',
                guideOpacity: 0.2,
                showTimer: true,
                videoFilter: 'none',
                bgMode: 'camera',
                bgVisible: true,
                videoVolume: 0,
                mirrorVideo: true,
                focalPosition: 0.5,
                videoScale: 1.0,
                videoTranslateX: 0,
                videoTranslateY: 0,
                brightness: 1.0,
                contrast: 1.0,
                saturation: 1.0,
                videoSyncEnabled: true,
            },
            setConfig: (configUpdate) => set((state) => ({
                config: typeof configUpdate === 'function' ? configUpdate(state.config) : configUpdate
            })),

            isCameraActive: false,
            setIsCameraActive: (isCameraActive) => set({ isCameraActive }),
            isRecording: false,
            setIsRecording: (isRecording) => set({ isRecording }),
            cameraCapabilities: null,
            setCameraCapabilities: (cameraCapabilities) => set({ cameraCapabilities }),
            cameraSettings: null,
            setCameraSettings: (cameraSettings) => set({ cameraSettings }),
            videoFileUrl: null,
            setVideoFileUrl: (videoFileUrl) => set({ videoFileUrl }),

            activeEditorTab: 'write',
            setActiveEditorTab: (activeEditorTab) => set({ activeEditorTab }),
            toast: null,
            setToast: (toast) => set({ toast }),
        }),
        {
            name: 'teleprompter_v2_storage_v4',
            partialize: (state) => ({
                config: state.config,
                savedScripts: state.savedScripts,
            }),
        }
    )
);
