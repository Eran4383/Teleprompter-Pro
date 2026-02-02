
import React, { useRef } from 'react';
import { useAppStore } from '../../../../store/useAppStore';
import { ControlSlider } from '../../../../components/ui/ControlSlider';

export const SourceSelector: React.FC = () => {
    const { config, setConfig, videoFileUrl, setVideoFileUrl, setToast } = useAppStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (!file.type.startsWith('video/')) {
            setToast({ msg: "Invalid video file", type: "error" });
            return;
        }

        const url = URL.createObjectURL(file);
        setVideoFileUrl(url);
        setConfig({ ...config, bgMode: 'video' });
    };

    return (
        <section className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Background Source</h3>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={() => setConfig({ ...config, bgMode: 'camera' })}
                    className={`px-3 py-2 rounded-lg font-bold border transition-all ${config.bgMode === 'camera' ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                >
                    Camera
                </button>
                <button 
                    onClick={() => setConfig({ ...config, bgMode: 'video' })}
                    className={`px-3 py-2 rounded-lg font-bold border transition-all ${config.bgMode === 'video' ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                >
                    Dubbing
                </button>
            </div>

            {config.bgMode === 'video' && (
                <div className="space-y-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 animate-modal-pop">
                    <input type="file" ref={fileInputRef} onChange={handleVideoUpload} accept="video/*" className="hidden" />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 font-medium transition-colors border border-zinc-700"
                    >
                        {videoFileUrl ? 'Change Video Source' : 'Upload Background Video'}
                    </button>
                    {videoFileUrl && (
                        <ControlSlider 
                            label="Dubbing Volume" 
                            value={config.videoVolume} min={0} max={1} step={0.05}
                            onChange={(v) => setConfig({ ...config, videoVolume: v })}
                            formatValue={(v) => `${Math.round(v * 100)}%`}
                        />
                    )}
                </div>
            )}
        </section>
    );
};
