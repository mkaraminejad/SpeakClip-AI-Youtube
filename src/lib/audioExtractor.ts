/**
 * Client-side audio extractor using the browser's Web Audio API.
 * Converts video/audio files into lightweight 16kHz mono WAV audio
 * ideal for Groq Whisper transcription (typically under 3-5 MB for 2-3 mins).
 */

export async function extractAudioForWhisper(file: File, maxDurationSeconds: number = 300): Promise<{
  blob: Blob;
  base64: string;
  duration: number;
}> {
  // If it's already a small audio file (under 20MB), we can read directly
  if (file.type.startsWith('audio/') && file.size < 20 * 1024 * 1024) {
    const base64 = await fileToBase64(file);
    return {
      blob: file,
      base64,
      duration: 120, // estimate, updated on playback
    };
  }

  // Use Web Audio API to decode audio track from video/audio container
  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API not supported in this browser.');
    }

    const audioCtx = new AudioContextClass();
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();

    const sampleRate = 16000; // Optimal for Whisper STT models
    const duration = Math.min(decodedBuffer.duration, maxDurationSeconds);
    const numSamples = Math.floor(duration * sampleRate);

    // Downsample and mix down to mono
    const monoData = new Float32Array(numSamples);
    const numChannels = decodedBuffer.numberOfChannels;

    const sourceRate = decodedBuffer.sampleRate;
    const ratio = sourceRate / sampleRate;

    // Get channel data
    const channels: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(decodedBuffer.getChannelData(c));
    }

    for (let i = 0; i < numSamples; i++) {
      const sourceIndex = Math.floor(i * ratio);
      let sum = 0;
      for (let c = 0; c < numChannels; c++) {
        sum += channels[c][sourceIndex] || 0;
      }
      monoData[i] = sum / numChannels;
    }

    // Encode as 16-bit PCM WAV
    const wavBlob = encodeWAV(monoData, sampleRate);
    const base64 = await blobToBase64(wavBlob);

    console.log(`[AudioExtractor] Extracted ${duration.toFixed(1)}s audio from ${file.name}: ${(wavBlob.size / 1024 / 1024).toFixed(2)} MB`);

    return {
      blob: wavBlob,
      base64,
      duration,
    };
  } catch (err: any) {
    console.warn('[AudioExtractor] Web Audio extraction failed, falling back to direct slice:', err);
    // Fallback: send direct slice if under 25MB
    const slice = file.size > 22 * 1024 * 1024 ? file.slice(0, 22 * 1024 * 1024) : file;
    const base64 = await fileToBase64(slice);
    return {
      blob: slice,
      base64,
      duration: 120,
    };
  }
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp sample to [-1, 1]
    const s = Math.max(-1, Math.min(1, samples[i]));
    // Convert to 16-bit signed integer
    const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function fileToBase64(fileOrBlob: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const b64 = res.split(',')[1] || res;
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return fileToBase64(blob);
}
