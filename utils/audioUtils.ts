
export const decodeAudioData = async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Gemini TTS returns raw 16-bit PCM audio at 24kHz.
  // We must decode manually as browsers expect a file header (WAV/MP3) for decodeAudioData.
  
  // Ensure even byte length for Int16Array
  const buffer = bytes.byteLength % 2 === 0 
    ? bytes.buffer 
    : bytes.buffer.slice(0, bytes.byteLength - 1);

  const pcmData = new Int16Array(buffer);
  const channels = 1;
  const sampleRate = 24000;
  
  const audioBuffer = ctx.createBuffer(channels, pcmData.length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  
  for (let i = 0; i < pcmData.length; i++) {
      // Normalize to float [-1.0, 1.0]
      channelData[i] = pcmData[i] / 32768.0;
  }
  
  return audioBuffer;
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/wav;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
