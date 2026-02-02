import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { AppMode } from './types';
import { APP_VERSION } from './constants';
import { EditorFeature } from './features/editor/index';
import { PrompterFeature } from './features/teleprompter/index';

const App: React.FC = () => {
    const { mode } = useAppStore();

    useEffect(() => {
        console.log(`%c Teleprompter PRO ${APP_VERSION} initialized. `, 'background: #4f46e5; color: #fff; font-weight: bold;');
    }, []);

    const handleGlobalDoubleClick = (e: React.MouseEvent) => {
        // Prevent fullscreen trigger if clicking interactive components
        const target = e.target as HTMLElement;
        const isInteractive = 
            ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'].includes(target.tagName) || 
            target.closest('button') || 
            target.isContentEditable;

        if (isInteractive) return;

        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    return (
        <div 
            className="h-[100dvh] w-full bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-hidden antialiased"
            onDoubleClick={handleGlobalDoubleClick}
            title="Double-click anywhere empty for Fullscreen"
        >
            {mode === AppMode.EDITOR ? (
                <>
                    <header className="px-6 py-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-xl shadow-indigo-500/10">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-xl font-black tracking-tighter text-white leading-none">Teleprompter PRO</h1>
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{APP_VERSION}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                             <div className="hidden md:flex flex-col items-end">
                                 <span className="text-xs font-bold text-zinc-400">Professional Studio</span>
                                 <span className="text-[9px] text-zinc-600">Secure. Private. Cloud-Sync.</span>
                             </div>
                             <a 
                                href="https://ai.google.dev/gemini-api/docs/billing" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-black text-zinc-500 hover:text-white transition-all hover:bg-zinc-800"
                            >
                                BILLING INFO
                            </a>
                        </div>
                    </header>
                    <main className="flex-1 p-3 sm:p-6 min-h-0 overflow-hidden">
                        <div className="max-w-5xl mx-auto h-full flex flex-col">
                            <EditorFeature />
                        </div>
                    </main>
                </>
            ) : (
                <PrompterFeature />
            )}
        </div>
    );
};

export default App;