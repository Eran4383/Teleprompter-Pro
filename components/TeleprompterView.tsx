
import React, { useState, useEffect } from 'react';
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

const DEFAULT_CONFIG: PromptConfig = {
    fontSize: 64, 
    isMirrored: false, 
    overlayColor: '#000000', 
    guideOpacity: 0.2,
    showTimer: true, 
    videoFilter: 'none', 
    videoScale: 1.0, 
    brightness: 1.0, 
    contrast: 1.0, 
    saturation: 1.0,
    primaryColor: '#ffffff',
    ghostColor: '#52525b',
    guideOffset: 50
};

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({ segments, onClose }) => {
    // Persistence: Load from localStorage
    const [config, setConfig] = useState<PromptConfig>(() => {
        const saved = localStorage.getItem('prompter_config');
        return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    });

    const camera = useCamera();
    // Pass guideOffset to the hook
    const prompter = useTeleprompter(segments, config.guideOffset);
    const [showSettings, setShowSettings] = useState(false);

    // Persistence: Save to localStorage
    useEffect(() => {
        localStorage.setItem('prompter_config', JSON.stringify(config));
    }, [config]);

    const videoFilters = `brightness(${config.brightness}) contrast(${config.contrast}) saturate(${config.saturation}) grayscale(100%)`;

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
                <div className="absolute top-6 left-6 z-30 font-mono text-4xl font-bold text-white/20 drop-shadow-md select-none">
                    {formatTime(prompter.elapsedTime)}
                </div>
            )}

            <div className="flex-1 relative overflow-hidden z-10">
                {/* Dynamic Guide Line */}
                <div 
                    className="absolute inset-x-0 pointer-events-none z-20 flex items-center transition-all duration-300"
                    style={{ top: `${config.guideOffset}%` }}
                >
                    <div className="w-full h-[2px] bg-red-600/50 shadow-[0_0_15px_rgba(220,38,38,0.5)]"/>
                </div>
                
                <div 
                    ref={prompter.containerRef} 
                    onWheel={prompter.handleUserInteraction} 
                    onTouchStart={prompter.handleUserInteraction} 
                    onMouseDown={prompter.handleUserInteraction}
                    onScroll={() => !prompter.isPlaying && prompter.syncTimeFromScroll()} 
                    className={`h-full overflow-y-auto relative no-scrollbar ${config.isMirrored ? 'scale-x-[-1]' : ''}`}
                >
                    <div className="py-[100vh] px-6 max-w-4xl mx-auto">
                        {segments.map((seg, idx) => {
                            const isActive = prompter.elapsedTime >= prompter.segmentTimeMap[idx].start && prompter.elapsedTime < prompter.segmentTimeMap[idx].end;
                            return (
                                <div 
                                    key={seg.id} 
                                    ref={el => { prompter.segmentRefs.current[idx] = el; }} 
                                    className="mb-14 font-black tracking-tight leading-tight transition-all duration-500"
                                    style={{ 
                                        fontSize: config.fontSize + 'px', 
                                        color: isActive ? config.primaryColor : config.ghostColor,
                                        opacity: isActive ? 1 : config.guideOpacity, 
                                        transform: isActive ? 'scale(1.05)' : 'scale(0.95)',
                                        textAlign: seg.textAlign || 'center',
                                        filter: isActive ? `drop-shadow(0 0 10px ${config.primaryColor}40)` : 'none'
                                    }}
                                    dir="auto"
                                >
                                    {seg.text}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-zinc-950/95 border-t border-zinc-900 px-4 py-4 z-50 flex items-center justify-center gap-6 backdrop-blur-xl">
                <button onClick={onClose} className="p-3 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">✕</button>
                <div className="flex flex-col items-center">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 mb-1">Speed</span>
                    <input type="range" min="0.1" max="2.5" step="0.1" value={prompter.speedMultiplier} onChange={e => prompter.setSpeedMultiplier(parseFloat(e.target.value))} className="w-32 accent-indigo-600 h-1.5 bg-zinc-800 rounded-lg cursor-pointer" />
                </div>
                <button onClick={prompter.handlePlayPause} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${prompter.isPlaying ? 'bg-indigo-600' : 'bg-green-600'}`}>
                    {prompter.isPlaying ? '⏸' : '▶'}
                </button>
                <button onClick={prompter.handleStop} className="p-3 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">⏹</button>
                <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-full transition-colors ${showSettings ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}>⚙️</button>
                <button onClick={camera.handleRecordClick} className={`p-3 rounded-full transition-colors ${camera.isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-900 text-red-500 hover:text-red-400'}`}>
                    {camera.isCameraActive ? (camera.isRecording ? 'REC' : '●') : '📷'}
                </button>
            </div>
        </div>
    );
};
