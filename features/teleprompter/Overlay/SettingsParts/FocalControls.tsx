
import React from 'react';
import { useAppStore } from '../../../../store/useAppStore';
import { ControlSlider } from '../../../../components/ui/ControlSlider';

export const FocalControls: React.FC = () => {
    const { config, setConfig } = useAppStore();

    return (
        <section className="space-y-4 pt-4 border-t border-zinc-900">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Focal & Visibility</h3>
            
            <ControlSlider 
                label="Focal Alignment" 
                value={config.focalPosition} min={0.2} max={0.8} step={0.01}
                onChange={(v) => setConfig({ ...config, focalPosition: v })}
                formatValue={(v) => `${Math.round(v * 100)}%`}
            />

            <div className="flex items-center justify-between bg-zinc-900/30 p-2.5 rounded-xl border border-zinc-800/50">
                <span className="text-zinc-400 font-medium">Show Background</span>
                <button 
                    onClick={() => setConfig({ ...config, bgVisible: !config.bgVisible })} 
                    className={`w-12 py-1 rounded-lg text-[10px] font-black transition-all ${config.bgVisible ? 'bg-indigo-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-600'}`}
                >
                    {config.bgVisible ? 'ON' : 'OFF'}
                </button>
            </div>
        </section>
    );
};
