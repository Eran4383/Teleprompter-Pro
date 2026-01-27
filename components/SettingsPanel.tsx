
import React from 'react';
import { PromptConfig } from '../types';

interface SettingsPanelProps {
    config: PromptConfig;
    setConfig: React.Dispatch<React.SetStateAction<PromptConfig>>;
    show: boolean;
    onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, setConfig, show, onClose }) => {
    if (!show) return null;
    return (
        <div className="absolute top-20 left-6 z-50 bg-zinc-950/95 border border-zinc-800 p-4 rounded-xl w-64 shadow-2xl backdrop-blur">
            <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-white text-sm">Settings</span>
                <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-4 text-xs">
                <div>
                    <div className="flex justify-between text-zinc-400 mb-1">
                        <span>Font Size</span>
                        <span>{config.fontSize}px</span>
                    </div>
                    <input type="range" min="20" max="150" value={config.fontSize} onChange={e => setConfig({...config, fontSize: parseInt(e.target.value)})} className="w-full h-1.5 accent-indigo-500 bg-zinc-800 rounded-lg appearance-none"/>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Mirror Text</span>
                    <button onClick={() => setConfig({...config, isMirrored: !config.isMirrored})} className={`px-2 py-1 rounded ${config.isMirrored ? 'bg-indigo-600' : 'bg-zinc-800'}`}>{config.isMirrored ? 'ON' : 'OFF'}</button>
                </div>
                <div className="pt-2 border-t border-zinc-800">
                    <div className="text-zinc-500 mb-2 uppercase text-[9px] font-bold">Video</div>
                    <div className="space-y-3">
                        {['brightness', 'contrast', 'saturation'].map(prop => (
                            <div key={prop}>
                                <div className="flex justify-between text-zinc-400 mb-1 capitalize">
                                    <span>{prop}</span>
                                    <span>{Math.round((config as any)[prop] * 100)}%</span>
                                </div>
                                <input type="range" min="0.5" max="2.0" step="0.1" value={(config as any)[prop]} onChange={e => setConfig({...config, [prop]: parseFloat(e.target.value)})} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none"/>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
