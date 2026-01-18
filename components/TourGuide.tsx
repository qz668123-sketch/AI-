
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// Audio Helpers
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const TourGuide: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [latestTranscription, setLatestTranscription] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sessionRef = useRef<any>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const startTour = async () => {
    try {
      setIsConnecting(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inCtx, output: outCtx };

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);

            const audioSource = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
              }));
            };
            audioSource.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);

            frameIntervalRef.current = window.setInterval(() => {
              if (canvasRef.current && videoRef.current) {
                const canvas = canvasRef.current;
                const video = videoRef.current;
                canvas.width = 640;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                sessionPromise.then(s => s.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'image/jpeg' }
                }));
              }
            }, 1500);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64Audio && outCtx) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.outputTranscription) {
              setLatestTranscription(message.serverContent.outputTranscription.text);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => stopTour(),
          onerror: (e) => console.error(e)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: `你是全球顶尖的 AI 智能导游。你能够通过手机镜头实时看见世界。
          当你看到文物、景点或地标时，请用生动、博学、像人类导游一样的口吻开始讲解。
          你可以讲历史、讲艺术、讲趣闻。用户随时可能打断你提问，请友好地回应。
          如果光线太暗或看不清，请提示用户。`,
          outputAudioTranscription: {}
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  const stopTour = useCallback(() => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (sessionRef.current) sessionRef.current.close();
    if (audioContextsRef.current) {
      audioContextsRef.current.input.close();
      audioContextsRef.current.output.close();
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setIsActive(false);
    setLatestTranscription('');
  }, []);

  useEffect(() => () => stopTour(), [stopTour]);

  return (
    <div className="relative w-full h-full flex flex-col bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {/* AR HUD */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 pb-24 md:pb-6">
        <div className="flex justify-between items-start pt-safe">
          <div className="glass px-4 py-2 rounded-2xl flex items-center gap-2 border-l-4 border-orange-500">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-orange-500 animate-pulse' : 'bg-slate-500'}`}></div>
            <p className="text-[10px] font-bold tracking-widest uppercase">{isActive ? 'LIVE SCAN' : 'READY'}</p>
          </div>
          <button className="w-10 h-10 rounded-full glass flex items-center justify-center pointer-events-auto text-white/50">
            <i className="fas fa-cog"></i>
          </button>
        </div>

        {/* Dynamic Scanning Frame */}
        {isActive && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-72 h-72 border border-white/20 rounded-[2rem] relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-xl"></div>
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-xl"></div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-xl"></div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-xl"></div>
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-[scan_2.5s_infinite]"></div>
            </div>
          </div>
        )}

        <div className="space-y-6 pointer-events-auto">
          {latestTranscription && (
            <div className="glass p-5 rounded-3xl border border-white/10 shadow-2xl animate-fade-in mx-auto max-w-lg">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-comment-dots text-orange-500 text-xs"></i>
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-tighter">AI 讲解中</span>
              </div>
              <p className="text-sm text-slate-100 leading-relaxed font-medium">{latestTranscription}</p>
            </div>
          )}

          <div className="flex justify-center items-center gap-6 pb-6">
             {!isActive ? (
               <button 
                onClick={startTour}
                disabled={isConnecting}
                className="w-20 h-20 bg-orange-600 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-white/20 hover:scale-110 active:scale-95 transition-all"
               >
                 {isConnecting ? <i className="fas fa-spinner fa-spin text-white"></i> : <i className="fas fa-play text-white text-xl"></i>}
                 <span className="text-[10px] font-bold mt-1 text-white">GO</span>
               </button>
             ) : (
               <button 
                onClick={stopTour}
                className="w-20 h-20 bg-red-600 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-white/20 active:scale-95 transition-all"
               >
                 <i className="fas fa-stop text-white text-xl"></i>
                 <span className="text-[10px] font-bold mt-1 text-white">STOP</span>
               </button>
             )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(288px); opacity: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default TourGuide;
