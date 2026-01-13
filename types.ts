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

export enum AppMode {
    EDITOR = 'EDITOR',
    PROMPTER = 'PROMPTER',
}

export interface PromptConfig {
    fontSize: number; // in pixels
    isMirrored: boolean;
    overlayColor: string;
    guideOpacity: number;
    showTimer: boolean;
}