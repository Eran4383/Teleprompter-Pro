import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { ControlSlider } from '../../../components/ui/ControlSlider';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    applyCameraConstraint: (constraint: string, value: any) => Promise<void>;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, applyCameraConstraint }) => {
    const { config, setConfig, isCameraActive, cameraCapabilities, cameraSettings } = useAppStore();
    const [pos, setPos] = useState({ x: 20, y: 80 }); 
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setDragOffset({ x: clientX - pos.x, y: clientY - pos.y });
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging) return;
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
            setPos({ x: clientX - dragOffset.x, y: clientY - dragOffset.y });
        };
        const handleEnd = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, dragOffset]);

    if (!isOpen) return null;

    return (
        <div 
            className="absolute z-[60] bg-zinc-950/98 backdrop-blur-xl border border-zinc-800 p-5 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.8)] w-80 flex flex-col gap-6 text-xs overflow-y-auto max-h-[85vh] animate-modal-pop"
            style={{ left: `${pos.x}px`, top: `${pos.y}px`, cursor: isDragging ? 'grabbing' : 'auto' }}
            onDoubleClick={e => e.stopPropagation()}
        >
            <div 
                className="flex items-center justify-between border-b border-zinc-800 pb-3 cursor-grab active:cursor-grabbing"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
            >
                <div className="flex items-center gap-2">
                     <span className="font-black text-white text-sm uppercase tracking-tight">Display Studio</span>
                     <div className="w-1 h-1 rounded-full bg-zinc-700"/>
                </div>
                <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors" title="Close Panel">✕</button>
            </div>

            <div className="space-y-6">
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Text & Script</h3>
                    <ControlSlider 
                        label="Font Scale" 
                        value={config.fontSize} min={24} max={180} 
                        onChange={(v) => setConfig({ ...config, fontSize: v })}
                        formatValue={(v) => `${v}px`}
                    />
                    <ControlSlider 
                        label="Inactive Line Blur" 
                        value={config.guideOpacity} min={0.05} max={1} step={0.05}
                        onChange={(v) => setConfig({ ...config, guideOpacity: v })}
                        formatValue={(v) => `${Math.round(v * 100)}%`}
                    />
                    <div className="flex items-center justify-between bg-zinc-900/30 p-2 rounded-lg">
                        <span className="text-zinc-400 font-medium">Mirror Prompt</span>
                        <button 
                            onClick={() => setConfig({ ...config, isMirrored: !config.isMirrored })} 
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${config.isMirrored ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-zinc-800 text-zinc-500'}`}
                        >
                            {config.isMirrored ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </section>

                <section className="space-y-4 pt-4 border-t border-zinc-900">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Video Engine</h3>
                        <button onClick={() => setConfig({ ...config, videoScale: 1, brightness: 1, contrast: 1, saturation: 1 })} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 transition-colors uppercase tracking-tighter">Reset All</button>
                    </div>
                    <ControlSlider label="Virtual Zoom" value={config.videoScale} min={0.5} max={3.0} step={0.05} onChange={(v) => setConfig({ ...config, videoScale: v })} formatValue={v => `${v.toFixed(2)}x`} />
                    <ControlSlider label="Exposure" value={config.brightness} min={0.2} max={2.5} step={0.1} onChange={(v) => setConfig({ ...config, brightness: v })} formatValue={v => `${Math.round(v * 100)}%`} />
                    <ControlSlider label="Contrast" value={config.contrast} min={0.2} max={2.5} step={0.1} onChange={(v) => setConfig({ ...config, contrast: v })} formatValue={v => `${Math.round(v * 100)}%`} />
                </section>

                {isCameraActive && cameraCapabilities && (
                    <section className="space-y-4 pt-4 border-t border-zinc-900">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Hardware Optic</h3>
                        {(cameraCapabilities as any).torch && (
                            <div className="flex items-center justify-between bg-zinc-900/30 p-2 rounded-lg">
                                <span className="text-zinc-400 font-medium">Flash Torch</span>
                                <button 
                                    onClick={() => applyCameraConstraint('torch', !(cameraSettings as any)?.torch)} 
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${(cameraSettings as any)?.torch ? 'bg-yellow-500 text-zinc-950 shadow-lg shadow-yellow-500/20' : 'bg-zinc-800 text-zinc-500'}`}
                                >
                                    {(cameraSettings as any)?.torch ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        )}
                        {(cameraCapabilities as any).zoom && (
                            <ControlSlider 
                                label="Hardware Zoom" 
                                value={(cameraSettings as any)?.zoom || 1} 
                                min={(cameraCapabilities as any).zoom.min} 
                                max={(cameraCapabilities as any).zoom.max} 
                                step={0.1} 
                                onChange={(v) => applyCameraConstraint('zoom', v)} 
                                formatValue={v => `${v.toFixed(1)}x`}
                            />
                        )}
                    </section>
                )}
            </div>
        </div>
    );
};