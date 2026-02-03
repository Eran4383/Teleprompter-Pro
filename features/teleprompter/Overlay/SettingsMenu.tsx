
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { SourceSelector } from './SettingsParts/SourceSelector';
import { FocalControls } from './SettingsParts/FocalControls';
import { TransformControls } from './SettingsParts/TransformControls';
import { AppearanceControls } from './SettingsParts/AppearanceControls';
import { PlaybackModeSelector } from './SettingsParts/Playback';
import { AutomationControls } from './SettingsParts/Automation';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    applyCameraConstraint: (constraint: string, value: any) => Promise<void>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, applyCameraConstraint, videoRef }) => {
    const { 
        config, isCameraActive, cameraCapabilities, cameraSettings 
    } = useAppStore();
    
    const [pos, setPos] = useState({ x: 20, y: 80 }); 
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
        setDragOffset({ x: clientX - pos.x, y: clientY - dragOffset.y });
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging) return;
            const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
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
        <>
            {/* Click-Outside Backdrop */}
            <div className="fixed inset-0 z-[55] bg-black/5" onClick={onClose} />
            
            <div 
                className="absolute z-[60] bg-zinc-950/98 backdrop-blur-xl border border-zinc-800 p-5 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.8)] w-80 flex flex-col gap-6 text-xs overflow-y-auto max-h-[80vh] animate-modal-pop no-scrollbar select-none"
                style={{ left: `${pos.x}px`, top: `${pos.y}px`, cursor: isDragging ? 'grabbing' : 'auto' }}
                onDoubleClick={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
            >
                {/* Draggable Header */}
                <div 
                    className="flex items-center justify-between border-b border-zinc-800 pb-4 cursor-grab active:cursor-grabbing"
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"/>
                        <span className="font-black text-white text-sm uppercase tracking-tight">Studio Master</span>
                    </div>
                    <button onClick={onClose} className="w-6 h-6 flex items-center justify-center bg-zinc-900 rounded-full text-zinc-600 hover:text-white transition-colors" title="Close Panel">✕</button>
                </div>

                {/* Atomic Parts Composition */}
                <div className="space-y-6 pb-2">
                    <SourceSelector />
                    
                    {config.bgMode === 'video' && (
                        <section className="space-y-4 pt-4 border-t border-zinc-900">
                            <PlaybackModeSelector />
                        </section>
                    )}

                    <AutomationControls />

                    <FocalControls />
                    <TransformControls />
                    <AppearanceControls />

                    {/* Hardware Section (Condensed) */}
                    {config.bgMode === 'camera' && isCameraActive && cameraCapabilities && (
                        <section className="space-y-3 pt-4 border-t border-zinc-900">
                            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Hardware Optic</h3>
                            {(cameraCapabilities as any).zoom && (
                                <div className="px-2">
                                    <input 
                                        type="range"
                                        min={(cameraCapabilities as any).zoom.min} 
                                        max={(cameraCapabilities as any).zoom.max} 
                                        step={0.1}
                                        value={(cameraSettings as any)?.zoom || 1}
                                        onChange={(e) => applyCameraConstraint('zoom', parseFloat(e.target.value))}
                                        className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[8px] font-bold text-zinc-700 mt-1 uppercase">
                                        <span>Optic Zoom</span>
                                        <span>{((cameraSettings as any)?.zoom || 1).toFixed(1)}x</span>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </>
    );
};
