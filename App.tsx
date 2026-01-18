
import React, { useState, useEffect } from 'react';
import { AppMode, Message } from './types';
import Navigation from './components/Navigation';
import ChatInterface from './components/ChatInterface';
import ImageStudio from './components/ImageStudio';
import VideoStudio from './components/VideoStudio';
import LiveSession from './components/LiveSession';
import TourGuide from './components/TourGuide';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.TOUR_GUIDE);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: '你好！我是你的 AI 导游。请开启导览并对准你想了解的景物。',
      timestamp: Date.now()
    }
  ]);
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
      } else {
        setIsApiKeySelected(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectApiKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setIsApiKeySelected(true);
    }
  };

  const renderActiveMode = () => {
    switch (activeMode) {
      case AppMode.TOUR_GUIDE:
        return <TourGuide />;
      case AppMode.CHAT:
        return <ChatInterface messages={messages} setMessages={setMessages} />;
      case AppMode.IMAGE:
        return <ImageStudio setMessages={setMessages} />;
      case AppMode.VIDEO:
        return (
          <VideoStudio 
            isApiKeySelected={isApiKeySelected} 
            onOpenKeySelector={handleSelectApiKey} 
          />
        );
      case AppMode.LIVE:
        return <LiveSession />;
      default:
        return <TourGuide />;
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden flex-col md:flex-row">
      <Navigation activeMode={activeMode} setActiveMode={setActiveMode} />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Subtle Header */}
        <header className={`h-16 md:h-20 flex items-center justify-between px-8 border-b border-white/5 z-30 transition-all duration-700 ${
          activeMode === AppMode.TOUR_GUIDE ? 'translate-y-[-100%] absolute w-full' : 'relative'
        }`}>
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">
              AI <span className="text-blue-500">Laboratory</span>
            </h1>
            <div className="h-4 w-[1px] bg-white/10 hidden md:block"></div>
            <span className="hidden md:block text-[10px] font-bold text-slate-500 tracking-widest uppercase">Version 3.0 Experimental</span>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center px-4 py-1.5 rounded-full bg-slate-900 border border-white/5 text-[10px] font-black text-slate-400 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-3 shadow-[0_0_8px_#22c55e]"></span>
              Connection Secure
            </div>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden mb-24 md:mb-0">
          {renderActiveMode()}
        </div>
      </main>
    </div>
  );
};

export default App;
