
import React, { useRef, useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCameraManager } from '../../hooks/useCameraManager';
import { useTeleprompterLoop } from '../../hooks/useTeleprompterLoop';
import { VideoLayer } from './Camera/VideoLayer';
import { PrompterCanvas } from './Display/PrompterCanvas';
import { TimerDisplay } from './Overlay/TimerDisplay';
import { ControlBar } from './Overlay/ControlBar';
import { SettingsMenu } from './Overlay/SettingsMenu';

export const PrompterFeature: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [showSettings, setShowSettings] = useState(false);

    const {
        toggleCamera,
        applyCameraConstraint,
        startRecording,
        stopRecording
    } = useCameraManager(videoRef);

    const {
        handlePlayPause,
        handleStop,
        handleUserInteraction,
        handleScroll,
        segmentTimeMap,
        elapsedTime,
        isPlaying
    } = useTeleprompterLoop(containerRef, segmentRefs, videoRef);

    const { isCameraActive, isRecording, config } = useAppStore();

    const onToggleRecord = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            if (config.bgMode === 'video') {
                // Future optimization: Record the canvas + audio for dubbing
                alert("Recording is currently only supported in Camera Mode.");
                return;
            }
            if (!isCameraActive) {
                toggleCamera().then(() => startRecording());
            } else {
                startRecording();
            }
        }
    }, [isRecording, isCameraActive, stopRecording, toggleCamera, startRecording, config.bgMode]);

    const handleGlobalDoubleClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInteractive = ['BUTTON', 'INPUT', 'TEXTAREA'].includes(target.tagName) || target.closest('button');
        if (isInteractive) return;
        
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    return (
        <div 
            className={`fixed inset-0 z-50 flex flex-col overflow-hidden transition-all duration-700 ease-in-out ${isCameraActive || config.bgMode === 'video' ? 'bg-black/40 backdrop-blur-3xl' : 'bg-zinc-950'} text-white`}
            onDoubleClick={handleGlobalDoubleClick}
        >
            <VideoLayer videoRef={videoRef} />
            
            <TimerDisplay elapsedTime={elapsedTime} />

            <PrompterCanvas 
                ref={containerRef}
                segmentRefs={segmentRefs}
                elapsedTime={elapsedTime}
                segmentTimeMap={segmentTimeMap}
                onUserInteraction={handleUserInteraction}
                onScroll={handleScroll}
            />

            <SettingsMenu 
                isOpen={showSettings} 
                onClose={() => setShowSettings(false)} 
                applyCameraConstraint={applyCameraConstraint}
            />

            <ControlBar 
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onStop={handleStop}
                onRewind={() => useAppStore.getState().setElapsedTime(prev => Math.max(0, prev - 5000))}
                onToggleSettings={() => setShowSettings(s => !s)}
                onToggleCamera={toggleCamera}
                onToggleRecord={onToggleRecord}
            />
        </div>
    );
};
