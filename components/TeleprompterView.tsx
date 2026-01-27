
import React, { useState } from 'react';
import { PromptConfig, ScriptSegment } from '../types';
import { useCamera } from '../hooks/useCamera';
import { useTeleprompter } from '../hooks/useTeleprompter';
import { SettingsPanel } from './SettingsPanel';

interface TeleprompterViewProps {
    segments: ScriptSegment[];
    onClose: () => void;
}

const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({ segments, onClose }) => {
    const camera = useCamera();
    const prompter = useTeleprompter(segments);
    const [showSettings, setShowSettings] = useState(false);
    const [config, setConfig] = useState<PromptConfig>({
        fontSize: 54, isMirrored: false, overlayColor: '#000000', guideOpacity: 0.2,
        showTimer: true, videoFilter: 'none', videoScale: 1.0, brightness: 1.0, contrast: 1.0, saturation: 1.0
    });

    const videoFilters = `brightness(${config.brightness}) contrast(${config.contrast}) saturate(${config.saturation})`;

    return (
        <div className={`fixed inset-0 z-50 flex flex-col bg-black text-white transition-colors ${camera.isCameraActive ? 'bg-black/40' : ''}`}>
            <video ref={camera.videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover z-0 ${camera.isCameraActive ? 'opacity-100' : 'opacity-0'}`} style={{ transform: `scaleX(-1) scale(${config.videoScale})`, filter: videoFilters }} />

            <SettingsPanel 
                config={config} setConfig={setConfig} 
                showSettings={showSettings} setShowSettings={setShowSettings} 
                isCameraActive={camera.isCameraActive} 
                cameraCapabilities={camera.cameraCapabilities}
                cameraSettings={camera.cameraSettings}
                applyCameraConstraint={camera.applyCameraConstraint}
            />

            {config.showTimer && (
                <div className="absolute top-6 left-6 z-30 font-mono text-4xl font-bold text-white/40 drop-shadow-md select-none">
                    {formatTime(prompter.elapsedTime)}
                </div>
            )}

            <div className="flex-1 relative overflow-hidden z-10">
                <div className="absolute inset-0 pointer-events-none z-20 flex items-center"><div className="w-full h-px bg-red-600/30"/></div>
                <div 
                    ref={prompter.containerRef} 
                    onWheel={prompter.handleUserInteraction} 
                    onTouchStart={prompter.handleUserInteraction} 
                    onMouseDown={prompter.handleUserInteraction}
                    onScroll={() => !prompter.isPlaying && prompter.syncTimeFromScroll()} 
                    className={`h-full overflow-y-auto relative no-scrollbar ${config.isMirrored ? 'scale-x-[-1]' : ''}`}
                >
                    <div className="py-[50vh] px-6 max-w-4xl mx-auto">
                        {segments.map((seg, idx) => {
                            const isActive = prompter.elapsedTime >= prompter.segmentTimeMap[idx].start && prompter.elapsedTime < prompter.segmentTimeMap[idx].end;
                            return (
                                <div 
                                    key={seg.id} 
                                    // Fix: Wrapped assignment in braces to ensure the ref callback returns void instead of the element.
                                    ref={el => { prompter.segmentRefs.current[idx] = el; }} 
                                    className="mb-10 font-bold leading-tight transition-all duration-300"
                                    style={{ 
                                        fontSize: config.fontSize + 'px', 
                                        opacity: isActive ? 1 : config.guideOpacity, 
                                        transform: isActive ? 'scale(1)' : 'scale(0.95)',
                                        textAlign: seg.textAlign || 'center'
                                    }}
                                    dir="auto"
                                >
                                    {seg.words.map((w, wi) => (
                                        <span 
                                            key={wi} 
                                            className={`mr-[0.2em] ${w.color || 'text-white'}`}
                                            dir="auto"
                                        >
                                            {w.text}
                                        </span>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-zinc-950/90 border-t border-zinc-900 px-4 py-4 z-50 flex items-center justify-center gap-6">
                <button onClick={onClose} className="p-3 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">✕</button>
                <input type="range" min="0.1" max="2.5" step="0.1" value={prompter.speedMultiplier} onChange={e => prompter.setSpeedMultiplier(parseFloat(e.target.value))} className="w-32 accent-indigo-600 h-1.5 bg-zinc-800 rounded-lg cursor-pointer" />
                <button onClick={prompter.handlePlayPause} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${prompter.isPlaying ? 'bg-indigo-600' : 'bg-green-600'}`}>
                    {prompter.isPlaying ? '⏸' : '▶'}
                </button>
                <button onClick={prompter.handleStop} className="p-3 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">⏹</button>
                <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-full ${showSettings ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>⚙️</button>
                <button onClick={camera.handleRecordClick} className={`p-3 rounded-full transition-colors ${camera.isRecording ? 'bg-red-600 text-white animate-pulse' : 'text-red-500'}`}>
                    {camera.isCameraActive ? (camera.isRecording ? 'REC' : '●') : '📷'}
                </button>
            </div>
        </div>
    );
};
