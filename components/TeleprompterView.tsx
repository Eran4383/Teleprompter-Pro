import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PromptConfig, ScriptSegment } from '../types';

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

const FILTER_STYLES: Record<string, { filter: string }> = {
    warm: { filter: 'sepia(0.3) saturate(1.4) contrast(1.1)' },
    cool: { filter: 'hue-rotate(180deg) saturate(0.8) contrast(1.1)' },
    bw: { filter: 'grayscale(1) contrast(1.2)' },
};

const DEFAULTS = {
    fontSize: 64,
    guideOpacity: 0.2,
    guideOffset: 50,
};

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({ segments, onClose }) => {
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
    
    const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [cameraCapabilities, setCameraCapabilities] = useState<MediaTrackCapabilities | null>(null);
    const [cameraSettings, setCameraSettings] = useState<MediaTrackSettings | null>(null);
    
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [settingsPos, setSettingsPos] = useState({ x: 20, y: 80 }); 
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const [config, setConfig] = useState<PromptConfig>(() => {
        const fallbackConfig: PromptConfig = {
            fontSize: DEFAULTS.fontSize,
            isMirrored: false,
            overlayColor: '#000000',
            guideOpacity: DEFAULTS.guideOpacity,
            showTimer: true,
            videoFilter: 'none',
            videoScale: 1.0,
            brightness: 1.0,
            contrast: 1.0,
            saturation: 1.0,
            guideOffset: DEFAULTS.guideOffset,
            primaryColor: '#ffffff',
            ghostColor: '#52525b'
        };

        try {
            const saved = window.localStorage.getItem('prompter_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...fallbackConfig, ...parsed };
            }
        } catch (e) {
            console.error("Failed to load prompter config", e);
        }
        return fallbackConfig;
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    
    const lastTimeRef = useRef<number | undefined>(undefined);
    const requestRef = useRef<number | undefined>(undefined);

    const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
    const isManualScroll = useRef<boolean>(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const totalDuration = useMemo(() => segments.reduce((acc, seg) => acc + seg.duration, 0), [segments]);

    const segmentTimeMap = useMemo(() => {
        let acc = 0;
        return segments.map(s => {
            const start = acc;
            acc += s.duration;
            return { start, end: acc, id: s.id, duration: s.duration };
        });
    }, [segments]);

    useEffect(() => {
        localStorage.setItem('prompter_config', JSON.stringify(config));
    }, [config]);

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
        setDragOffset({ x: clientX - settingsPos.x, y: clientY - settingsPos.y });
    };

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
        setSettingsPos({ x: clientX - dragOffset.x, y: clientY - dragOffset.y });
    };

    const handleDragEnd = () => setIsDragging(false);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
        } else {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, dragOffset]);

    const toggleCamera = async () => {
        if (isCameraActive) {
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
            if (videoRef.current) videoRef.current.srcObject = null;
            setIsCameraActive(false);
            setCameraCapabilities(null);
            if (isRecording) stopRecording();
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsCameraActive(true);
                    const track = stream.getVideoTracks()[0];
                    if (track.getCapabilities) {
                        setCameraCapabilities(track.getCapabilities());
                        setCameraSettings(track.getSettings());
                    }
                }
            } catch (error) { console.error(error); }
        }
    };

    const startRecording = () => {
        if (!isCameraActive || !videoRef.current?.srcObject) return;
        chunksRef.current = [];
        const recorder = new MediaRecorder(videoRef.current.srcObject as MediaStream);
        recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recording-${Date.now()}.webm`;
            a.click();
        };
        recorder.start();
        setIsRecording(true);
        mediaRecorderRef.current = recorder;
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const syncTimeFromScroll = () => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const focalPoint = container.scrollTop + (container.clientHeight * (config.guideOffset / 100));
        
        let activeIdx = -1;
        for (let i = 0; i < segmentRefs.current.length; i++) {
            const el = segmentRefs.current[i];
            if (el && (el.offsetTop <= focalPoint && el.offsetTop + el.clientHeight >= focalPoint)) {
                activeIdx = i; break;
            }
        }
        
        if (activeIdx !== -1) {
            const el = segmentRefs.current[activeIdx]!;
            const segMap = segmentTimeMap[activeIdx];
            const dist = focalPoint - el.offsetTop;
            const ratio = Math.max(0, Math.min(1, dist / el.clientHeight));
            setElapsedTime(segMap.start + (segMap.duration * ratio));
        }
    };

    const animate = (time: number) => {
        if (lastTimeRef.current !== undefined && isPlaying) {
            const deltaTime = time - lastTimeRef.current;
            setElapsedTime(prev => {
                const next = prev + (deltaTime * speedMultiplier);
                return next >= totalDuration ? totalDuration : next;
            });
        }
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [isPlaying, speedMultiplier, totalDuration]);

    useEffect(() => {
        if (!isPlaying || isManualScroll.current || !containerRef.current) return;
        const activeIdx = segmentTimeMap.findIndex(m => elapsedTime >= m.start && elapsedTime < m.end);
        if (activeIdx !== -1) {
            const el = segmentRefs.current[activeIdx];
            if (el) {
                const containerHeight = containerRef.current.clientHeight;
                const m = segmentTimeMap[activeIdx];
                const progress = (elapsedTime - m.start) / m.duration;
                const scrollOffset = (el.offsetTop + el.clientHeight * progress) - (containerHeight * config.guideOffset / 100);
                containerRef.current.scrollTo({ top: scrollOffset, behavior: 'auto' });
            }
        }
    }, [elapsedTime, isPlaying, config.guideOffset]);

    const handlePlayPause = () => {
        if (!isPlaying && isManualScroll.current) {
            syncTimeFromScroll();
            isManualScroll.current = false;
        }
        setIsPlaying(!isPlaying);
        lastTimeRef.current = undefined;
    };

    const handleUserInteraction = () => {
        isManualScroll.current = true;
        setIsPlaying(false);
    };

    const videoFilters = [
        config.videoFilter !== 'none' ? FILTER_STYLES[config.videoFilter].filter : '',
        `brightness(${config.brightness}) contrast(${config.contrast}) saturate(${config.saturation})`
    ].join(' ');

    return (
        <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden transition-colors ${isCameraActive ? 'bg-black/40' : 'bg-black'} text-white`}>
            <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover z-0 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`} style={{ transform: `scaleX(-1) scale(${config.videoScale})`, filter: videoFilters }} />
            
            {showSettings && (
                <div 
                    className="absolute z-50 bg-zinc-950/95 backdrop-blur border border-zinc-800 p-4 rounded-xl shadow-2xl w-72 flex flex-col gap-5 text-xs overflow-y-auto max-h-[80vh]"
                    style={{ left: settingsPos.x, top: settingsPos.y, cursor: isDragging ? 'grabbing' : 'auto' }}
                >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 cursor-grab active:cursor-grabbing" onMouseDown={handleDragStart} onTouchStart={handleDragStart}>
                        <span className="font-bold text-white text-sm">Settings</span>
                        <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">✕</button>
                    </div>

                    <div className="space-y-4">
                        <section className="space-y-2">
                            <div className="flex justify-between text-zinc-400"><span>Font Size</span><span>{config.fontSize}px</span></div>
                            <input type="range" min="20" max="150" value={config.fontSize} onChange={(e) => setConfig({...config, fontSize: parseInt(e.target.value)})} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none accent-indigo-500"/>
                        </section>
                        <section className="space-y-2">
                            <div className="flex justify-between text-zinc-400"><span>Guide Position</span><span>{config.guideOffset}%</span></div>
                            <input type="range" min="10" max="90" value={config.guideOffset} onChange={(e) => setConfig({...config, guideOffset: parseInt(e.target.value)})} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none accent-indigo-500"/>
                        </section>
                        <section className="flex items-center justify-between">
                            <span className="text-zinc-400">Mirror Text</span>
                            <button onClick={() => setConfig(c => ({...c, isMirrored: !c.isMirrored}))} className={`px-3 py-1 rounded-full ${config.isMirrored ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{config.isMirrored ? 'ON' : 'OFF'}</button>
                        </section>
                        <section className="pt-2 border-t border-zinc-800 space-y-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-zinc-400"><span>Zoom</span><span>{config.videoScale.toFixed(2)}x</span></div>
                                <input type="range" min="0.5" max="2.0" step="0.05" value={config.videoScale} onChange={(e) => setConfig({...config, videoScale: parseFloat(e.target.value)})} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none accent-indigo-500"/>
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {config.showTimer && (
                <div className={`absolute top-6 left-6 z-30 font-mono text-4xl font-bold text-white/30 tracking-wider transition-transform ${config.isMirrored ? 'scale-x-[-1]' : ''}`}>
                    {formatTime(elapsedTime)}
                </div>
            )}

            <div className="flex-1 relative overflow-hidden z-10">
                <div className="absolute inset-x-0 pointer-events-none z-20 flex items-center transition-all duration-300" style={{ top: `${config.guideOffset}%` }}>
                    <div className="w-full h-px bg-red-600/40 shadow-[0_0_10px_rgba(220,38,38,0.5)]"/>
                </div>
                <div ref={containerRef} onWheel={handleUserInteraction} onTouchStart={handleUserInteraction} onMouseDown={handleUserInteraction} onScroll={() => !isPlaying && syncTimeFromScroll()} className={`h-full overflow-y-auto relative no-scrollbar ${config.isMirrored ? 'scale-x-[-1]' : ''}`}>
                    <div className="py-[100vh] px-6 max-w-4xl mx-auto">
                        {segments.map((seg, idx) => {
                            const isActive = elapsedTime >= segmentTimeMap[idx].start && elapsedTime < segmentTimeMap[idx].end;
                            return (
                                <div key={seg.id} ref={el => { segmentRefs.current[idx] = el; }} className="mb-14 font-black text-center leading-tight transition-all duration-500" dir="auto" style={{ fontSize: config.fontSize + 'px', opacity: isActive ? 1 : config.guideOpacity, color: isActive ? config.primaryColor : config.ghostColor, transform: isActive ? 'scale(1.05)' : 'scale(0.95)' }}>
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
                    <input type="range" min="0.1" max="2.5" step="0.1" value={speedMultiplier} onChange={e => setSpeedMultiplier(parseFloat(e.target.value))} className="w-32 accent-indigo-600 h-1.5 bg-zinc-800 rounded-lg cursor-pointer" />
                </div>
                <button onClick={handlePlayPause} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${isPlaying ? 'bg-indigo-600' : 'bg-green-600'}`}>
                    {isPlaying ? '⏸' : '▶'}
                </button>
                <button onClick={() => { setIsPlaying(false); setElapsedTime(0); }} className="p-3 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">⏹</button>
                <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-full transition-colors ${showSettings ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}>⚙️</button>
                <button onClick={isRecording ? stopRecording : (isCameraActive ? startRecording : toggleCamera)} className={`p-3 rounded-full transition-colors ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-900 text-red-500 hover:text-red-400'}`}>
                    {isRecording ? 'REC' : (isCameraActive ? '●' : '📷')}
                </button>
            </div>
        </div>
    );
};