import React, { useState, useEffect } from 'react';
import { PromptConfig } from '../types';

interface SettingsPanelProps {
    config: PromptConfig;
    setConfig: React.Dispatch<React.SetStateAction<PromptConfig>>;
    showSettings: boolean;
    setShowSettings: (val: boolean) => void;
    isCameraActive: boolean;
    cameraCapabilities: any;
    cameraSettings: any;
    applyCameraConstraint: (c: string, v: any) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    config, setConfig, showSettings, setShowSettings, isCameraActive,
    cameraCapabilities, cameraSettings, applyCameraConstraint
}) => {
    const [settingsPos, setSettingsPos] = useState({ x: 20, y: 80 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setDragOffset({ x: clientX - settingsPos.x, y: clientY - settingsPos.y });
    };

    useEffect(() => {
        const handleDragMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging) return;
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
            setSettingsPos({ x: clientX - dragOffset.x, y: clientY - dragOffset.y });
        };
        const handleDragEnd = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging, dragOffset]);

    if (!showSettings) return null;

    return (
        <div 
            className="absolute z-50 bg-zinc-950/95 backdrop-blur border border-zinc-800 p-4 rounded-xl shadow-2xl w-72 text-xs flex flex-col gap-4"
            style={{ left: settingsPos.x, top: settingsPos.y }}
        >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 cursor-grab" onMouseDown={handleDragStart}>
                <span className="font-bold text-white">Settings</span>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
                <div className="flex flex-col gap-1">
                    <span className="text-zinc-400">Font Size: {config.fontSize}px</span>
                    <input type="range" min="20" max="150" value={config.fontSize} onChange={(e) => setConfig({...config, fontSize: parseInt(e.target.value)})} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Mirror Text</span>
                    <button onClick={() => setConfig(c => ({...c, isMirrored: !c.isMirrored}))} className={`px-2 py-1 rounded ${config.isMirrored ? 'bg-indigo-600' : 'bg-zinc-800'}`}>{config.isMirrored ? 'ON' : 'OFF'}</button>
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-zinc-800">
                <span className="text-zinc-500 uppercase text-[9px] font-bold">Video Adjustments</span>
                <div className="flex flex-col gap-1">
                    <span className="text-zinc-400">Brightness: {Math.round(config.brightness * 100)}%</span>
                    <input type="range" min="0.5" max="2.0" step="0.1" value={config.brightness} onChange={(e) => setConfig({...config, brightness: parseFloat(e.target.value)})} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-zinc-400">Contrast: {Math.round(config.contrast * 100)}%</span>
                    <input type="range" min="0.5" max="2.0" step="0.1" value={config.contrast} onChange={(e) => setConfig({...config, contrast: parseFloat(e.target.value)})} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                </div>
            </div>

            {isCameraActive && cameraCapabilities?.zoom && (
                <div className="pt-2 border-t border-zinc-800 flex flex-col gap-1">
                    <span className="text-zinc-400">Hardware Zoom: {cameraSettings?.zoom?.toFixed(1)}x</span>
                    <input type="range" min={cameraCapabilities.zoom.min} max={cameraCapabilities.zoom.max} step={0.1} value={cameraSettings?.zoom || 1} onChange={(e) => applyCameraConstraint('zoom', parseFloat(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                </div>
            )}
        </div>
    );
};