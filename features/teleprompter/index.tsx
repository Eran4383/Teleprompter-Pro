
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
        stopRecording,
        activeStream
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

    const onToggleRecord = useCallback(async () => {
        if (isRecording) {
            stopRecording();
        } else {
            // Support recording in both modes now
            if (!isCameraActive) {
                const stream = await toggleCamera();
                if (stream) {
                    // Small delay to ensure stream is fully ready
                    setTimeout(() => startRecording(stream), 300);
                }
            } else {
                startRecording();
            }
        }
    }, [isRecording, isCameraActive, stopRecording, toggleCamera, startRecording]);

    return (
        <div 
            className={`fixed inset-0 z-50 flex flex-col overflow-hidden transition-all duration-700 ease-in-out ${isCameraActive || config.bgMode === 'video' ? 'bg-black/40 backdrop-blur-3xl' : 'bg-zinc-950'} text-white`}
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
                onPlayPause={handlePlayPause}
            />

            <SettingsMenu 
                isOpen={showSettings} 
                onClose={() => setShowSettings(false)} 
                applyCameraConstraint={applyCameraConstraint}
                videoRef={videoRef}
            />

            <ControlBar 
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onStop={handleStop}
                onRewind={() => useAppStore.getState().setElapsedTime(prev => Math.max(0, prev - 5000))}
                onToggleSettings={() => setShowSettings(s => !s)}
                onToggleCamera={toggleCamera}
                onToggleRecord={onToggleRecord}
                videoRef={videoRef}
            />
        </div>
    );
};
