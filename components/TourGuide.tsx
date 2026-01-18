
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
          width: { ideal: 1920 },
          height: { ideal: 1080 }
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
          systemInstruction: `你是全球顶级旅行专家与 AI 智能导游。你充满人文情怀且博学多才。
          当你看到文物、历史遗迹或特色地标时：
          1. 请先用一句充满意境的感叹开始。
          2. 讲解要深入浅出，像与老友漫步一样。
          3. 强调建筑的历史感和细节之美。
          4. 始终保持温文尔雅、专业的语气。`,
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
    <div className="relative w-full h-full flex flex-col bg-black overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity duration-1000" />
      <canvas ref={canvasRef} className="hidden" />

      {/* AR HUD Layers */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 pb-32 md:pb-8">
        {/* Top Bar */}
        <div className="flex justify-between items-start pt-safe">
          <div className="glass px-5 py-2.5 rounded-2xl flex items-center gap-3 border border-white/10 shadow-2xl">
            <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)] animate-pulse' : 'bg-slate-600'}`}></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black tracking-[0.2em] text-white/50 leading-none">REAL-TIME</span>
              <span className="text-xs font-bold text-white tracking-wide">{isActive ? '视觉解构中' : '设备就绪'}</span>
            </div>
          </div>
          <div className="flex gap-3 pointer-events-auto">
            <button className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-white/70 hover:text-white transition-all hover:bg-white/10">
              <i className="fas fa-expand-alt text-sm"></i>
            </button>
            <button className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-white/70 hover:text-white transition-all hover:bg-white/10">
              <i className="fas fa-ellipsis-h text-sm"></i>
            </button>
          </div>
        </div>

        {/* Dynamic AR Frame */}
        {isActive && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-80 h-80 relative">
               {/* Corner accents */}
               <div className="absolute top-0 left-0 w-12 h-12 border-t-[3px] border-l-[3px] border-orange-500 rounded-tl-3xl opacity-80"></div>
               <div className="absolute top-0 right-0 w-12 h-12 border-t-[3px] border-r-[3px] border-orange-500 rounded-tr-3xl opacity-80"></div>
               <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[3px] border-l-[3px] border-orange-500 rounded-bl-3xl opacity-80"></div>
               <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[3px] border-r-[3px] border-orange-500 rounded-br-3xl opacity-80"></div>
               
               {/* Floating Data Nodes */}
               <div className="absolute -top-16 left-1/2 -translate-x-1/2 glass px-3 py-1 rounded-full text-[9px] font-bold text-orange-400 border border-orange-500/20 animate-bounce">
                  AUTO FOCUS ACTIVE
               </div>

               {/* Scanning bar */}
               <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  <div className="w-full h-1/2 bg-gradient-to-b from-orange-500/10 to-transparent absolute top-0 animate-[scan_3s_infinite] opacity-50"></div>
                  <div className="w-full h-[1px] bg-orange-400/50 absolute top-0 animate-[scan_3s_infinite]"></div>
               </div>
            </div>
          </div>
        )}

        {/* Bottom Content Area */}
        <div className="space-y-8 pointer-events-auto">
          {latestTranscription && (
            <div className="glass p-6 rounded-[2.5rem] border border-white/10 shadow-2xl animate-fade-in mx-auto max-w-xl group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full tour-gradient flex items-center justify-center shadow-inner">
                  <i className="fas fa-feather-pointed text-[10px] text-white"></i>
                </div>
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">智能讲解</span>
              </div>
              <p className="text-[15px] text-slate-100 leading-relaxed font-medium tracking-wide">
                {latestTranscription}
              </p>
            </div>
          )}

          <div className="flex justify-center items-center gap-10 pb-8">
             {!isActive ? (
               <button 
                onClick={startTour}
                disabled={isConnecting}
                className="w-24 h-24 tour-gradient rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.4)] border-[6px] border-white/10 hover:scale-110 active:scale-95 transition-all duration-500 group"
               >
                 <div className="w-full h-full rounded-full flex flex-col items-center justify-center group-hover:bg-white/10 transition-colors">
                    {isConnecting ? (
                      <i className="fas fa-circle-notch fa-spin text-white text-2xl"></i>
                    ) : (
                      <>
                        <i className="fas fa-play text-white text-2xl ml-1"></i>
                        <span className="text-[9px] font-black mt-2 text-white/80 tracking-widest">START</span>
                      </>
                    )}
                 </div>
               </button>
             ) : (
               <button 
                onClick={stopTour}
                className="w-24 h-24 bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-2xl border-[6px] border-red-500/20 hover:border-red-500/40 active:scale-95 transition-all duration-500"
               >
                 <i className="fas fa-stop text-red-500 text-2xl"></i>
                 <span className="text-[9px] font-black mt-2 text-red-500 tracking-widest uppercase">END</span>
               </button>
             )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(200%); opacity: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default TourGuide;
