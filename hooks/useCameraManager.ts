
// Fix: Import React to resolve namespace error on React.RefObject
import React, { useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useCameraManager = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    const {
        isCameraActive, setIsCameraActive,
        isRecording, setIsRecording,
        setCameraCapabilities, setCameraSettings,
        cameraSettings
    } = useAppStore();

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [setIsRecording]);

    const toggleCamera = useCallback(async () => {
        if (isCameraActive) {
            const stream = videoRef.current?.srcObject as MediaStream;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (videoRef.current) videoRef.current.srcObject = null;
            setIsCameraActive(false);
            setCameraCapabilities(null);
            if (isRecording) stopRecording();
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
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsCameraActive(true);
                    
                    const track = stream.getVideoTracks()[0];
                    if (track.getCapabilities) {
                        setCameraCapabilities(track.getCapabilities());
                        setCameraSettings(track.getSettings());
                    } else {
                        setCameraCapabilities({} as any); 
                    }
                }
            } catch (error) {
                console.error("Camera access error:", error);
                alert("Could not access camera. Please allow permissions.");
            }
        }
    }, [isCameraActive, setIsCameraActive, setCameraCapabilities, setCameraSettings, isRecording, stopRecording, videoRef]);

    const applyCameraConstraint = useCallback(async (constraint: string, value: any) => {
        const stream = videoRef.current?.srcObject as MediaStream;
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
    }, [setCameraSettings, videoRef]);

    const startRecording = useCallback(() => {
        if (!isCameraActive || !videoRef.current?.srcObject) {
            alert("Please enable the camera first.");
            return;
        }
        
        chunksRef.current = [];
        const stream = videoRef.current.srcObject as MediaStream;
        
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

            const recorder = new MediaRecorder(stream, { mimeType: selectedMimeType, videoBitsPerSecond: 5000000 });
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
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
                setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
            };
            recorder.start(1000);
            setIsRecording(true);
            mediaRecorderRef.current = recorder;
        } catch (e) {
            console.error("Recorder error:", e);
            alert("Failed to start recording.");
        }
    }, [isCameraActive, setIsRecording, videoRef]);

    return {
        toggleCamera,
        applyCameraConstraint,
        startRecording,
        stopRecording
    };
};
