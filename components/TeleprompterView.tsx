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

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({ segments, onClose }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);
    
    // Camera & Recording State
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    // Initialize as empty object to indicate "checked but maybe empty" vs null "not checked"
    const [cameraCapabilities, setCameraCapabilities] = useState<MediaTrackCapabilities | null>(null);
    const [cameraSettings, setCameraSettings] = useState<MediaTrackSettings | null>(null);
    const [showCameraControls, setShowCameraControls] = useState(false);
    
    const [config, setConfig] = useState<PromptConfig>({
        fontSize: 54,
        isMirrored: false,
        overlayColor: '#000000',
        guideOpacity: 0.2,
        showTimer: true
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

    // --- Camera Logic ---
    const toggleCamera = async () => {
        if (isCameraActive) {
            // Stop logic
            const stream = videoRef.current?.srcObject as MediaStream;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (videoRef.current) videoRef.current.srcObject = null;
            setIsCameraActive(false);
            setCameraCapabilities(null);
            setShowCameraControls(false);
            if (isRecording) stopRecording();
        } else {
            // Start logic
            try {
                // Request highest common resolution for better quality
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
                        // Browser doesn't support getCapabilities (e.g. Firefox/Safari sometimes)
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
                // Just turn on the camera (Preview Mode)
                await toggleCamera();
            } else {
                // If camera is already active, start recording
                startRecording();
            }
        }
    };

    const handleSettingsClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isCameraActive) {
            await toggleCamera();
            setShowCameraControls(true);
        } else {
            setShowCameraControls(prev => !prev);
        }
    };

    const startRecording = () => {
        if (!isCameraActive || !videoRef.current?.srcObject) {
            alert("Please enable the camera first.");
            return;
        }
        
        chunksRef.current = [];
        const stream = videoRef.current.srcObject as MediaStream;
        
        try {
            // Prefer high quality mime type
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
                ? 'video/webm;codecs=vp9' 
                : 'video/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `teleprompter-recording-${new Date().toISOString()}.webm`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
            };

            recorder.start();
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

    // --- Cleanup on unmount ---
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
            // At bottom
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
                setElapsedTime(totalDuration);
                return;
            }
            // At top (due to padding, this happens less, but reset to 0)
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
                
                // Calculate position to center the current word/segment
                const targetScroll = elTop - (containerHeight / 2) + (elHeight / 2);
                const scrollOffset = targetScroll + (elHeight * segmentProgress) - (elHeight/2);

                containerRef.current.scrollTo({ top: scrollOffset, behavior: 'auto' });
            }
        } else if (elapsedTime === 0) {
            // Explicit reset to top logic
            // We don't scroll to 0, because 0 is empty padding. We scroll to the first element's center pos.
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
        setElapsedTime(0); // This triggers the useEffect to scroll to top
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
        // Prevent fullscreen if clicking controls
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

    // Check if we actually have any controls to show
    const hasControls = cameraCapabilities && ((cameraCapabilities as any).torch || (cameraCapabilities as any).zoom || (cameraCapabilities as any).exposureCompensation);

    return (
        <div 
            className={`fixed inset-0 z-50 flex flex-col overflow-hidden transition-colors duration-500 ${isCameraActive ? 'bg-black/30' : 'bg-black'} text-white`}
            onDoubleClick={handleDoubleClick}
            title="Double-click empty area for Fullscreen"
        >
            {/* Camera Video Layer */}
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
                style={{ transform: 'scaleX(-1)' }} // Mirror camera by default for user preference
            />

            {/* Top Overlay for settings */}
            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-40 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-4">
                     {/* PREVIEW / REC Indicator */}
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
                     {!isCameraActive && !isRecording && <div className="text-zinc-500 text-[10px] font-mono">Dbl-click: Fullscreen</div>}
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Camera Toggle */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleCamera(); }} 
                        className={`p-2 rounded transition-colors ${isCameraActive ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-400'}`}
                        title={isCameraActive ? "Turn Off Camera" : "Turn On Camera"}
                    >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                    
                    {/* Camera Advanced Settings Toggle - ALWAYS VISIBLE TO MATCH BOTTOM BAR */}
                    <button 
                        onClick={handleSettingsClick}
                        className={`p-2 rounded transition-colors ${showCameraControls && isCameraActive ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-400'}`}
                        title="Camera Settings (Zoom, Flash, Exposure)"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>

                    <div className="w-px h-6 bg-zinc-800 mx-1" />

                    <button 
                        onClick={(e) => { e.stopPropagation(); setConfig(c => ({...c, showTimer: !c.showTimer})); }} 
                        className={`p-2 rounded transition-colors ${config.showTimer ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-400'}`}
                        title={config.showTimer ? "Hide Timer Overlay" : "Show Timer Overlay"}
                    >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                    <div className="w-px h-6 bg-zinc-800 mx-1" />
                    <button onClick={(e) => { e.stopPropagation(); setConfig(c => ({...c, fontSize: Math.max(10, c.fontSize - 4)})); }} className="p-2 bg-zinc-900 rounded text-zinc-300 hover:text-white" title="Decrease Font Size">A-</button>
                    <button onClick={(e) => { e.stopPropagation(); setConfig(c => ({...c, fontSize: c.fontSize + 4})); }} className="p-2 bg-zinc-900 rounded text-zinc-300 hover:text-white" title="Increase Font Size">A+</button>
                    <button onClick={(e) => { e.stopPropagation(); toggleMirror(); }} className={`p-2 rounded text-sm font-medium ${config.isMirrored ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-300 hover:text-white'}`} title="Mirror Text (for teleprompter glass)">Mirror</button>
                </div>
            </div>
            
            {/* Camera Settings Panel */}
            {isCameraActive && showCameraControls && (
                <div className="absolute top-16 right-4 z-40 bg-zinc-900/90 backdrop-blur border border-zinc-800 p-4 rounded-xl shadow-xl w-64 flex flex-col gap-4 text-xs" onDoubleClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-1">
                        <span className="font-bold text-white">Camera Settings</span>
                        <button onClick={() => setShowCameraControls(false)} className="text-zinc-500 hover:text-white">✕</button>
                    </div>

                    {!hasControls && (
                         <div className="text-zinc-500 py-2 text-center italic">
                             Advanced settings (Zoom, Flash) not supported by this browser/camera.
                         </div>
                    )}

                    {/* Flash / Torch */}
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

                    {/* Zoom */}
                    {cameraCapabilities && (cameraCapabilities as any).zoom && (
                         <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-zinc-400">
                                <span>Zoom</span>
                                <span>{(cameraSettings as any)?.zoom?.toFixed(1)}x</span>
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
                    
                    {/* Exposure Compensation */}
                     {cameraCapabilities && (cameraCapabilities as any).exposureCompensation && (
                         <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-zinc-400">
                                <span>Exposure</span>
                                <span>{(cameraSettings as any)?.exposureCompensation?.toFixed(1)}</span>
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

            {/* Persistent Timer Overlay */}
            {config.showTimer && (
                <div className={`absolute top-6 left-6 z-30 pointer-events-none select-none transition-transform ${config.isMirrored ? 'scale-x-[-1]' : ''}`}>
                    <div className="font-mono text-4xl sm:text-5xl font-bold text-white/30 tracking-wider tabular-nums drop-shadow-md">
                        {formatTime(elapsedTime)}
                    </div>
                </div>
            )}

            {/* Main Content */}
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
                    {/* CHANGED PADDING TO 50VH TO ALLOW CENTER ALIGNMENT OF TOP AND BOTTOM LINES */}
                    <div ref={contentRef} className="py-[50vh] px-6 max-w-4xl mx-auto">
                        {segments.map((seg, idx) => {
                            const isActive = elapsedTime >= segmentTimeMap[idx].start && elapsedTime < segmentTimeMap[idx].end;
                            return (
                                <div 
                                    key={seg.id}
                                    ref={el => {segmentRefs.current[idx] = el}}
                                    className={`mb-10 font-bold text-center leading-[1.1] transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-20 scale-90 blur-[1px]'} drop-shadow-lg`}
                                    style={{ 
                                        fontSize: `${config.fontSize}px`,
                                        textShadow: isCameraActive ? '0 2px 4px rgba(0,0,0,0.8)' : 'none'
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

            {/* Always Visible Bottom Bar with Clear Exit */}
            <div className="bg-zinc-950/90 backdrop-blur border-t border-zinc-900 px-4 py-4 pb-8 sm:pb-4 z-50 transition-colors" onDoubleClick={(e) => e.stopPropagation()}>
                <div className="max-w-xl mx-auto flex items-center justify-between gap-6">
                    {/* EXIT BUTTON */}
                    <button 
                        onClick={onClose}
                        className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors group"
                        title="Exit Teleprompter Mode"
                    >
                        <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-zinc-800 border border-zinc-800">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-tighter">Exit</span>
                    </button>

                    <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-center gap-4">
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
                             <span className="text-[10px] font-mono text-zinc-500 w-10">{speedMultiplier.toFixed(1)}x</span>
                        </div>
                        <div className="flex items-center justify-center gap-6">
                             <button onClick={() => setElapsedTime(Math.max(0, elapsedTime - 10000))} className="p-2 text-zinc-500 hover:text-white" title="Rewind 10 Seconds">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
                             </button>
                             
                             <button 
                                onClick={handlePlayPause}
                                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${isPlaying ? 'bg-indigo-600' : 'bg-green-600'}`}
                                title={isPlaying ? "Pause Scrolling (Space)" : "Start Scrolling (Space)"}
                             >
                                {isPlaying ? (
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                ) : (
                                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                )}
                             </button>
                             
                             <button onClick={handleStop} className="p-2 text-zinc-500 hover:text-white group" title="Stop & Reset to Top">
                                <div className="w-6 h-6 border-2 border-current rounded flex items-center justify-center">
                                    <div className="w-3 h-3 bg-current rounded-[1px]"/>
                                </div>
                             </button>
                             
                             <div className="w-px h-8 bg-zinc-800 mx-2"/>

                             {/* SETTINGS BUTTON IN BOTTOM BAR */}
                             <button 
                                onClick={handleSettingsClick}
                                className={`p-3 rounded-full transition-all active:scale-95 ${showCameraControls && isCameraActive ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}
                                title="Camera Settings (will turn camera on)"
                             >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                             </button>

                             {/* RECORD BUTTON */}
                             <button 
                                onClick={handleRecordClick} 
                                className={`p-3 rounded-full transition-all active:scale-95 ${!isCameraActive ? 'bg-zinc-800 text-zinc-500 hover:text-red-500' : ''} ${isRecording ? 'bg-red-500/20 text-red-500 ring-2 ring-red-500' : (isCameraActive ? 'bg-zinc-900 text-red-500 hover:bg-zinc-800' : '')}`}
                                title={isCameraActive ? (isRecording ? "Stop Recording" : "Start Recording") : "Turn On Camera & Prepare to Record"}
                             >
                                <div className={`w-4 h-4 bg-current rounded-${isRecording ? 'sm' : 'full'} transition-all duration-300`}/>
                             </button>
                        </div>
                    </div>

                    <div className="w-10" /> {/* Spacer */}
                </div>
            </div>
        </div>
    );
};