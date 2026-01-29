import React, { useState, useEffect } from 'react';
import { AppMode, ScriptSegment } from './types';
import { DEFAULT_SCRIPT, APP_VERSION } from './constants';
import { ScriptEditor } from './components/ScriptEditor';
import { TeleprompterView } from './components/TeleprompterView';

const App: React.FC = () => {
  const [segments, setSegments] = useState<ScriptSegment[]>(DEFAULT_SCRIPT);
  const [mode, setMode] = useState<AppMode>(AppMode.EDITOR);

  useEffect(() => {
    console.log(`Teleprompter PRO ${APP_VERSION} loaded.`);
  }, []);

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Check if the target is an interactive element where double-click might mean something else (like selecting text)
    const target = e.target as HTMLElement;
    const isInteractive = 
        ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'].includes(target.tagName) || 
        target.closest('button') || 
        target.isContentEditable;

    if (isInteractive) {
        return;
    }

    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  };

  return (
    <div 
        className="h-[100dvh] w-full bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-hidden"
        onDoubleClick={handleDoubleClick}
        title="Double-click anywhere empty for Fullscreen"
    >
        {mode === AppMode.EDITOR && (
          <>
            <header className="px-4 py-3 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/20">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-lg font-bold tracking-tight text-white leading-none">Teleprompter PRO</h1>
                        <span className="text-xs font-medium text-zinc-500">{APP_VERSION}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                     <span className="hidden sm:inline text-xs text-zinc-500">Professional Prompter</span>
                     <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-zinc-500 hover:text-white underline" title="View Gemini API Billing Information">Billing Info</a>
                </div>
            </header>
            <main className="flex-1 p-2 sm:p-4 min-h-0 overflow-hidden">
                <div className="max-w-4xl mx-auto h-full flex flex-col">
                    <ScriptEditor 
                        segments={segments} 
                        onSegmentsChange={setSegments}
                        onStartPrompt={() => setMode(AppMode.PROMPTER)}
                    />
                </div>
            </main>
          </>
        )}

        {mode === AppMode.PROMPTER && (
            <TeleprompterView 
                segments={segments}
                onClose={() => setMode(AppMode.EDITOR)}
            />
        )}
    </div>
  );
};

export default App;