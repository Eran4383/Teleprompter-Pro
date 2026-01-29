
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PromptConfig, ScriptSegment } from '../types';

interface TeleprompterViewProps {
    segments: ScriptSegment[];
    onClose: () => void;
}

const formatTime = (ms: number) => {
    if (isNaN(ms) || ms < 0) return "00:00";
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

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({ segments, onClose }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);
    
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [cameraCapabilities, setCameraCapabilities] = useState<any>(null);
    const [cameraSettings, setCameraSettings] = useState<any>(null);
    
    const [showSettings, setShowSettings] = useState(false);
    const [settingsPos, setSettingsPos] = useState({ x: 20, y: 80 }); 
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const [config, setConfig] = useState<PromptConfig>({
        fontSize: 54,
        isMirrored: false,
        overlayColor: '#000000',
        guideOpacity: 0.2,
        showTimer: true,
        videoFilter: 'none',
        videoScale: 1.0,
        brightness: 1.0,
        contrast: 1.0,
        saturation: 1.0
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number | undefined>(undefined);
    const lastTimeRef = useRef<number | undefined>(undefined);
    const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
    const isManualScroll = useRef(false);

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
            window.addEventListener('touchmove', handleDragMove);
            window.addEventListener('touchend', handleDragEnd);
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
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'user', width: { ideal: 1920 } }, 
                    audio: true 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsCameraActive(true);
                    const track = stream.getVideoTracks()[0];
                    if (track.getCapabilities) {
                        setCameraCapabilities(track.getCapabilities());
                        setCameraSettings(track.getSettings());
                    }
                }
            } catch (error) {
                console.error("Camera error:", error);
            }
        }
    };

    const applyCameraConstraint = async (constraint: string, value: any) => {
        const stream = videoRef.current?.srcObject as MediaStream;
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        try {
            await track.applyConstraints({ advanced: [{ [constraint]: value }] as any });
            setCameraSettings(track.getSettings());
        } catch (e) {
            console.error(e);
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
        recorder.start(1000);
        setIsRecording(true);
        mediaRecorderRef.current = recorder;
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const animate = (time: number) => {
        if (lastTimeRef.current !== undefined && isPlaying) {
            const deltaTime = time - lastTimeRef.current;
            setElapsedTime(prev => Math.min(prev + (deltaTime * speedMultiplier), totalDuration));
        }
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, speedMultiplier]);

    useEffect(() => {
        if (!isPlaying || isManualScroll.current || !containerRef.current) return;
        const activeIdx = segmentTimeMap.findIndex(m => elapsedTime >= m.start && elapsedTime < m.end);
        if (activeIdx !== -1) {
            const el = segmentRefs.current[activeIdx];
            if (el) {
                const m = segmentTimeMap[activeIdx];
                const progress = (elapsedTime - m.start) / m.duration;
                const scrollOffset = (el.offsetTop + el.clientHeight * progress) - (containerRef.current.clientHeight / 2);
                containerRef.current.scrollTo({ top: scrollOffset, behavior: 'auto' });
            }
        }
    }, [elapsedTime, isPlaying]);

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
        lastTimeRef.current = undefined;
        if (isManualScroll.current) isManualScroll.current = false;
    };

    const videoFilters = [
        config.videoFilter !== 'none' ? FILTER_STYLES[config.videoFilter].filter : '',
        `brightness(${config.brightness})`,
        `contrast(${config.contrast})`,
        `saturate(${config.saturation})`
    ].filter(Boolean).join(' ');

    return (
        <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden ${isCameraActive ? 'bg-black/30' : 'bg-black'} text-white`}>
            <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`} style={{ transform: `scaleX(-1) scale(${config.videoScale})`, filter: videoFilters }} />
            
            {showSettings && (
                <div 
                    className="absolute z-[60] bg-zinc-950/95 backdrop-blur-md border border-zinc-800 p-4 rounded-xl shadow-2xl w-72 flex flex-col gap-4 text-xs overflow-y-auto max-h-[80vh]"
                    style={{ left: settingsPos.x, top: settingsPos.y }}
                    onMouseDown={handleDragStart} onTouchStart={handleDragStart}
                >
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2 cursor-grab">
                        <span className="font-bold text-zinc-200">Settings</span>
                        <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">✕</button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-zinc-500 block mb-1">Font Size: {config.fontSize}px</label>
                            <input type="range" min="20" max="150" value={config.fontSize} onChange={e=>setConfig({...config, fontSize: parseInt(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Mirror Prompt</span>
                            <button onClick={()=>setConfig(c=>({...c, isMirrored:!c.isMirrored}))} className={`px-3 py-1 rounded-full text-[10px] font-bold ${config.isMirrored ? 'bg-indigo-600' : 'bg-zinc-800 text-zinc-500'}`}>{config.isMirrored?'ON':'OFF'}</button>
                        </div>
                        {isCameraActive && cameraCapabilities?.zoom && (
                            <div>
                                <label className="text-zinc-500 block mb-1">Optical Zoom: {cameraSettings?.zoom?.toFixed(1)}x</label>
                                <input type="range" min={cameraCapabilities.zoom.min} max={cameraCapabilities.zoom.max} step={0.1} value={cameraSettings?.zoom || 1} onChange={e=>applyCameraConstraint('zoom', parseFloat(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {config.showTimer && (
                <div className={`absolute top-8 left-8 z-30 font-mono text-5xl font-bold text-white/20 select-none ${config.isMirrored ? 'scale-x-[-1]' : ''}`}>
                    {formatTime(elapsedTime)}
                </div>
            )}

            <div className="flex-1 relative overflow-hidden z-10">
                <div className="absolute inset-0 pointer-events-none z-20 flex items-center">
                    <div className="w-full h-px bg-red-600/30" />
                </div>
                <div 
                    ref={containerRef} 
                    onMouseDown={() => { setIsPlaying(false); isManualScroll.current = true; }} 
                    onTouchStart={() => { setIsPlaying(false); isManualScroll.current = true; }} 
                    className={`h-full overflow-y-auto relative no-scrollbar ${config.isMirrored ? 'scale-y-[-1] scale-x-[-1]' : ''}`}
                >
                    <div className="py-[50vh] px-8 max-w-4xl mx-auto">
                        {segments.map((seg, idx) => {
                            const isActive = elapsedTime >= segmentTimeMap[idx].start && elapsedTime < segmentTimeMap[idx].end;
                            return (
                                <div 
                                    key={seg.id} 
                                    ref={el => { segmentRefs.current[idx] = el; }} 
                                    className="mb-12 font-bold text-center leading-tight transition-all duration-300 drop-shadow-2xl"
                                    style={{ 
                                        fontSize: config.fontSize + 'px', 
                                        opacity: isActive ? 1 : config.guideOpacity, 
                                        transform: isActive ? 'scale(1)' : 'scale(0.95)',
                                        filter: isActive ? 'none' : 'blur(0.5px)'
                                    }}
                                    dir="auto"
                                >
                                    {seg.words.map((w, wi) => (
                                        <span key={wi} className={`inline-block mx-[0.1em] ${w.color || 'text-white'}`}>{w.text}</span>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-900 p-6 z-50 flex items-center justify-center gap-6">
                <button onClick={onClose} className="p-4 bg-zinc-900 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all shadow-lg active:scale-95">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                
                <div className="flex items-center gap-4 bg-zinc-900 px-5 py-2 rounded-full border border-zinc-800 shadow-lg">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Speed</span>
                    <input type="range" min="0.1" max="2.5" step="0.1" value={speedMultiplier} onChange={e => setSpeedMultiplier(parseFloat(e.target.value))} className="w-24 accent-indigo-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"/>
                    <span className="text-xs font-mono w-8 text-zinc-400">{speedMultiplier.toFixed(1)}x</span>
                </div>

                <button onClick={handlePlayPause} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 ${isPlaying ? 'bg-indigo-600' : 'bg-green-600 hover:bg-green-700'}`}>
                    {isPlaying ? <span className="text-xl">⏸</span> : <span className="text-xl ml-1">▶</span>}
                </button>

                <button onClick={() => setShowSettings(!showSettings)} className={`p-4 rounded-full transition-all shadow-lg ${showSettings ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                </button>

                <button 
                    onClick={isRecording ? stopRecording : (isCameraActive ? startRecording : toggleCamera)} 
                    className={`p-4 rounded-full transition-all shadow-lg ${isRecording ? 'bg-red-600 animate-pulse' : (isCameraActive ? 'bg-zinc-900 text-red-500 hover:bg-zinc-800' : 'bg-zinc-900 text-zinc-500 hover:text-white')}`}
                >
                    {isRecording ? <span className="font-bold text-[10px]">REC</span> : <span className="text-xl">📷</span>}
                </button>
            </div>
        </div>
    );
};
