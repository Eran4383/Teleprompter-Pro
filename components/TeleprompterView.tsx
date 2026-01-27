
import React, { useState } from 'react';
import { ScriptSegment, PromptConfig } from '../types';
import { useCamera } from '../hooks/useCamera';
import { useTeleprompter } from '../hooks/useTeleprompter';
import { SettingsPanel } from './SettingsPanel';

interface TeleprompterViewProps {
    segments: ScriptSegment[];
    onClose: () => void;
}

const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({ segments, onClose }) => {
    const camera = useCamera();
    const prompter = useTeleprompter(segments);
    const [showSettings, setShowSettings] = useState(false);
    const [config, setConfig] = useState<PromptConfig>({
        fontSize: 54, isMirrored: false, overlayColor: '#000000', guideOpacity: 0.2,
        showTimer: true, videoFilter: 'none', videoScale: 1.0, brightness: 1.0, contrast: 1.0, saturation: 1.0
    });

    const videoFilter = `brightness(${config.brightness}) contrast(${config.contrast}) saturate(${config.saturation})`;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
            <video ref={camera.videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover z-0" style={{ transform: 'scaleX(-1)', filter: videoFilter }} />
            
            <SettingsPanel config={config} setConfig={setConfig} show={showSettings} onClose={() => setShowSettings(false)} />
            
            <div className="absolute top-6 left-6 z-30 font-mono text-4xl font-bold opacity-30 select-none">{formatTime(prompter.elapsedTime)}</div>
            
            <div className="flex-1 relative overflow-hidden z-10">
                <div ref={prompter.containerRef} className={`h-full overflow-y-auto no-scrollbar ${config.isMirrored ? 'scale-x-[-1]' : ''}`}>
                    <div className="py-[50vh] px-6 max-w-4xl mx-auto">
                        {segments.map((seg, i) => {
                            const active = prompter.elapsedTime >= prompter.timeMap[i].start && prompter.elapsedTime < prompter.timeMap[i].end;
                            return (
                                <div key={seg.id} ref={el => prompter.segmentRefs.current[i] = el} className="mb-10 text-center font-bold transition-all duration-300" style={{ fontSize: config.fontSize, opacity: active ? 1 : config.guideOpacity, transform: active ? 'scale(1)' : 'scale(0.95)' }}>
                                    {seg.text}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="absolute inset-0 pointer-events-none flex items-center z-20"><div className="w-full h-px bg-red-600/20" /></div>
            </div>

            <div className="bg-zinc-950/90 p-4 border-t border-zinc-900 flex items-center justify-center gap-6 z-50">
                <button onClick={onClose} className="p-3 bg-zinc-900 rounded-full text-zinc-500 hover:text-white">✕</button>
                <input type="range" min="0.1" max="2.5" step="0.1" value={prompter.speed} onChange={e => prompter.setSpeed(parseFloat(e.target.value))} className="w-24 accent-indigo-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                <button onClick={() => prompter.setIsPlaying(!prompter.isPlaying)} className={`w-14 h-14 rounded-full flex items-center justify-center text-xl ${prompter.isPlaying ? 'bg-indigo-600' : 'bg-green-600'}`}>{prompter.isPlaying ? '⏸' : '▶'}</button>
                <button onClick={() => { prompter.setIsPlaying(false); prompter.setElapsedTime(0); }} className="p-3 bg-zinc-900 rounded-full text-zinc-500">⏹</button>
                <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-full ${showSettings ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>⚙️</button>
                <button onClick={camera.handleRecord} className={`p-3 rounded-full ${camera.isRecording ? 'bg-red-600 text-white' : 'text-red-500'}`}>{camera.isRecording ? 'REC' : '●'}</button>
            </div>
        </div>
    );
};
