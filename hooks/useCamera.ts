import { useState, useRef, useEffect, useCallback } from 'react';

export const useCamera = () => {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [cameraCapabilities, setCameraCapabilities] = useState<MediaTrackCapabilities | null>(null);
    const [cameraSettings, setCameraSettings] = useState<MediaTrackSettings | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const toggleCamera = useCallback(async () => {
        if (isCameraActive) {
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
            if (videoRef.current) videoRef.current.srcObject = null;
            setIsCameraActive(false);
            setCameraCapabilities(null);
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }, 
                    audio: true 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsCameraActive(true);
                    const track = stream.getVideoTracks()[0];
                    if (track.getCapabilities) {
                        setCameraCapabilities(track.getCapabilities());
                        setCameraSettings(track.getSettings());
                    }
                }
            } catch (error) {
                console.error("Camera access error:", error);
                alert("Could not access camera. Please allow permissions.");
            }
        }
    }, [isCameraActive]);

    const applyCameraConstraint = useCallback(async (constraint: string, value: any) => {
        const stream = videoRef.current?.srcObject as MediaStream;
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        try {
            await track.applyConstraints({ advanced: [{ [constraint]: value }] });
            setCameraSettings(track.getSettings());
        } catch (e) {
            console.error("Failed to apply constraint", e);
        }
    }, []);

    const startRecording = useCallback(() => {
        if (!isCameraActive || !videoRef.current?.srcObject) return;
        chunksRef.current = [];
        const stream = videoRef.current.srcObject as MediaStream;
        try {
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `teleprompter-${Date.now()}.webm`;
                a.click();
            };
            recorder.start(1000);
            setIsRecording(true);
            mediaRecorderRef.current = recorder;
        } catch (e) {
            console.error("Recorder error:", e);
        }
    }, [isCameraActive]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, []);

    const handleRecordClick = useCallback(() => {
        if (isRecording) stopRecording();
        else if (!isCameraActive) toggleCamera().then(startRecording);
        else startRecording();
    }, [isRecording, isCameraActive, toggleCamera, startRecording, stopRecording]);

    useEffect(() => {
        return () => {
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach(t => t.stop());
        };
    }, []);

    return { 
        videoRef, isCameraActive, isRecording, toggleCamera, 
        handleRecordClick, cameraCapabilities, cameraSettings, applyCameraConstraint 
    };
};