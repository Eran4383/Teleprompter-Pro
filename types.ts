
export interface SegmentWord {
    text: string;
    color?: string; // tailwind class e.g. 'text-yellow-400'
}

export interface ScriptSegment {
    id: string;
    text: string;
    words: SegmentWord[];
    duration: number; // Duration in milliseconds to speak this segment
}

export interface SavedScript {
    id: string;
    title: string;
    date: string; // ISO string
    segments: ScriptSegment[];
    rawText: string;
}

export enum AppMode {
    EDITOR = 'EDITOR',
    PROMPTER = 'PROMPTER',
}

export type VideoFilterType = 'none' | 'warm' | 'cool' | 'bw';
export type BackgroundMode = 'camera' | 'video';
export type AutomationMode = 'manual' | 'recording' | 'playback';

export interface AutomationKeyframe {
    t: number; // time in ms
    s: number; // scroll top in px
}

export interface AutomationTrack {
    scriptId: string;
    keyframes: AutomationKeyframe[];
}

export interface PromptConfig {
    fontSize: number; // in pixels
    isMirrored: boolean;
    overlayColor: string;
    guideOpacity: number; // 0.1 to 1.0
    showTimer: boolean;
    videoFilter: VideoFilterType;
    // Background Source
    bgMode: BackgroundMode;
    bgVisible: boolean;
    videoVolume: number; // 0 to 1
    mirrorVideo: boolean;
    // Focal Point
    focalPosition: number; // 0.2 to 0.8 (percentage of screen height)
    // Advanced Video Props
    videoScale: number; // 0.5 to 3.0
    videoTranslateX: number; // -100 to 100
    videoTranslateY: number; // -100 to 100
    brightness: number; // 0.5 to 2.5
    contrast: number;   // 0.5 to 2.5
    saturation: number; // 0 to 2.5
    // Playback Sync
    videoSyncEnabled: boolean;
    // Automation Mode
    automationMode: AutomationMode;
}
