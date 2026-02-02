
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
            // Setup for Video Mode
            video.srcObject = null;
            video.src = videoFileUrl;
            video.loop = false; // Sync is handled by hook
            video.muted = config.videoVolume === 0;
            video.volume = config.videoVolume;
            video.load();
        } else if (config.bgMode === 'camera') {
            // Setup for Camera Mode
            video.src = '';
            // Camera stream is assigned via srcObject in useCameraManager
            video.muted = true;
        }
    }, [config.bgMode, videoFileUrl, videoRef]);

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

    const showVideo = config.bgMode === 'camera' ? isCameraActive : !!videoFileUrl;

    return (
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted={config.bgMode === 'camera' || config.videoVolume === 0}
            className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-700 ${showVideo ? 'opacity-100' : 'opacity-0'}`}
            style={{ 
                transform: `${config.mirrorVideo ? 'scaleX(-1)' : ''} scale(${config.videoScale})`, 
                filter: videoFilters 
            }} 
        />
    );
};
