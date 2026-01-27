
import { ScriptSegment } from "./types";

export const APP_VERSION = "v1.2.31";

const createSegment = (id: string, text: string, duration: number): ScriptSegment => ({
    id,
    text,
    words: text.split(' ').map(w => ({ text: w })),
    duration,
    textAlign: 'right'
});

export const DEFAULT_SCRIPT: ScriptSegment[] = [
    createSegment('1', "ברוכים הבאים לגרסה המקצועית של Teleprompter PRO.", 3000),
    createSegment('2', "המערכת מזהה עברית באופן אוטומטי ומיישרת את הטקסט לימין.", 4000),
    createSegment('3', "ניתן לשנות את היישור, הצבע והתזמון של כל סגמנט.", 3500),
];

export const MIN_DURATION = 100;
export const MAX_DURATION = 30000;
export const DEFAULT_FONT_SIZE = 64;
