
import React from 'react';
import { AppMode } from '../types';

interface NavigationProps {
  activeMode: AppMode;
  setActiveMode: (mode: AppMode) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeMode, setActiveMode }) => {
  const menuItems = [
    { id: AppMode.TOUR_GUIDE, icon: 'fa-landmark', label: '导览', color: 'orange' },
    { id: AppMode.CHAT, icon: 'fa-feather', label: '灵感', color: 'blue' },
    { id: AppMode.IMAGE, icon: 'fa-wand-magic-sparkles', label: '画境', color: 'pink' },
    { id: AppMode.VIDEO, icon: 'fa-clapperboard', label: '映画', color: 'purple' },
    { id: AppMode.LIVE, icon: 'fa-ghost', label: '伴侣', color: 'green' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 glass h-full flex-col border-r border-slate-800/50 transition-all z-20">
        <div className="p-10">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 tour-gradient rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
               <i className="fas fa-compass text-white text-lg"></i>
             </div>
             <h1 className="text-xl font-bold tracking-tight text-white">AI <span className="text-orange-400">Voyage</span></h1>
           </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-3">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">核心工坊</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMode(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                activeMode === item.id 
                  ? `bg-slate-800/50 text-white` 
                  : 'text-slate-500 hover:text-slate-200'
              }`}
            >
              {activeMode === item.id && (
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${item.color}-500 shadow-[0_0_15px_rgba(0,0,0,0.5)]`}></div>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                activeMode === item.id 
                  ? `bg-${item.color}-500 text-white shadow-lg shadow-${item.color}-500/20` 
                  : 'bg-slate-900 text-slate-600 group-hover:bg-slate-800'
              }`}>
                <i className={`fas ${item.icon} text-lg`}></i>
              </div>
              <span className="font-semibold text-sm tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5">
           <div className="glass-light p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors">
             <img src="https://picsum.photos/seed/vip/100/100" className="w-10 h-10 rounded-full border border-white/10" alt="User" />
             <div>
               <p className="text-xs font-bold text-white">尊享会员</p>
               <p className="text-[10px] text-slate-500">探索等级: Lv.8</p>
             </div>
           </div>
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 glass rounded-3xl border border-white/10 flex justify-around items-center px-2 py-3 pb-safe z-50 shadow-2xl">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveMode(item.id)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
              activeMode === item.id ? 'scale-110' : 'opacity-40 grayscale'
            }`}
          >
            <div className={`w-12 h-10 flex items-center justify-center rounded-2xl transition-all ${
              activeMode === item.id ? `bg-${item.color}-500 text-white shadow-lg shadow-${item.color}-500/30` : ''
            }`}>
              <i className={`fas ${item.icon} text-lg`}></i>
            </div>
            <span className={`text-[9px] font-bold tracking-tighter ${activeMode === item.id ? 'text-white' : 'text-slate-400'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Navigation;
