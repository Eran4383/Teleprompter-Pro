import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PromptConfig, ScriptSegment, VideoFilterType } from '../types';

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

const FILTER_STYLES: Record<VideoFilterType, React.CSSProperties> = {
    none: {},
    warm: { filter: 'sepia(0.4) saturate(1.2)' },
    cool: { filter: 'hue-rotate(180deg) saturate(0.8) contrast(1.1)' },
    bw: { filter: 'grayscale(1)' }
};

const DEFAULTS = {
    fontSize: 54,
    guideOpacity: 0.2,
    zoom: 1,
    exposure: 0
};

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
    const [settingsPos, setSettingsPos] = useState({ x: 20, y: 80 }); // Initial Position
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const [config, setConfig] = useState<PromptConfig>({
        fontSize: DEFAULTS.fontSize,
        isMirrored: false,
        overlayColor: '#000000',
        guideOpacity: DEFAULTS.guideOpacity,
        showTimer: true,
        videoFilter: 'none'
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>();
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

    // --- Drag Logic ---
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        // Calculate the difference between cursor/finger and the element's top-left corner
        setDragOffset({
            x: clientX - settingsPos.x,
            y: clientY - settingsPos.y
        });
    };

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        e.preventDefault(); // Prevent scrolling while dragging
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        
        setSettingsPos({
            x: clientX - dragOffset.x,
            y: clientY - dragOffset.y
        });
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

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
                        setCameraCapabilities({}); 
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
            // Aggressive priority list for Chrome MP4 support
            // Chrome ~109+ supports video/mp4 with avc1
            const mimeTypes = [
                'video/mp4; codecs=avc1,opus',
                'video/mp4',
                'video/webm; codecs=h264,opus', // H.264 inside WebM
                'video/webm; codecs=vp9,opus',
                'video/webm'
            ];

            let selectedMimeType = '';
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    selectedMimeType = type;
                    break;
                }
            }

            // Fallback if loop fails (rare)
            if (!selectedMimeType) selectedMimeType = 'video/webm';

            console.log(`Recording using MIME type: ${selectedMimeType}`);
            
            const recorder = new MediaRecorder(stream, { 
                mimeType: selectedMimeType,
                videoBitsPerSecond: 5000000 // 5 Mbps for quality
            });
            
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            
            recorder.onstop = () => {
                // Determine true extension based on what was actually supported
                const isMp4 = selectedMimeType.includes('mp4');
                const type = selectedMimeType.split(';')[0]; // strip codecs for Blob type
                const ext = isMp4 ? 'mp4' : 'webm';
                
                const blob = new Blob(chunksRef.current, { type });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `teleprompter-${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.${ext}`;
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
            };

            recorder.start(1000); // Collect chunks every second to avoid memory spikes
            setIsRecording(true);
            mediaRecorderRef.current = recorder;
        } catch (e) {
            console.error("Recorder error:", e);
            alert("Failed to start recording. Browser might not support the requested video format.");
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
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const toggleMirror = () => setConfig(c => ({ ...c, isMirrored: !c.isMirrored }));

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.code === 'Space') { e.preventDefault(); handlePlayPause(); }
            if (e.code === 'ArrowUp') setConfig(c => ({...c, fontSize: c.fontSize + 2}));
            if (e.code === 'ArrowDown') setConfig(c => ({...c, fontSize: Math.max(10, c.fontSize - 2)}));
            if (e.code === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isPlaying, onClose]);

    const hasCameraControls = cameraCapabilities && ((cameraCapabilities as any).torch || (cameraCapabilities as any).zoom || (cameraCapabilities as any).exposureCompensation);

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
                    transform: 'scaleX(-1)', 
                    ...FILTER_STYLES[config.videoFilter] 
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
            
            {/* DRAGGABLE Settings Panel */}
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
                                 <div className="flex items-center gap-2">
                                     <span>{config.fontSize}px</span>
                                     <button onClick={() => setConfig(c => ({...c, fontSize: DEFAULTS.fontSize}))} className="text-zinc-600 hover:text-indigo-400" title="Reset">↺</button>
                                 </div>
                             </div>
                             <input type="range" min="20" max="150" step="2" value={config.fontSize} onChange={(e) => setConfig({...config, fontSize: parseInt(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                        </div>

                        <div className="flex flex-col gap-1">
                             <div className="flex justify-between text-zinc-400">
                                 <span>Ghost Opacity</span>
                                 <div className="flex items-center gap-2">
                                     <span>{Math.round(config.guideOpacity * 100)}%</span>
                                     <button onClick={() => setConfig(c => ({...c, guideOpacity: DEFAULTS.guideOpacity}))} className="text-zinc-600 hover:text-indigo-400" title="Reset">↺</button>
                                 </div>
                             </div>
                             <input type="range" min="0" max="1" step="0.1" value={config.guideOpacity} onChange={(e) => setConfig({...config, guideOpacity: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Mirror Text</span>
                             <button onClick={() => setConfig(c => ({...c, isMirrored: !c.isMirrored}))} className={`px-3 py-1 rounded-full ${config.isMirrored ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                {config.isMirrored ? 'ON' : 'OFF'}
                            </button>
                        </div>
                         <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Show Timer</span>
                             <button onClick={() => setConfig(c => ({...c, showTimer: !c.showTimer}))} className={`px-3 py-1 rounded-full ${config.showTimer ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                {config.showTimer ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-zinc-800">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Video Look</h3>
                         <div className="grid grid-cols-2 gap-2">
                            {(['none', 'warm', 'cool', 'bw'] as VideoFilterType[]).map(filter => (
                                <button 
                                    key={filter}
                                    onClick={() => setConfig(c => ({...c, videoFilter: filter}))}
                                    className={`py-1.5 px-2 rounded border transition-all capitalize ${config.videoFilter === filter ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
                                >
                                    {filter}
                                </button>
                            ))}
                         </div>
                    </div>

                    {isCameraActive && (
                        <div className="space-y-3 pt-2 border-t border-zinc-800">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Camera Hardware</h3>
                            
                            {!hasCameraControls && <p className="text-zinc-600 italic">No advanced controls available.</p>}

                            {cameraCapabilities && (cameraCapabilities as any).torch && (
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-400">Flash</span>
                                    <button 
                                        onClick={() => applyCameraConstraint('torch', !(cameraSettings as any)?.torch)}
                                        className={`px-3 py-1 rounded-full ${(cameraSettings as any)?.torch ? 'bg-yellow-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                                    >
                                        {(cameraSettings as any)?.torch ? 'ON' : 'OFF'}
                                    </button>
                                </div>
                            )}

                            {cameraCapabilities && (cameraCapabilities as any).zoom && (
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Zoom</span>
                                        <div className="flex items-center gap-2">
                                            <span>{(cameraSettings as any)?.zoom?.toFixed(1)}x</span>
                                            <button onClick={() => applyCameraConstraint('zoom', DEFAULTS.zoom)} className="text-zinc-600 hover:text-indigo-400" title="Reset">↺</button>
                                        </div>
                                    </div>
                                    <input 
                                        type="range" 
                                        min={(cameraCapabilities as any).zoom.min} 
                                        max={(cameraCapabilities as any).zoom.max} 
                                        step={0.1}
                                        value={(cameraSettings as any)?.zoom || 1}
                                        onChange={(e) => applyCameraConstraint('zoom', parseFloat(e.target.value))}
                                        className="w-full accent-indigo-500 h-1.5 bg-zinc-700 rounded-lg appearance-none"
                                    />
                                </div>
                            )}
                            
                            {cameraCapabilities && (cameraCapabilities as any).exposureCompensation && (
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Exposure</span>
                                        <div className="flex items-center gap-2">
                                            <span>{(cameraSettings as any)?.exposureCompensation?.toFixed(1)}</span>
                                            <button onClick={() => applyCameraConstraint('exposureCompensation', DEFAULTS.exposure)} className="text-zinc-600 hover:text-indigo-400" title="Reset">↺</button>
                                        </div>
                                    </div>
                                    <input 
                                        type="range" 
                                        min={(cameraCapabilities as any).exposureCompensation.min} 
                                        max={(cameraCapabilities as any).exposureCompensation.max} 
                                        step={(cameraCapabilities as any).exposureCompensation.step}
                                        value={(cameraSettings as any)?.exposureCompensation || 0}
                                        onChange={(e) => applyCameraConstraint('exposureCompensation', parseFloat(e.target.value))}
                                        className="w-full accent-indigo-500 h-1.5 bg-zinc-700 rounded-lg appearance-none"
                                    />
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
                <div className="absolute inset-0 pointer-events-none z-20 flex items-center">
                    <div className="w-full h-px bg-red-600/40 shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                </div>

                <div 
                    ref={containerRef}
                    className={`h-full overflow-y-auto relative ${config.isMirrored ? 'scale-x-[-1] scale-y-[-1]' : ''} touch-pan-y no-scrollbar`}
                    onWheel={handleUserInteraction}
                    onTouchStart={handleUserInteraction}
                    onMouseDown={handleUserInteraction}
                    onScroll={handleScroll}
                >
                    <div ref={contentRef} className="py-[50vh] px-6 max-w-4xl mx-auto">
                        {segments.map((seg, idx) => {
                            const isActive = elapsedTime >= segmentTimeMap[idx].start && elapsedTime < segmentTimeMap[idx].end;
                            return (
                                <div 
                                    key={seg.id}
                                    ref={el => {segmentRefs.current[idx] = el}}
                                    className={`mb-10 font-bold text-center leading-[1.1] transition-all duration-300 drop-shadow-lg`}
                                    style={{ 
                                        fontSize: `${config.fontSize}px`,
                                        textShadow: isCameraActive ? '0 2px 4px rgba(0,0,0,0.8)' : 'none',
                                        opacity: isActive ? 1 : config.guideOpacity,
                                        filter: isActive ? 'none' : 'blur(0.5px)',
                                        transform: isActive ? 'scale(1)' : 'scale(0.98)'
                                    }}
                                    dir="auto"
                                >
                                    {seg.words.map((word, wIdx) => (
                                        <span key={wIdx} className={`${word.color || 'text-white'} mr-[0.2em] inline-block`}>
                                            {word.text}
                                        </span>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-zinc-950/90 backdrop-blur border-t border-zinc-900 px-4 py-4 pb-8 sm:pb-4 z-50 transition-colors" onDoubleClick={(e) => e.stopPropagation()}>
                <div className="max-w-2xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                    
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                        <button 
                            onClick={onClose}
                            className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors group shrink-0"
                            title="Exit"
                        >
                            <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-zinc-800 border border-zinc-800">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                            </div>
                        </button>

                        <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50 flex-1 sm:hidden">
                             <span className="text-[10px] font-bold text-zinc-500 uppercase">Speed</span>
                             <input 
                                type="range" 
                                min="0.1" 
                                max="2.5" 
                                step="0.1" 
                                value={speedMultiplier} 
                                onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                                className="flex-1 accent-indigo-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                             />
                             <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">{speedMultiplier.toFixed(1)}x</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 sm:gap-6 w-full sm:w-auto">
                        <div className="hidden sm:flex items-center gap-4 w-48">
                             <input 
                                type="range" 
                                min="0.1" 
                                max="2.5" 
                                step="0.1" 
                                value={speedMultiplier} 
                                onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                                className="flex-1 accent-indigo-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                title="Adjust Playback Speed"
                             />
                             <span className="text-[10px] font-mono text-zinc-500 w-8">{speedMultiplier.toFixed(1)}x</span>
                        </div>

                        <div className="flex items-center justify-center gap-3 sm:gap-5 bg-zinc-900/50 sm:bg-transparent p-2 sm:p-0 rounded-2xl border border-zinc-800/50 sm:border-none">
                             <button onClick={() => setElapsedTime(Math.max(0, elapsedTime - 5000))} className="p-2 text-zinc-500 hover:text-white" title="Rewind 5 Seconds">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
                             </button>
                             
                             <button 
                                onClick={handlePlayPause}
                                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${isPlaying ? 'bg-indigo-600' : 'bg-green-600'}`}
                                title={isPlaying ? "Pause" : "Start"}
                             >
                                {isPlaying ? (
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                ) : (
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                )}
                             </button>
                             
                             <button onClick={handleStop} className="p-2 text-zinc-500 hover:text-white group" title="Stop & Reset">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-current rounded flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-current rounded-[1px]"/>
                                </div>
                             </button>
                             
                             <div className="w-px h-6 sm:h-8 bg-zinc-800 mx-1"/>

                             <button 
                                onClick={handleSettingsClick}
                                className={`p-2 sm:p-3 rounded-full transition-all active:scale-95 ${showSettings ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}
                                title="Settings"
                             >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                             </button>

                             <button 
                                onClick={handleRecordClick} 
                                className={`p-2 sm:p-3 rounded-full transition-all active:scale-95 ${!isCameraActive ? 'bg-zinc-800 text-zinc-500 hover:text-red-500' : ''} ${isRecording ? 'bg-red-500/20 text-red-500 ring-2 ring-red-500' : (isCameraActive ? 'bg-zinc-900 text-red-500 hover:bg-zinc-800' : '')}`}
                                title={isCameraActive ? "Record" : "Turn on Camera & Record"}
                             >
                                <div className={`w-4 h-4 bg-current rounded-${isRecording ? 'sm' : 'full'} transition-all duration-300`}/>
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};