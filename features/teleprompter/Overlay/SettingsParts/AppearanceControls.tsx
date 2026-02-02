
import React from 'react';
import { useAppStore } from '../../../../store/useAppStore';
import { ControlSlider } from '../../../../components/ui/ControlSlider';

export const AppearanceControls: React.FC = () => {
    const { config, setConfig } = useAppStore();

    return (
        <section className="space-y-4 pt-4 border-t border-zinc-900">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Text Appearance</h3>
            <ControlSlider 
                label="Font Scale" 
                value={config.fontSize} min={24} max={180} 
                onChange={(v) => setConfig({ ...config, fontSize: v })}
                formatValue={(v) => `${v}px`}
            />
            <ControlSlider 
                label="Blur Contrast" 
                value={config.guideOpacity} min={0.05} max={1} step={0.05}
                onChange={(v) => setConfig({ ...config, guideOpacity: v })}
                formatValue={(v) => `${Math.round(v * 100)}%`}
            />
            
            <div className="flex items-center justify-between bg-zinc-900/30 p-2.5 rounded-xl border border-zinc-800/50">
                <span className="text-zinc-400 font-medium">Mirror Script</span>
                <button 
                    onClick={() => setConfig({ ...config, isMirrored: !config.isMirrored })} 
                    className={`w-12 py-1 rounded-lg text-[10px] font-black transition-all ${config.isMirrored ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-zinc-800 text-zinc-600'}`}
                >
                    {config.isMirrored ? 'ON' : 'OFF'}
                </button>
            </div>

            <div className="flex items-center justify-between bg-zinc-900/30 p-2.5 rounded-xl border border-zinc-800/50">
                <span className="text-zinc-400 font-medium">Mirror Background</span>
                <button 
                    onClick={() => setConfig({ ...config, mirrorVideo: !config.mirrorVideo })} 
                    className={`w-12 py-1 rounded-lg text-[10px] font-black transition-all ${config.mirrorVideo ? 'bg-indigo-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-600'}`}
                >
                    {config.mirrorVideo ? 'ON' : 'OFF'}
                </button>
            </div>
        </section>
    );
};
