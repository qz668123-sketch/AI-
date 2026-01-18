
import React from 'react';
import { AppMode } from '../types';

interface NavigationProps {
  activeMode: AppMode;
  setActiveMode: (mode: AppMode) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeMode, setActiveMode }) => {
  const menuItems = [
    { id: AppMode.TOUR_GUIDE, icon: 'fa-camera-retro', label: '导览', color: 'orange' },
    { id: AppMode.CHAT, icon: 'fa-comments', label: '对话', color: 'blue' },
    { id: AppMode.IMAGE, icon: 'fa-image', label: '绘画', color: 'pink' },
    { id: AppMode.VIDEO, icon: 'fa-video', label: '视频', color: 'purple' },
    { id: AppMode.LIVE, icon: 'fa-microphone', label: '实时', color: 'green' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 glass h-full flex-col border-r border-slate-800 transition-all z-20">
        <div className="p-8">
           <h1 className="text-xl font-bold tracking-tight">AI <span className="gradient-text">Studio</span></h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMode(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${
                activeMode === item.id 
                  ? `bg-slate-800 text-white shadow-lg` 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                activeMode === item.id ? `bg-${item.color}-500/20 text-${item.color}-400` : 'bg-slate-800 text-slate-500'
              }`}>
                <i className={`fas ${item.icon} text-lg`}></i>
              </div>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-800 flex justify-around items-center px-2 py-3 pb-safe z-50">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveMode(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeMode === item.id ? 'text-white scale-110' : 'text-slate-500'
            }`}
          >
            <div className={`w-12 h-8 flex items-center justify-center rounded-full transition-colors ${
              activeMode === item.id ? `bg-${item.color}-500/20 text-${item.color}-400` : ''
            }`}>
              <i className={`fas ${item.icon} text-lg`}></i>
            </div>
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Navigation;
