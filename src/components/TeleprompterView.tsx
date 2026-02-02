
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PromptConfig, ScriptSegment, SegmentWord } from '../../types';

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
    fontSize: 54,
    guideOpacity: 0.2,
    zoom: 1,
    exposure: 0
};

const STORAGE_KEY = 'teleprompter_config';

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({ segments, onClose }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);
    
    // Camera & Recording State
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [cameraCapabilities, setCameraCapabilities] = useState<MediaTrackCapabilities | null>(null);
    const [cameraSettings, setCameraSettings] = useState<MediaTrackSettings | null>(null);
    
    // Settings UI State
    const [showSettings, setShowSettings] = useState(false);
    const [settingsPos, setSettingsPos] = useState({ x: 20, y: 80 }); 
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Initialize config from localStorage or defaults
    const [config, setConfig] = useState<PromptConfig>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved config", e);
            }
        }
        return {
            fontSize: DEFAULTS.fontSize,
            isMirrored: false,
            overlayColor: '#000000',
            guideOpacity: DEFAULTS.guideOpacity,
            showTimer: true,
            videoFilter: 'none',
            videoScale: 1.0,
            brightness: 1.0,
            contrast: 1.0,
            saturation: 1.0
        };
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number | undefined>(undefined);
    const lastTimeRef = useRef<number | undefined>(undefined);
    const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
    const isManualScroll = useRef(false);

    // Media Refs
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

    // Persistent storage effect
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }, [config]);

    // Drag Logic
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setDragOffset({ x: clientX - settingsPos.x, y: clientY - settingsPos.y });
    };

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
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


    // --- Camera Logic ---
    const toggleCamera = async () => {
        if (isCameraActive) {
            const stream = videoRef.current?.srcObject as MediaStream;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (videoRef.current) videoRef.current.srcObject = null;
            setIsCameraActive(false);
            setCameraCapabilities(null);
            if (isRecording) stopRecording();
        } else {
            try {
                const constraints: MediaStreamConstraints = { 
                    video: { 
                        facingMode: 'user',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }, 
                    audio: true 
                };
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsCameraActive(true);
                    
                    const track = stream.getVideoTracks()[0];
                    if (track.getCapabilities) {
                        setCameraCapabilities(track.getCapabilities());
                        setCameraSettings(track.getSettings());
                    } else {
                        setCameraCapabilities({} as any); 
                    }
                }
            } catch (error) {
                console.error("Camera access error:", error);
                alert("Could not access camera. Please allow permissions.");
            }
        }
    };

    const applyCameraConstraint = async (constraint: string, value: any) => {
        const stream = videoRef.current?.srcObject as MediaStream;
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        
        try {
            await track.applyConstraints({
                advanced: [{ [constraint]: value }]
            });
            setCameraSettings(track.getSettings());
        } catch (e) {
            console.error("Failed to apply constraint", e);
        }
    };

    const handleRecordClick = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            if (!isCameraActive) {
                await toggleCamera();
            } else {
                startRecording();
            }
        }
    };

    const handleSettingsClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isCameraActive) {
             await toggleCamera();
        }
        setShowSettings(prev => !prev);
    };

    const startRecording = () => {
        if (!isCameraActive || !videoRef.current?.srcObject) {
            alert("Please enable the camera first.");
            return;
        }
        
        chunksRef.current = [];
        const stream = videoRef.current.srcObject as MediaStream;
        
        try {
            const mimeTypes = [
                'video/mp4; codecs=avc1,opus',
                'video/mp4',
                'video/webm; codecs=h264,opus', 
                'video/webm; codecs=vp9,opus',
                'video/webm'
            ];
            let selectedMimeType = '';
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) { selectedMimeType = type; break; }
            }
            if (!selectedMimeType) selectedMimeType = 'video/webm';

            const recorder = new MediaRecorder(stream, { mimeType: selectedMimeType, videoBitsPerSecond: 5000000 });
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                const isMp4 = selectedMimeType.includes('mp4');
                const type = selectedMimeType.split(';')[0];
                const ext = isMp4 ? 'mp4' : 'webm';
                const blob = new Blob(chunksRef.current, { type });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `teleprompter-${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.${ext}`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
            };
            recorder.start(1000);
            setIsRecording(true);
            mediaRecorderRef.current = recorder;
        } catch (e) {
            console.error("Recorder error:", e);
            alert("Failed to start recording.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    useEffect(() => {
        return () => {
            if (isCameraActive) {
                const stream = videoRef.current?.srcObject as MediaStream;
                stream?.getTracks().forEach(t => t.stop());
            }
        };
    }, [isCameraActive]);


    // --- Teleprompter Logic ---

    const syncTimeFromScroll = () => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const center = container.scrollTop + (container.clientHeight / 2);
        
        let activeIdx = -1;
        for (let i = 0; i < segmentRefs.current.length; i++) {
            const el = segmentRefs.current[i];
            if (el && (el.offsetTop <= center && el.offsetTop + el.clientHeight >= center)) {
                activeIdx = i;
                break;
            }
            if (el && el.offsetTop > center) {
                activeIdx = i > 0 ? i - 1 : 0;
                break;
            }
        }
        
        if (activeIdx === -1) {
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
                setElapsedTime(totalDuration);
                return;
            }
            if (container.scrollTop < 100) {
                 setElapsedTime(0);
                 return;
            }
            activeIdx = segments.length - 1;
        }

        const el = segmentRefs.current[activeIdx];
        const segMap = segmentTimeMap[activeIdx];

        if (el && segMap) {
            const dist = center - el.offsetTop;
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
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, speedMultiplier, totalDuration]);

    useEffect(() => {
        if (!isPlaying || isManualScroll.current || !containerRef.current) return;

        const activeSegmentIndex = segmentTimeMap.findIndex(
            map => elapsedTime >= map.start && elapsedTime < map.end
        );

        if (activeSegmentIndex !== -1) {
            const activeEl = segmentRefs.current[activeSegmentIndex];
            if (activeEl) {
                const containerHeight = containerRef.current.clientHeight;
                const elTop = activeEl.offsetTop;
                const elHeight = activeEl.clientHeight;
                const segmentData = segmentTimeMap[activeSegmentIndex];
                const segmentProgress = (elapsedTime - segmentData.start) / (segmentData.end - segmentData.start);
                
                const targetScroll = elTop - (containerHeight / 2) + (elHeight / 2);
                const scrollOffset = targetScroll + (elHeight * segmentProgress) - (elHeight/2);

                containerRef.current.scrollTo({ top: scrollOffset, behavior: 'auto' });
            }
        } else if (elapsedTime === 0) {
            const firstEl = segmentRefs.current[0];
            if (firstEl && containerRef.current) {
                 const containerHeight = containerRef.current.clientHeight;
                 const targetScroll = firstEl.offsetTop - (containerHeight / 2) + (firstEl.clientHeight / 2);
                 containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }
        }
    }, [elapsedTime, segmentTimeMap, isPlaying]);

    const handlePlayPause = () => {
        if (!isPlaying && isManualScroll.current) {
            syncTimeFromScroll();
            isManualScroll.current = false;
        }
        setIsPlaying(!isPlaying);
        lastTimeRef.current = undefined;
    };

    const handleStop = () => {
        setIsPlaying(false);
        setElapsedTime(0);
        isManualScroll.current = false;
        lastTimeRef.current = undefined;
    };

    const handleUserInteraction = () => {
        if (isPlaying) setIsPlaying(false);
        isManualScroll.current = true;
    };

    const handleScroll = () => {
        if (!isPlaying) {
            syncTimeFromScroll();
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInteractive = ['BUTTON', 'INPUT'].includes(target.tagName) || target.closest('button');
        if (isInteractive) return;
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.log(e));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    const hasCameraControls = cameraCapabilities && ((cameraCapabilities as any).torch || (cameraCapabilities as any).zoom || (cameraCapabilities as any).exposureCompensation);

    const videoFilters = [
        config.videoFilter !== 'none' ? FILTER_STYLES[config.videoFilter].filter : '',
        `brightness(${config.brightness})`,
        `contrast(${config.contrast})`,
        `saturate(${config.saturation})`
    ].filter(Boolean).join(' ');

    return (
        <div 
            className={`fixed inset-0 z-50 flex flex-col overflow-hidden transition-colors duration-500 ${isCameraActive ? 'bg-black/30' : 'bg-black'} text-white`}
            onDoubleClick={handleDoubleClick}
            title="Double-click empty area for Fullscreen"
        >
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
                style={{ 
                    transform: `scaleX(-1) scale(${config.videoScale})`, 
                    filter: videoFilters 
                }} 
            />

            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-40 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                     {isCameraActive && !isRecording && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded" title="Camera is ready (Preview Mode)">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"/>
                            <span className="text-[10px] font-bold text-yellow-100 tracking-wider">PREVIEW</span>
                        </div>
                     )}
                     {isRecording && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-red-600/20 border border-red-500/50 rounded animate-pulse" title="Recording in progress">
                            <div className="w-2 h-2 bg-red-500 rounded-full"/>
                            <span className="text-[10px] font-bold text-red-100 tracking-wider">REC</span>
                        </div>
                     )}
                </div>
            </div>
            
            {showSettings && (
                <div 
                    className="absolute z-50 bg-zinc-950/95 backdrop-blur border border-zinc-800 p-4 rounded-xl shadow-2xl w-72 flex flex-col gap-5 text-xs overflow-y-auto max-h-[80vh]"
                    style={{ left: settingsPos.x, top: settingsPos.y, cursor: isDragging ? 'grabbing' : 'auto' }}
                    onDoubleClick={e => e.stopPropagation()}
                >
                    <div 
                        className="flex items-center justify-between border-b border-zinc-800 pb-2 cursor-grab active:cursor-grabbing"
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                    >
                        <div className="flex items-center gap-2">
                             <span className="font-bold text-white text-sm">Settings</span>
                             <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </div>
                        <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white p-1" title="Close">✕</button>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Text Display</h3>
                        
                        <div className="flex flex-col gap-1">
                             <div className="flex justify-between text-zinc-400">
                                 <span>Font Size</span>
                                 <span>{config.fontSize}px</span>
                             </div>
                             <input type="range" min="20" max="150" step="2" value={config.fontSize} onChange={(e) => setConfig({...config, fontSize: parseInt(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                        </div>

                        <div className="flex flex-col gap-1">
                             <div className="flex justify-between text-zinc-400">
                                 <span>Ghost Opacity</span>
                                 <span>{Math.round(config.guideOpacity * 100)}%</span>
                             </div>
                             <input type="range" min="0" max="1" step="0.1" value={config.guideOpacity} onChange={(e) => setConfig({...config, guideOpacity: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Mirror Text</span>
                             <button onClick={() => setConfig((c: PromptConfig) => ({...c, isMirrored: !c.isMirrored}))} className={`px-3 py-1 rounded-full ${config.isMirrored ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                {config.isMirrored ? 'ON' : 'OFF'}
                            </button>
                        </div>
                         <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Show Timer</span>
                             <button onClick={() => setConfig((c: PromptConfig) => ({...c, showTimer: !c.showTimer}))} className={`px-3 py-1 rounded-full ${config.showTimer ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                {config.showTimer ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-zinc-800">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Advanced Video</h3>
                            <button onClick={() => setConfig((c: PromptConfig) => ({...c, videoScale: 1, brightness: 1, contrast: 1, saturation: 1}))} className="text-xs text-indigo-400 hover:text-white" title="Reset video settings">Reset</button>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                             <div className="flex justify-between text-zinc-400">
                                 <span>Scale (Zoom)</span>
                                 <span>{config.videoScale.toFixed(2)}x</span>
                             </div>
                             <input type="range" min="0.5" max="2.0" step="0.05" value={config.videoScale} onChange={(e) => setConfig({...config, videoScale: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                        </div>
                        <div className="flex flex-col gap-1">
                             <div className="flex justify-between text-zinc-400">
                                 <span>Brightness</span>
                                 <span>{Math.round(config.brightness * 100)}%</span>
                             </div>
                             <input type="range" min="0.5" max="2.0" step="0.1" value={config.brightness} onChange={(e) => setConfig({...config, brightness: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                        </div>
                        <div className="flex flex-col gap-1">
                             <div className="flex justify-between text-zinc-400">
                                 <span>Contrast</span>
                                 <span>{Math.round(config.contrast * 100)}%</span>
                             </div>
                             <input type="range" min="0.5" max="2.0" step="0.1" value={config.contrast} onChange={(e) => setConfig({...config, contrast: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                        </div>
                        <div className="flex flex-col gap-1">
                             <div className="flex justify-between text-zinc-400">
                                 <span>Saturation</span>
                                 <span>{Math.round(config.saturation * 100)}%</span>
                             </div>
                             <input type="range" min="0" max="2.0" step="0.1" value={config.saturation} onChange={(e) => setConfig({...config, saturation: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                        </div>
                    </div>

                    {isCameraActive && (
                        <div className="space-y-3 pt-2 border-t border-zinc-800">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Hardware Controls</h3>
                            {!hasCameraControls && <p className="text-zinc-600 italic">No hardware controls available.</p>}
                            {cameraCapabilities && (cameraCapabilities as any).torch && (
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-400">Flash</span>
                                    <button onClick={() => applyCameraConstraint('torch', !(cameraSettings as any)?.torch)} className={`px-3 py-1 rounded-full ${(cameraSettings as any)?.torch ? 'bg-yellow-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                        {(cameraSettings as any)?.torch ? 'ON' : 'OFF'}
                                    </button>
                                </div>
                            )}
                            {cameraCapabilities && (cameraCapabilities as any).zoom && (
                                 <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Optical Zoom</span>
                                        <span>{(cameraSettings as any)?.zoom?.toFixed(1)}x</span>
                                    </div>
                                    <input type="range" min={(cameraCapabilities as any).zoom.min} max={(cameraCapabilities as any).zoom.max} step={0.1} value={(cameraSettings as any)?.zoom || 1} onChange={(e) => applyCameraConstraint('zoom', parseFloat(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-zinc-700 rounded-lg appearance-none"/>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {config.showTimer && (
                <div className={`absolute top-6 left-6 z-30 pointer-events-none select-none transition-transform ${config.isMirrored ? 'scale-x-[-1]' : ''}`}>
                    <div className="font-mono text-4xl sm:text-5xl font-bold text-white/30 tracking-wider tabular-nums drop-shadow-md">
                        {formatTime(elapsedTime)}
                    </div>
                </div>
            )}

            <div className="flex-1 relative overflow-hidden z-10">
                <div className="absolute inset-0 pointer-events-none z-20 flex items-center"><div className="w-full h-px bg-red-600/40"/></div>
                <div ref={containerRef} onWheel={handleUserInteraction} onTouchStart={handleUserInteraction} onMouseDown={handleUserInteraction} onScroll={handleScroll} className={`h-full overflow-y-auto relative ${config.isMirrored ? 'scale-y-[-1] scale-x-[-1]' : ''} touch-pan-y no-scrollbar`}>
                    <div ref={contentRef} className="py-[50vh] px-6 max-w-4xl mx-auto">
                        {segments.map((seg, idx) => {
                            const isActive = elapsedTime >= segmentTimeMap[idx].start && elapsedTime < segmentTimeMap[idx].end;
                            return (
                                <div key={seg.id} ref={(el) => { segmentRefs.current[idx] = el; }} 
                                    className={`mb-10 font-bold text-center leading-[1.1] transition-all duration-300 drop-shadow-lg`}
                                    style={{ 
                                        fontSize: config.fontSize + 'px', 
                                        textShadow: isCameraActive ? '0 2px 4px rgba(0,0,0,0.8)' : 'none',
                                        opacity: isActive ? 1 : config.guideOpacity,
                                        filter: isActive ? 'none' : 'blur(0.5px)',
                                        transform: isActive ? 'scale(1)' : 'scale(0.98)'
                                    }} dir="auto">
                                    {seg.words.map((w: SegmentWord, wi: number) => (
                                        <span key={wi} className={`inline-block mr-[0.2em] ${w.color || 'text-white'}`}>{w.text}</span>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-zinc-950/90 backdrop-blur border-t border-zinc-900 px-4 py-4 pb-8 sm:pb-4 z-50 transition-colors" onDoubleClick={e => e.stopPropagation()}>
                         <div className="max-w-2xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                             <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                                <button onClick={onClose} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white group shrink-0" title="Exit">
                                    <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-zinc-800 border border-zinc-800">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                                    </div>
                                </button>
                                <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50 flex-1 sm:hidden">
                                     <span className="text-[10px] font-bold text-zinc-500 uppercase">Speed</span>
                                     <input type="range" min="0.1" max="2.5" step="0.1" value={speedMultiplier} onChange={e => setSpeedMultiplier(parseFloat(e.target.value))} className="flex-1 accent-indigo-600 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"/>
                                     <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">{speedMultiplier.toFixed(1)}x</span>
                                </div>
                             </div>

                             <div className="flex items-center justify-center gap-4 sm:gap-6 w-full sm:w-auto">
                                <div className="hidden sm:flex items-center gap-4 w-48">
                                     <input type="range" min="0.1" max="2.5" step="0.1" value={speedMultiplier} onChange={e => setSpeedMultiplier(parseFloat(e.target.value))} className="flex-1 accent-indigo-600 h-1.5 bg-zinc-800 rounded-lg cursor-pointer" title="Playback Speed"/>
                                     <span className="text-[10px] font-mono text-zinc-500 w-8">{speedMultiplier.toFixed(1)}x</span>
                                </div>
                                <div className="flex items-center justify-center gap-3 sm:gap-5 bg-zinc-900/50 sm:bg-transparent p-2 sm:p-0 rounded-2xl border border-zinc-800/50 sm:border-none">
                                    <button onClick={() => {setElapsedTime(Math.max(0, elapsedTime-5000))}} className="p-2 text-zinc-500 hover:text-white" title="Rewind 5s">⏪</button>
                                    <button onClick={handlePlayPause} className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${isPlaying ? 'bg-indigo-600' : 'bg-green-600'}`} title="Play/Pause">
                                        {isPlaying ? '⏸' : '▶'}
                                    </button>
                                    <button onClick={handleStop} className="p-2 text-zinc-500 hover:text-white group" title="Stop & Reset"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-[1px]"/></button>
                                    <div className="w-px h-6 sm:h-8 bg-zinc-800 mx-1"/>
                                    <button onClick={handleSettingsClick} className={`p-2 sm:p-3 rounded-full transition-all active:scale-95 ${showSettings ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white'}`} title="Settings">⚙️</button>
                                    <button onClick={handleRecordClick} className={`p-2 sm:p-3 rounded-full transition-all active:scale-95 ${!isCameraActive ? 'bg-zinc-800 text-zinc-500 hover:text-red-500' : ''} ${isRecording ? 'bg-red-500/20 text-red-500 ring-2 ring-red-500' : (isCameraActive ? 'bg-zinc-900 text-red-500 hover:bg-zinc-800' : '')}`} title={isCameraActive ? "Record" : "Turn on Camera & Record"}>
                                        <div className={`w-4 h-4 bg-current rounded-${isRecording ? 'sm' : 'full'} transition-all duration-300`}/>
                                    </button>
                                </div>
                             </div>
                         </div>
                    </div>
                </div>
            );
};
