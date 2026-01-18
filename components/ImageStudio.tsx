
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Message } from '../types';

interface ImageStudioProps {
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const ImageStudio: React.FC<ImageStudioProps> = ({ setMessages }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setResultImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          setResultImage(imageUrl);
          foundImage = true;
          
          // Also log to chat
          setMessages(prev => [...prev, {
            role: 'model',
            content: `Generated image: "${prompt}"`,
            type: 'image',
            mediaUrl: imageUrl,
            timestamp: Date.now()
          }]);
          break;
        }
      }

      if (!foundImage) {
        alert("Failed to extract image from response.");
      }
    } catch (error) {
      console.error("Image Gen Error:", error);
      alert("Error generating image. It might be due to safety filters or model availability.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Control Panel */}
      <div className="w-full md:w-80 glass p-6 border-b md:border-b-0 md:border-r border-slate-800 space-y-8 overflow-y-auto">
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <i className="fas fa-magic text-pink-400"></i> Forge Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision..."
                className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-pink-500 transition-all resize-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {['1:1', '4:3', '16:9', '3:4', '9:16'].map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                      aspectRatio === ratio 
                        ? 'bg-pink-500/20 border-pink-500 text-pink-300' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Forging...
            </>
          ) : (
            <>
              <i className="fas fa-sparkles"></i>
              Generate Art
            </>
          )}
        </button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-slate-900/40 p-10 flex items-center justify-center relative">
        {!resultImage && !isGenerating && (
          <div className="text-center space-y-4 opacity-30">
            <i className="fas fa-image text-8xl"></i>
            <p className="text-lg font-medium">Your creation will appear here</p>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="w-80 h-80 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center">
              <i className="fas fa-palette text-4xl text-slate-600"></i>
            </div>
            <p className="text-slate-400">Gemini is sketching your prompt...</p>
          </div>
        )}

        {resultImage && (
          <div className="max-w-3xl w-full group relative">
            <img 
              src={resultImage} 
              alt="Generated Result" 
              className="w-full rounded-2xl shadow-2xl border border-slate-700 transition-transform group-hover:scale-[1.01]" 
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = resultImage;
                  link.download = `gemini-art-${Date.now()}.png`;
                  link.click();
                }}
                className="p-3 bg-black/60 backdrop-blur rounded-full hover:bg-black/80 transition-colors"
                title="Download"
              >
                <i className="fas fa-download"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageStudio;
