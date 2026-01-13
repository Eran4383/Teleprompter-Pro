import { ScriptSegment } from "./types";

export const APP_VERSION = "v1.2.15";

const createSegment = (id: string, text: string, duration: number): ScriptSegment => ({
    id,
    text,
    words: text.split(' ').map(w => ({ text: w })),
    duration
});

export const DEFAULT_SCRIPT: ScriptSegment[] = [
    createSegment('1', "Welcome to Teleprompter PRO.", 2000),
    createSegment('2', "This version includes optimized MP4 recording.", 3000),
    createSegment('3', "History archives are now fully synchronized.", 3500),
    createSegment('4', "Tap 'Start' to begin prompting.", 2000),
];

export const MIN_DURATION = 100; // 100ms
export const MAX_DURATION = 30000; // 30s
export const DEFAULT_FONT_SIZE = 64;