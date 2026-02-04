
import React, { useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';

interface VideoLayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

const FILTER_STYLES: Record<string, string> = {
    warm: 'sepia(0.3) saturate(1.4) contrast(1.1)',
    cool: 'hue-rotate(180deg) saturate(0.8) contrast(1.1)',
    bw: 'grayscale(1) contrast(1.2)',
};

export const VideoLayer: React.FC<VideoLayerProps> = ({ videoRef }) => {
    const { config, isCameraActive, videoFileUrl, isPlaying } = useAppStore();

    useEffect(() => {
        if (!videoRef.current) return;
        const video = videoRef.current;

        if (config.bgMode === 'video' && videoFileUrl) {
            // When in Video/Dubbing mode, ensure we show the file, NOT the camera stream object
            if (video.src !== videoFileUrl) {
                video.srcObject = null;
                video.src = videoFileUrl;
                video.load();
                video.pause();
            }
            video.loop = false;
            video.muted = config.videoVolume === 0;
            video.volume = config.videoVolume;
            
            // Sync play state
            if (isPlaying && video.paused) {
                video.play().catch(() => {});
            } else if (!isPlaying && !video.paused) {
                video.pause();
            }

        } else if (config.bgMode === 'camera') {
            // When in camera mode, prioritize srcObject
            if (video.src) {
                video.src = '';
                video.load();
            }
            
            // Re-attach camera stream if it was detached during mode switch
            // We assume the camera stream is managed by useCameraManager and it's active
            if (isCameraActive && !video.srcObject) {
                // This will be handled by the Manager's toggle logic, 
                // but we add safety check for mode switching.
                // Note: Re-attaching here requires access to the stream, 
                // but the Manager handles this flow.
            }
            
            video.muted = true;
        }
    }, [config.bgMode, videoFileUrl, isCameraActive, videoRef, isPlaying, config.videoVolume]);

    useEffect(() => {
        if (videoRef.current && config.bgMode === 'video') {
            videoRef.current.muted = config.videoVolume === 0;
            videoRef.current.volume = config.videoVolume;
        }
    }, [config.videoVolume, config.bgMode, videoRef]);

    const videoFilters = [
        config.videoFilter !== 'none' ? FILTER_STYLES[config.videoFilter] : '',
        `brightness(${config.brightness})`,
        `contrast(${config.contrast})`,
        `saturate(${config.saturation})`
    ].filter(Boolean).join(' ');

    const showVideoSource = config.bgMode === 'camera' ? isCameraActive : !!videoFileUrl;
    const finalOpacity = config.bgVisible && showVideoSource ? 'opacity-100' : 'opacity-0';

    return (
        <video 
            ref={videoRef} 
            playsInline 
            muted={config.bgMode === 'camera' || config.videoVolume === 0}
            className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-700 pointer-events-none ${finalOpacity}`}
            style={{ 
                transform: `
                    ${config.mirrorVideo ? 'scaleX(-1)' : ''} 
                    scale(${config.videoScale}) 
                    translate(${config.videoTranslateX}%, ${config.videoTranslateY}%)
                `, 
                filter: videoFilters 
            }} 
        />
    );
};
