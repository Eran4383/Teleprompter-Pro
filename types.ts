
export interface SegmentWord {
    text: string;
    color?: string; // tailwind class e.g. 'text-yellow-400'
}

export type TextAlign = 'left' | 'center' | 'right';

export interface ScriptSegment {
    id: string;
    text: string;
    words: SegmentWord[];
    duration: number; // Duration in milliseconds to speak this segment
    textAlign?: TextAlign;
}

export interface SavedScript {
    id: string;
    title: string;
    date: string; // ISO string
    segments: ScriptSegment[];
    rawText: string;
    textAlign?: TextAlign;
}

export enum AppMode {
    EDITOR = 'EDITOR',
    PROMPTER = 'PROMPTER',
}

export type VideoFilterType = 'none' | 'warm' | 'cool' | 'bw';

export interface PromptConfig {
    fontSize: number; // in pixels
    isMirrored: boolean;
    overlayColor: string;
    guideOpacity: number; // 0.1 to 1.0
    showTimer: boolean;
    videoFilter: VideoFilterType;
    // Advanced Video Props
    videoScale: number; // 0.5 to 2.0
    brightness: number; // 0.5 to 2.0 (1 is default)
    contrast: number;   // 0.5 to 2.0 (1 is default)
    saturation: number; // 0 to 2.0 (1 is default)
    // Styling
    primaryColor: string;
    ghostColor: string;
    guideOffset: number; // 0 to 100 (%)
}
