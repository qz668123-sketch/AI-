
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

interface VideoStudioProps {
  isApiKeySelected: boolean;
  onOpenKeySelector: () => void;
}

const VideoStudio: React.FC<VideoStudioProps> = ({ isApiKeySelected, onOpenKeySelector }) => {
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setVideoUrl(null);
    setProgressStatus('Initializing generation...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution,
          aspectRatio
        }
      });

      setProgressStatus('Processing video (this may take a few minutes)...');
      
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        operation = await ai.operations.getVideosOperation({ operation });
        console.debug('Polling operation state:', operation.done);
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        setProgressStatus('Finalizing...');
        const fetchRes = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await fetchRes.blob();
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
      } else {
        throw new Error("No video URI returned.");
      }
    } catch (error: any) {
      console.error("Video Gen Error:", error);
      if (error.message?.includes("Requested entity was not found")) {
        alert("API Key error. Please re-select your key.");
        onOpenKeySelector();
      } else {
        alert("Failed to generate video. Note: Veo generation can be subject to capacity limits.");
      }
    } finally {
      setIsGenerating(false);
      setProgressStatus('');
    }
  };

  if (!isApiKeySelected) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-slate-900/20">
        <div className="max-w-md w-full glass p-10 rounded-3xl text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto">
            <i className="fas fa-key text-3xl text-indigo-400"></i>
          </div>
          <h2 className="text-2xl font-bold">API Key Required</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Veo video generation requires a valid API key from a paid Google Cloud project. 
            Please select your key to proceed.
          </p>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-xs text-indigo-400 hover:underline block">Learn about billing</a>
          <button 
            onClick={onOpenKeySelector}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row">
      <div className="w-full md:w-80 glass p-6 border-b md:border-b-0 md:border-r border-slate-800 space-y-8 overflow-y-auto">
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <i className="fas fa-video text-purple-400"></i> Motion Studio
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Director's Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Cinematic drone shot of..."
                className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Resolution</label>
              <div className="flex gap-2">
                {(['720p', '1080p'] as const).map(res => (
                  <button
                    key={res}
                    onClick={() => setResolution(res)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      resolution === res 
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Aspect Ratio</label>
              <div className="flex gap-2">
                {(['16:9', '9:16'] as const).map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      aspectRatio === ratio 
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {ratio === '16:9' ? 'Landscape (16:9)' : 'Portrait (9:16)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Generating...
            </>
          ) : (
            <>
              <i className="fas fa-film"></i>
              Render Video
            </>
          )}
        </button>
        {isGenerating && (
          <p className="text-[10px] text-center text-slate-500 animate-pulse italic">
            This typically takes 2-4 minutes. Keep the tab open.
          </p>
        )}
      </div>

      <div className="flex-1 bg-slate-900/40 p-6 md:p-12 flex items-center justify-center">
        {!videoUrl && !isGenerating && (
          <div className="text-center space-y-4 opacity-30">
            <i className="fas fa-clapperboard text-8xl"></i>
            <p className="text-lg font-medium">Render your masterpiece</p>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center gap-8 text-center max-w-md">
            <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-200">Veo is working...</h3>
              <p className="text-sm text-slate-400">{progressStatus}</p>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-purple-500 w-1/3 animate-[progress_3s_infinite]"></div>
            </div>
            <style>{`
              @keyframes progress {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(300%); }
              }
            `}</style>
          </div>
        )}

        {videoUrl && (
          <div className="w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl bg-black border border-slate-800">
            <video 
              src={videoUrl} 
              controls 
              autoPlay 
              loop 
              className="w-full h-auto aspect-video object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoStudio;
