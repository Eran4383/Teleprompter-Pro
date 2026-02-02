
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

export interface PromptConfig {
    fontSize: number;
    isMirrored: boolean;
    isLandscape: boolean; // NEW
    overlayColor: string;
    guideOpacity: number;
    showTimer: boolean;
    videoFilter: VideoFilterType;
    videoScale: number;
    brightness: number;
    contrast: number;
    saturation: number;
    fontColor: string; // NEW
    ghostColor: string; // NEW
}
