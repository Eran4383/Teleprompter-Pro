
import React, { useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useCameraManager = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    const {
        isCameraActive, setIsCameraActive,
        isRecording, setIsRecording,
        setCameraCapabilities, setCameraSettings,
        config
    } = useAppStore();

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const activeStreamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [setIsRecording]);

    const toggleCamera = useCallback(async () => {
        if (isCameraActive) {
            if (activeStreamRef.current) {
                activeStreamRef.current.getTracks().forEach(track => track.stop());
                activeStreamRef.current = null;
            }
            if (videoRef.current) videoRef.current.srcObject = null;
            setIsCameraActive(false);
            setCameraCapabilities(null);
            if (isRecording) stopRecording();
            return null;
        } else {
            try {
                const constraints: MediaStreamConstraints = { 
                    video: { 
                        facingMode: 'user',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }, 
                    audio: true 
                };
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                activeStreamRef.current = stream;

                // Only attach to UI video if we are in camera background mode
                if (videoRef.current && config.bgMode === 'camera') {
                    const video = videoRef.current;
                    video.srcObject = stream;
                    video.onloadedmetadata = () => {
                        video.play().catch(e => console.error("Video play failed", e));
                    };
                }
                
                setIsCameraActive(true);
                
                const track = stream.getVideoTracks()[0];
                if (track.getCapabilities) {
                    setCameraCapabilities(track.getCapabilities());
                    setCameraSettings(track.getSettings());
                } else {
                    setCameraCapabilities({} as any); 
                }
                return stream;
            } catch (error) {
                console.error("Camera access error:", error);
                alert("Could not access camera. Please allow permissions.");
                return null;
            }
        }
    }, [isCameraActive, setIsCameraActive, setCameraCapabilities, setCameraSettings, isRecording, stopRecording, videoRef, config.bgMode]);

    const applyCameraConstraint = useCallback(async (constraint: string, value: any) => {
        const stream = activeStreamRef.current;
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        
        try {
            await track.applyConstraints({
                advanced: [{ [constraint]: value }]
            });
            setCameraSettings(track.getSettings());
        } catch (e) {
            console.error("Failed to apply constraint", e);
        }
    }, [setCameraSettings]);

    const startRecording = useCallback((providedStream?: MediaStream) => {
        const stream = providedStream || activeStreamRef.current;
        
        if (!stream) {
            alert("Please enable the camera first.");
            return;
        }
        
        chunksRef.current = [];
        
        try {
            const mimeTypes = [
                'video/mp4; codecs=avc1,opus',
                'video/mp4',
                'video/webm; codecs=h264,opus', 
                'video/webm; codecs=vp9,opus',
                'video/webm'
            ];
            let selectedMimeType = '';
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) { selectedMimeType = type; break; }
            }
            if (!selectedMimeType) selectedMimeType = 'video/webm';

            const recorder = new MediaRecorder(stream, { 
                mimeType: selectedMimeType, 
                videoBitsPerSecond: 5000000 
            });
            
            recorder.ondataavailable = (e) => { 
                if (e.data.size > 0) chunksRef.current.push(e.data); 
            };
            
            recorder.onstop = () => {
                const isMp4 = selectedMimeType.includes('mp4');
                const type = selectedMimeType.split(';')[0];
                const ext = isMp4 ? 'mp4' : 'webm';
                const blob = new Blob(chunksRef.current, { type });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `teleprompter-${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.${ext}`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { 
                    document.body.removeChild(a); 
                    window.URL.revokeObjectURL(url); 
                }, 100);
            };
            
            recorder.start(1000);
            setIsRecording(true);
            mediaRecorderRef.current = recorder;
        } catch (e) {
            console.error("Recorder error:", e);
            alert("Failed to start recording.");
        }
    }, [setIsRecording]);

    return {
        toggleCamera,
        applyCameraConstraint,
        startRecording,
        stopRecording,
        activeStream: activeStreamRef
    };
};
