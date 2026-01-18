
import React from 'react';
import { AppMode } from '../types';

interface SidebarProps {
  activeMode: AppMode;
  setActiveMode: (mode: AppMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeMode, setActiveMode }) => {
  const menuItems = [
    { id: AppMode.TOUR_GUIDE, icon: 'fa-camera-retro', label: 'AI 导游', color: 'orange' },
    { id: AppMode.CHAT, icon: 'fa-comments', label: '智能对话', color: 'blue' },
    { id: AppMode.IMAGE, icon: 'fa-image', label: '图片创作', color: 'pink' },
    { id: AppMode.VIDEO, icon: 'fa-video', label: '视频生成', color: 'purple' },
    { id: AppMode.LIVE, icon: 'fa-microphone', label: '实时语音', color: 'green' },
  ];

  return (
    <aside className="w-20 md:w-64 glass h-full flex flex-col border-r border-slate-800 transition-all">
      <div className="p-6 hidden md:block">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Workspace</p>
      </div>

      <nav className="flex-1 px-3 space-y-2 mt-4 md:mt-0">
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
            <span className="hidden md:block font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden ring-2 ring-slate-800">
            <img src="https://picsum.photos/seed/tour/100/100" alt="Avatar" />
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold truncate">游客模式</p>
            <p className="text-[10px] text-slate-500">地理位置: 已激活</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
