
import { ScriptSegment } from "./types";

export const APP_VERSION = "v1.2.29";

const createSegment = (id: string, text: string, duration: number): ScriptSegment => ({
    id,
    text,
    words: text.split(' ').map(w => ({ text: w })),
    duration
});

export const DEFAULT_SCRIPT: ScriptSegment[] = [
    createSegment('1', "ברוכים הבאים ל-Teleprompter PRO.", 2000),
    createSegment('2', "עכשיו עם תמיכה מלאה בעברית ויישור טקסט אוטומטי.", 3000),
    createSegment('3', "ניתן לשנות יישור באופן ידני בתפריט העריכה.", 3500),
    createSegment('4', "Try the new auto-alignment features.", 4000),
];

export const MIN_DURATION = 100;
export const MAX_DURATION = 30000;
export const DEFAULT_FONT_SIZE = 64;
