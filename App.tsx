
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
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden flex-col md:flex-row">
      <Navigation activeMode={activeMode} setActiveMode={setActiveMode} />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header - Hidden on Mobile Tour Mode for full screen */}
        <header className={`h-14 md:h-16 flex items-center justify-between px-6 glass border-b border-slate-800 z-10 transition-transform ${
          activeMode === AppMode.TOUR_GUIDE ? 'md:translate-y-0 -translate-y-full absolute w-full top-0' : ''
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              activeMode === AppMode.TOUR_GUIDE ? 'bg-orange-500' : 'bg-blue-500'
            }`}>
              <i className="fas fa-sparkles text-white text-[10px]"></i>
            </div>
            <h1 className="text-lg font-bold tracking-tight">AI Guide</h1>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex items-center px-3 py-1 rounded-full bg-slate-800/80 text-[10px] font-medium text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Gemini 2.5
            </div>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden bg-black mb-16 md:mb-0">
          {renderActiveMode()}
        </div>
      </main>
    </div>
  );
};

export default App;
