
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// Simple manual encoding/decoding as required
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

const LiveSession: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inCtx, output: outCtx };

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log('Live Session Connected');
            setIsActive(true);
            setIsConnecting(false);

            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle output audio
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64Audio && outCtx) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            // Handle transcription display
            if (message.serverContent?.outputTranscription) {
               const text = message.serverContent.outputTranscription.text;
               setTranscriptions(prev => [...prev.slice(-10), `Model: ${text}`]);
            }
            if (message.serverContent?.inputTranscription) {
               const text = message.serverContent.inputTranscription.text;
               setTranscriptions(prev => [...prev.slice(-10), `You: ${text}`]);
            }
          },
          onerror: (e) => console.error('Live Error:', e),
          onclose: () => {
            setIsActive(false);
            setIsConnecting(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: 'You are a supportive and conversational creative mentor.',
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error('Failed to start session:', error);
      setIsConnecting(false);
    }
  };

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextsRef.current) {
      audioContextsRef.current.input.close();
      audioContextsRef.current.output.close();
      audioContextsRef.current = null;
    }
    setIsActive(false);
  }, []);

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-2xl w-full text-center space-y-12">
        <div className="relative">
          <div className={`w-40 h-40 mx-auto rounded-full flex items-center justify-center border-4 transition-all duration-700 ${
            isActive ? 'border-green-500 shadow-[0_0_50px_-12px_rgba(34,197,94,0.5)] scale-110' : 'border-slate-800'
          }`}>
            <div className={`w-32 h-32 rounded-full flex items-center justify-center ${isActive ? 'bg-green-500/10' : 'bg-slate-800/50'}`}>
              <i className={`fas fa-microphone text-4xl transition-colors duration-500 ${isActive ? 'text-green-500 animate-pulse' : 'text-slate-600'}`}></i>
            </div>
          </div>
          {isActive && (
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border border-green-500/20 rounded-full animate-ping"></div>
             </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold">{isActive ? 'Session Active' : 'Start Voice Conversation'}</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            Experience ultra-low latency multimodal interaction with Gemini 2.5. Talk naturally, just like with a human.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          {!isActive ? (
            <button
              onClick={startSession}
              disabled={isConnecting}
              className="px-10 py-5 bg-green-600 hover:bg-green-500 text-white rounded-full font-bold text-lg transition-all shadow-xl shadow-green-900/20 flex items-center gap-3 disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Connecting...
                </>
              ) : (
                <>
                  <i className="fas fa-play"></i>
                  Begin Live Session
                </>
              )}
            </button>
          ) : (
            <button
              onClick={stopSession}
              className="px-10 py-5 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-lg transition-all shadow-xl shadow-red-900/20 flex items-center gap-3"
            >
              <i className="fas fa-stop"></i>
              End Session
            </button>
          )}
        </div>

        {/* Live Transcription Preview */}
        {isActive && (
          <div className="glass rounded-2xl p-6 h-48 overflow-y-auto text-left space-y-2 border border-slate-700/50">
             {transcriptions.length === 0 && <p className="text-slate-500 italic text-sm">Transcriptions will appear here...</p>}
             {transcriptions.map((t, i) => (
                <p key={i} className={`text-sm ${t.startsWith('You:') ? 'text-blue-400' : 'text-green-400'}`}>
                   {t}
                </p>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveSession;
