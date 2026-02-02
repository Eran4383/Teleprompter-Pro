
import { ScriptSegment, PromptConfig } from "./types";

export const APP_VERSION = "v1.2.23";

const createSegment = (id: string, text: string, duration: number): ScriptSegment => ({
    id,
    text,
    words: text.split(' ').map(w => ({ text: w })),
    duration
});

export const DEFAULT_SCRIPT: ScriptSegment[] = [
    createSegment('1', "Welcome to Teleprompter PRO.", 2000),
    createSegment('2', "Build error fixed: React 19 Ref callbacks.", 3000),
    createSegment('3', "Try the new Landscape rotation mode.", 3500),
    createSegment('4', "Everything is saved automatically.", 4000),
];

export const PROMPTER_DEFAULTS: PromptConfig = {
    fontSize: 54,
    isMirrored: false,
    isLandscape: false,
    overlayColor: '#000000',
    guideOpacity: 0.2,
    showTimer: true,
    videoFilter: 'none',
    videoScale: 1.0,
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    fontColor: '#ffffff',
    ghostColor: '#ffffff'
};

export const MIN_DURATION = 100;
export const MAX_DURATION = 30000;
export const DEFAULT_FONT_SIZE = 64;
