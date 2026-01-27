
import { useState, useRef, useEffect, useCallback } from 'react';

export const useCamera = () => {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [capabilities, setCapabilities] = useState<MediaTrackCapabilities | null>(null);
    const [settings, setSettings] = useState<MediaTrackSettings | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const toggleCamera = useCallback(async () => {
        if (isCameraActive) {
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach(t => t.stop());
            if (videoRef.current) videoRef.current.srcObject = null;
            setIsCameraActive(false);
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsCameraActive(true);
                    const track = stream.getVideoTracks()[0];
                    if (track.getCapabilities) {
                        setCapabilities(track.getCapabilities());
                        setSettings(track.getSettings());
                    }
                }
            } catch (e) { alert("Camera access denied."); }
        }
    }, [isCameraActive]);

    const handleRecord = useCallback(() => {
        if (isRecording) {
            recorderRef.current?.stop();
            setIsRecording(false);
        } else if (isCameraActive) {
            chunksRef.current = [];
            const stream = videoRef.current?.srcObject as MediaStream;
            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = e => chunksRef.current.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `recording-${Date.now()}.webm`;
                a.click();
            };
            recorder.start();
            setIsRecording(true);
            recorderRef.current = recorder;
        } else {
            toggleCamera().then(() => handleRecord());
        }
    }, [isRecording, isCameraActive, toggleCamera]);

    useEffect(() => {
        return () => {
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach(t => t.stop());
        };
    }, []);

    return { videoRef, isCameraActive, isRecording, toggleCamera, handleRecord, capabilities, settings };
};
