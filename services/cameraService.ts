
export const CameraService = {
    async start(videoEl: HTMLVideoElement): Promise<MediaStream> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 }, 
                    height: { ideal: 480 },
                    facingMode: 'user'
                } 
            });
            videoEl.srcObject = stream;
            await videoEl.play();
            return stream;
        } catch (err) {
            console.error("Camera start failed:", err);
            throw err;
        }
    },

    stop(stream: MediaStream | null) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    },

    captureFrame(videoEl: HTMLVideoElement): string | null {
        if (!videoEl || videoEl.paused || videoEl.ended) return null;
        
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 225; // Maintain 4:3 aspect ratio approximately
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        // Draw current video frame to canvas
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        
        // Return base64 jpeg
        return canvas.toDataURL('image/jpeg', 0.8);
    }
};
