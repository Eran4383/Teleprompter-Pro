
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PromptConfig, ScriptSegment, SegmentWord } from '../types';
import { PROMPTER_DEFAULTS } from '../constants';
import { PrompterSettings } from './PrompterSettings';
import { PrompterControls } from './PrompterControls';

interface TeleprompterViewProps {
    segments: ScriptSegment[];
    onClose: () => void;
}

const STORAGE_KEY = 'teleprompter_config';

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

    const [config, setConfig] = useState<PromptConfig>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        try { return saved ? JSON.parse(saved) : PROMPTER_DEFAULTS; } catch { return PROMPTER_DEFAULTS; }
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastTimeRef = useRef<number | undefined>(undefined);
    const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

    const totalDuration = useMemo(() => segments.reduce((acc, seg) => acc + seg.duration, 0), [segments]);
    const segmentTimeMap = useMemo(() => {
        let acc = 0;
        return segments.map(s => { const start = acc; acc += s.duration; return { start, end: acc, id: s.id, duration: s.duration }; });
    }, [segments]);

    useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); }, [config]);

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        setSettingsPos({ x: cx - dragOffset.x, y: cy - dragOffset.y });
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', () => setIsDragging(false));
            return () => { window.removeEventListener('mousemove', handleDragMove); };
        }
    }, [isDragging, dragOffset]);

    const animate = (time: number) => {
        if (lastTimeRef.current !== undefined && isPlaying) {
            const delta = time - lastTimeRef.current;
            setElapsedTime(prev => Math.min(totalDuration, prev + (delta * speedMultiplier)));
        }
        lastTimeRef.current = time;
        requestAnimationFrame(animate);
    };

    useEffect(() => { requestAnimationFrame(animate); }, [isPlaying, speedMultiplier]);

    useEffect(() => {
        if (!isPlaying || !containerRef.current) return;
        const idx = segmentTimeMap.findIndex(m => elapsedTime >= m.start && elapsedTime < m.end);
        if (idx !== -1 && segmentRefs.current[idx]) {
            const el = segmentRefs.current[idx]!;
            const map = segmentTimeMap[idx];
            const progress = (elapsedTime - map.start) / map.duration;
            const scroll = el.offsetTop - (containerRef.current.clientHeight / 2) + (el.clientHeight * progress);
            containerRef.current.scrollTo({ top: scroll, behavior: 'auto' });
        }
    }, [elapsedTime, isPlaying]);

    const toggleCamera = async () => {
        if (isCameraActive) {
            (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
            setIsCameraActive(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
                if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); }
            } catch { alert("Camera access failed."); }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover transition-opacity ${isCameraActive ? 'opacity-100' : 'opacity-0'}`} style={{ transform: `scaleX(-1) scale(${config.videoScale})`, filter: `brightness(${config.brightness}) contrast(${config.contrast})` }} />
            
            {showSettings && <PrompterSettings config={config} setConfig={setConfig} onClose={() => setShowSettings(false)} position={settingsPos} isDragging={isDragging} onDragStart={(e) => {
                const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
                const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
                setDragOffset({ x: cx - settingsPos.x, y: cy - settingsPos.y });
                setIsDragging(true);
            }} />}

            <div className="flex-1 relative overflow-hidden z-10 flex items-center justify-center">
                <div className={`absolute inset-0 pointer-events-none z-20 flex items-center ${config.isLandscape ? 'rotate-90' : ''}`}><div className="w-full h-px bg-red-600/30"/></div>
                <div ref={containerRef} className={`h-full w-full overflow-y-auto no-scrollbar ${config.isMirrored ? 'scale-x-[-1]' : ''} ${config.isLandscape ? 'rotate-90 origin-center' : ''}`}>
                    <div className="py-[50vh] px-6 max-w-4xl mx-auto">
                        {segments.map((seg, idx) => {
                            const active = elapsedTime >= segmentTimeMap[idx].start && elapsedTime < segmentTimeMap[idx].end;
                            return (
                                <div key={seg.id} ref={el => segmentRefs.current[idx] = el} className="mb-12 font-bold text-center leading-tight transition-all duration-300" style={{ fontSize: config.fontSize, opacity: active ? 1 : config.guideOpacity, color: active ? config.fontColor : config.ghostColor }}>
                                    {seg.text}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <PrompterControls 
                isPlaying={isPlaying} isRecording={isRecording} isCameraActive={isCameraActive} 
                speedMultiplier={speedMultiplier} onPlayPause={() => setIsPlaying(!isPlaying)} 
                onStop={() => { setIsPlaying(false); setElapsedTime(0); }} 
                onRewind={() => setElapsedTime(Math.max(0, elapsedTime - 5000))}
                onToggleSettings={async () => { if (!isCameraActive) await toggleCamera(); setShowSettings(!showSettings); }}
                onRecord={() => setIsRecording(!isRecording)} onClose={onClose} 
                onSpeedChange={setSpeedMultiplier} 
            />
        </div>
    );
};
