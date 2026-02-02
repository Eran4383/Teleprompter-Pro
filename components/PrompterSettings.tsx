
import React from 'react';
import { PromptConfig } from '../types';
import { PROMPTER_DEFAULTS } from '../constants';

interface PrompterSettingsProps {
    config: PromptConfig;
    setConfig: (config: PromptConfig) => void;
    onClose: () => void;
    position: { x: number; y: number };
    onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
    isDragging: boolean;
}

const SettingRow: React.FC<{ label: string; value: string | number; children: React.ReactNode; onReset: () => void; colorPicker?: { value: string; onChange: (val: string) => void } }> = ({ label, value, children, onReset, colorPicker }) => (
    <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-zinc-400">
            <span className="flex items-center gap-2">
                {label}
                <button onClick={onReset} className="text-[10px] text-zinc-600 hover:text-indigo-400 transition-colors" title="Reset to default">⟲</button>
            </span>
            <div className="flex items-center gap-2">
                {colorPicker && (
                    <input 
                        type="color" 
                        value={colorPicker.value} 
                        onChange={(e) => colorPicker.onChange(e.target.value)}
                        className="w-4 h-4 rounded-sm cursor-pointer bg-transparent border-none p-0"
                    />
                )}
                <span className="text-zinc-500 font-mono">{value}</span>
            </div>
        </div>
        {children}
    </div>
);

export const PrompterSettings: React.FC<PrompterSettingsProps> = ({ config, setConfig, onClose, position, onDragStart, isDragging }) => {
    const update = (key: keyof PromptConfig, val: any) => setConfig({ ...config, [key]: val });
    const reset = (key: keyof PromptConfig) => update(key, PROMPTER_DEFAULTS[key]);

    return (
        <div 
            className="absolute z-50 bg-zinc-950/95 backdrop-blur border border-zinc-800 p-4 rounded-xl shadow-2xl w-72 flex flex-col gap-5 text-xs overflow-y-auto max-h-[75vh] select-none"
            style={{ left: position.x, top: position.y, cursor: isDragging ? 'grabbing' : 'auto' }}
        >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 cursor-grab active:cursor-grabbing" onMouseDown={onDragStart} onTouchStart={onDragStart}>
                <span className="font-bold text-white text-sm">Pro Settings</span>
                <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">✕</button>
            </div>

            <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Display</h3>
                
                <SettingRow label="Font Size" value={`${config.fontSize}px`} onReset={() => reset('fontSize')} colorPicker={{ value: config.fontColor, onChange: (v) => update('fontColor', v) }}>
                    <input type="range" min="20" max="150" value={config.fontSize} onChange={(e) => update('fontSize', parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg appearance-none"/>
                </SettingRow>

                <SettingRow label="Ghost Opacity" value={`${Math.round(config.guideOpacity * 100)}%`} onReset={() => reset('guideOpacity')} colorPicker={{ value: config.ghostColor, onChange: (v) => update('ghostColor', v) }}>
                    <input type="range" min="0" max="1" step="0.1" value={config.guideOpacity} onChange={(e) => update('guideOpacity', parseFloat(e.target.value))} className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg appearance-none"/>
                </SettingRow>

                <div className="grid grid-cols-2 gap-2 pt-2">
                    <button onClick={() => update('isMirrored', !config.isMirrored)} className={`py-2 rounded-lg border transition-all ${config.isMirrored ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>Mirror Text</button>
                    <button onClick={() => update('isLandscape', !config.isLandscape)} className={`py-2 rounded-lg border transition-all ${config.isLandscape ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>Landscape</button>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Advanced Video</h3>
                
                <SettingRow label="Zoom (Scale)" value={`${config.videoScale.toFixed(2)}x`} onReset={() => reset('videoScale')}>
                    <input type="range" min="0.5" max="2.0" step="0.05" value={config.videoScale} onChange={(e) => update('videoScale', parseFloat(e.target.value))} className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg appearance-none"/>
                </SettingRow>

                <SettingRow label="Brightness" value={`${Math.round(config.brightness * 100)}%`} onReset={() => reset('brightness')}>
                    <input type="range" min="0.2" max="2.0" step="0.05" value={config.brightness} onChange={(e) => update('brightness', parseFloat(e.target.value))} className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg appearance-none"/>
                </SettingRow>

                <SettingRow label="Contrast" value={`${Math.round(config.contrast * 100)}%`} onReset={() => reset('contrast')}>
                    <input type="range" min="0.2" max="2.0" step="0.05" value={config.contrast} onChange={(e) => update('contrast', parseFloat(e.target.value))} className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg appearance-none"/>
                </SettingRow>
            </div>
        </div>
    );
};
