
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, setMessages }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: input,
        config: {
          systemInstruction: "You are an elegant, highly intelligent personal AI consultant. Your tone is sophisticated, brief but insightful. Use Markdown for clarity.",
          temperature: 0.8,
        }
      });

      const aiMessage: Message = {
        role: 'model',
        content: response.text || "对不起，我暂时无法回应这个想法。",
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: "连接中断，请稍后再次开启对话。",
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div ref={scrollRef} className="flex-1 p-6 md:p-12 space-y-8 overflow-y-auto z-10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[90%] md:max-w-[75%] rounded-[2rem] p-6 shadow-xl ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-900/10' 
                : 'glass text-slate-200 rounded-tl-none border border-white/5'
            }`}>
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed tracking-wide font-medium">
                {msg.content}
              </div>
              <div className="flex items-center justify-end gap-2 mt-4 opacity-30 text-[9px] font-bold uppercase tracking-widest">
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <i className={`fas ${msg.role === 'user' ? 'fa-check-double' : 'fa-sparkles'}`}></i>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="glass rounded-[2rem] px-6 py-4 flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.1s]"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 pb-12 md:pb-8 z-20">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-[2.5rem] p-2 flex items-center gap-3 border border-white/10 shadow-2xl focus-within:border-blue-500/50 transition-all duration-500">
            <button className="w-12 h-12 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors">
              <i className="fas fa-plus"></i>
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="分享你的见闻或提问..."
              className="flex-1 bg-transparent border-none py-3 px-2 text-[15px] text-white focus:outline-none placeholder:text-slate-600 resize-none max-h-40"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-500 transition-all duration-300 disabled:opacity-20 disabled:grayscale shadow-lg shadow-blue-600/20 active:scale-90"
            >
              <i className="fas fa-paper-plane text-white text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
