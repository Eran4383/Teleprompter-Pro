
import React from 'react';
import { useAppStore } from '../../../../store/useAppStore';
import { ControlSlider } from '../../../../components/ui/ControlSlider';

export const TransformControls: React.FC = () => {
    const { config, setConfig } = useAppStore();

    return (
        <section className="space-y-4 pt-4 border-t border-zinc-900">
            <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Transform Engine</h3>
                <button 
                    onClick={() => setConfig({ ...config, videoScale: 1, videoTranslateX: 0, videoTranslateY: 0 })}
                    className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 transition-colors uppercase tracking-tight"
                >
                    Reset
                </button>
            </div>
            
            <ControlSlider 
                label="Digital Zoom" 
                value={config.videoScale} min={0.5} max={3.0} step={0.05} 
                onChange={(v) => setConfig({ ...config, videoScale: v })} 
                formatValue={v => `${v.toFixed(2)}x`} 
            />

            <div className="grid grid-cols-2 gap-4">
                <ControlSlider 
                    label="Pan X" 
                    value={config.videoTranslateX} min={-100} max={100} 
                    onChange={(v) => setConfig({ ...config, videoTranslateX: v })} 
                    formatValue={v => `${v}%`} 
                />
                <ControlSlider 
                    label="Pan Y" 
                    value={config.videoTranslateY} min={-100} max={100} 
                    onChange={(v) => setConfig({ ...config, videoTranslateY: v })} 
                    formatValue={v => `${v}%`} 
                />
            </div>

            <div className="space-y-3 pt-2">
                <ControlSlider label="Brightness" value={config.brightness} min={0.5} max={2.0} step={0.1} onChange={(v) => setConfig({ ...config, brightness: v })} formatValue={v => `${Math.round(v * 100)}%`} />
                <ControlSlider label="Contrast" value={config.contrast} min={0.5} max={2.0} step={0.1} onChange={(v) => setConfig({ ...config, contrast: v })} formatValue={v => `${Math.round(v * 100)}%`} />
            </div>
        </section>
    );
};
