
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
    const { config, isCameraActive, videoFileUrl } = useAppStore();

    useEffect(() => {
        if (!videoRef.current) return;
        const video = videoRef.current;

        if (config.bgMode === 'video' && videoFileUrl) {
            if (video.src !== videoFileUrl) {
                video.srcObject = null;
                video.src = videoFileUrl;
                video.load();
            }
            video.loop = false;
            video.muted = config.videoVolume === 0;
            video.volume = config.videoVolume;
        } else if (config.bgMode === 'camera') {
            // DO NOT clear srcObject here. The CameraManager handles it.
            // Only clear the file source if it exists.
            if (video.src) {
                video.src = '';
                video.load(); // Reset the video element state
            }
            // Ensure camera stream is actually playing if active
            if (isCameraActive && video.srcObject) {
                video.play().catch(() => {
                    // This can happen if the browser blocks autoplay before interaction
                    console.log("Autoplay blocked, waiting for interaction");
                });
            }
            video.muted = true;
        }
    }, [config.bgMode, videoFileUrl, isCameraActive, videoRef]);

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
            autoPlay
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
