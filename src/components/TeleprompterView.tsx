import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PromptConfig, ScriptSegment } from '../types';

interface TeleprompterViewProps {
    segments: ScriptSegment[];
    onClose: () => void;
}

const formatTime = (ms: number) => {
    if (!ms || isNaN(ms)) return "00:00";
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

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({ segments, onClose }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);
    
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    
    const [showSettings, setShowSettings] = useState(false);
    const [settingsPos, setSettingsPos] = useState({ x: 20, y: 80 }); 
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const [config, setConfig] = useState<PromptConfig>({
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
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>(0);
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

    // Drag Logic for Settings
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

    // Camera
    const toggleCamera = async () => {
        if (isCameraActive) {
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
            if (videoRef.current) videoRef.current.srcObject = null;
            setIsCameraActive(false);
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
                }
            } catch (error) {
                alert("Could not access camera. Make sure you are on HTTPS.");
            }
        }
    };

    const startRecording = () => {
        if (!isCameraActive || !videoRef.current?.srcObject) return;
        chunksRef.current = [];
        const stream = videoRef.current.srcObject as MediaStream;
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `teleprompter-${Date.now()}.webm`;
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

    // Playback Animation
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
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, speedMultiplier, totalDuration]);

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
        if (!isPlaying && isManualScroll.current) {
            isManualScroll.current = false;
        }
        setIsPlaying(!isPlaying);
        lastTimeRef.current = undefined;
    };

    const videoFilters = [
        config.videoFilter !== 'none' ? FILTER_STYLES[config.videoFilter].filter : '',
        `brightness(${config.brightness})`,
        `contrast(${config.contrast})`,
        `saturate(${config.saturation})`
    ].filter(Boolean).join(' ');

    return (
        <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden ${isCameraActive ? 'bg-black/30' : 'bg-black'} text-white`}>
            <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover z-0 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`} style={{ transform: `scaleX(-1) scale(${config.videoScale})`, filter: videoFilters }} />
            
            {/* Draggable Settings */}
            {showSettings && (
                <div className="absolute z-50 bg-zinc-950/95 backdrop-blur border border-zinc-800 p-4 rounded-xl shadow-2xl w-72 flex flex-col gap-5 text-xs overflow-y-auto max-h-[80vh]"
                     style={{ left: settingsPos.x, top: settingsPos.y }}
                     onMouseDown={handleDragStart} onTouchStart={handleDragStart}>
                    <div className="flex justify-between border-b border-zinc-800 pb-2 cursor-grab active:cursor-grabbing">
                        <span className="font-bold">Settings</span>
                        <button onClick={() => setShowSettings(false)}>✕</button>
                    </div>
                    <div className="space-y-3">
                        <div><label>Font Size: {config.fontSize}px</label><input type="range" min="20" max="150" value={config.fontSize} onChange={e=>setConfig({...config, fontSize: parseInt(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/></div>
                        <div><label>Ghost Opacity: {Math.round(config.guideOpacity * 100)}%</label><input type="range" min="0" max="1" step="0.1" value={config.guideOpacity} onChange={e=>setConfig({...config, guideOpacity: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/></div>
                        <div className="flex justify-between"><span>Mirror Text</span><button onClick={()=>setConfig(c=>({...c, isMirrored:!c.isMirrored}))} className={`px-2 py-1 rounded ${config.isMirrored ? 'bg-indigo-600' : 'bg-zinc-800'}`}>{config.isMirrored?'ON':'OFF'}</button></div>
                        <div className="border-t border-zinc-800 pt-2 mt-2">
                            <h4 className="font-bold mb-2">Video Adjustments</h4>
                            <div><label>Zoom: {config.videoScale}x</label><input type="range" min="0.5" max="2" step="0.1" value={config.videoScale} onChange={e=>setConfig({...config, videoScale: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/></div>
                            <div><label>Brightness</label><input type="range" min="0.5" max="2" step="0.1" value={config.brightness} onChange={e=>setConfig({...config, brightness: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none"/></div>
                        </div>
                    </div>
                </div>
            )}

            {config.showTimer && (
                <div className={`absolute top-6 left-6 z-30 font-mono text-5xl font-bold text-white/30 drop-shadow-lg ${config.isMirrored ? 'scale-x-[-1]' : ''}`}>
                    {formatTime(elapsedTime)}
                </div>
            )}

            <div className="flex-1 relative overflow-hidden z-10">
                <div className="absolute inset-0 pointer-events-none z-20 flex items-center"><div className="w-full h-px bg-red-600/40"/></div>
                <div ref={containerRef} onMouseDown={() => { setIsPlaying(false); isManualScroll.current = true; }} onTouchStart={() => { setIsPlaying(false); isManualScroll.current = true; }} className={`h-full overflow-y-auto relative no-scrollbar ${config.isMirrored ? 'scale-y-[-1] scale-x-[-1]' : ''}`}>
                    <div className="py-[50vh] px-6 max-w-4xl mx-auto">
                        {segments.map((seg, idx) => {
                            const isActive = elapsedTime >= segmentTimeMap[idx].start && elapsedTime < segmentTimeMap[idx].end;
                            return (
                                // Fix: wrap ref assignment in braces to return void, satisfying React Ref types
                                <div key={seg.id} ref={el => { segmentRefs.current[idx] = el; }} className="mb-10 font-bold text-center leading-tight transition-all duration-300 drop-shadow-lg"
                                    style={{ fontSize: config.fontSize + 'px', opacity: isActive ? 1 : config.guideOpacity, transform: isActive ? 'scale(1)' : 'scale(0.98)' }}>
                                    {seg.words.map((w, wi) => <span key={wi} className={`inline-block mr-[0.2em] ${w.color || 'text-white'}`}>{w.text}</span>)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Centered Published-Style Bottom Bar */}
            <div className="bg-zinc-950/90 border-t border-zinc-900 p-6 z-50 flex items-center justify-center gap-6">
                <button onClick={onClose} className="p-4 bg-zinc-900 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors" title="Exit">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                
                <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Speed</span>
                    <input type="range" min="0.1" max="2.5" step="0.1" value={speedMultiplier} onChange={e => setSpeedMultiplier(parseFloat(e.target.value))} className="w-24 accent-indigo-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"/>
                    <span className="text-xs font-mono w-8 text-zinc-400">{speedMultiplier.toFixed(1)}x</span>
                </div>

                <button onClick={handlePlayPause} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${isPlaying ? 'bg-indigo-600' : 'bg-green-600'}`}>
                    {isPlaying ? <span className="text-xl">⏸</span> : <span className="text-xl ml-1">▶</span>}
                </button>

                <button onClick={() => setShowSettings(!showSettings)} className={`p-4 rounded-full transition-colors ${showSettings ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`} title="Settings">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>

                <button onClick={isRecording ? stopRecording : (isCameraActive ? startRecording : toggleCamera)} className={`p-4 rounded-full transition-all ${isRecording ? 'bg-red-600 animate-pulse' : (isCameraActive ? 'bg-zinc-900 text-red-500 hover:bg-zinc-800' : 'bg-zinc-900 text-zinc-500 hover:text-white')}`}>
                    {isRecording ? <span className="font-bold text-xs">REC</span> : <span className="text-xl">📷</span>}
                </button>
            </div>
        </div>
    );
};