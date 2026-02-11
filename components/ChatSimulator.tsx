
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ShieldAlert, Zap, Trash2, Clock } from 'lucide-react';
import { Message, SecurityConfig } from '../types';
import { getAIResponse, checkIsToxic } from '../services/geminiService';

interface ChatSimulatorProps {
  config: SecurityConfig;
  onStatsUpdate: (type: 'message' | 'block' | 'ai') => void;
}

const ChatSimulator: React.FC<ChatSimulatorProps> = ({ config, onStatsUpdate }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      user: 'نظام الحماية',
      text: 'تم تفعيل بوت Guardia AI. المجموعة الآن تحت الحماية.',
      timestamp: new Date(),
      type: 'system'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      user: 'أحمد (عضو)',
      text: inputText,
      timestamp: new Date(),
      type: 'user',
      status: 'allowed'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    onStatsUpdate('message');

    // Security Scan
    setIsTyping(true);
    
    // 1. Anti-Link Check
    if (config.antiLink && (inputText.includes('http') || inputText.includes('www.'))) {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            user: 'Guardia AI',
            text: 'عذراً، يمنع إرسال الروابط في هذه المجموعة. تم حذف الرسالة.',
            timestamp: new Date(),
            type: 'bot',
            status: 'warned'
          }
        ]);
        onStatsUpdate('block');
        setIsTyping(false);
      }, 800);
      return;
    }

    // 2. AI Toxicity Scan
    const safetyCheck = await checkIsToxic(inputText);
    if (safetyCheck.isToxic) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          user: 'Guardia AI',
          text: `تحذير: رسالتك تنتهك القوانين (${safetyCheck.reason}). يرجى الالتزام بالقواعد.`,
          timestamp: new Date(),
          type: 'bot',
          status: 'warned'
        }
      ]);
      onStatsUpdate('block');
      setIsTyping(false);
      return;
    }

    // 3. AI Smart Response (Triggered by keyword or mentioning bot)
    if (config.aiResponse && (inputText.toLowerCase().includes('bot') || inputText.toLowerCase().includes('بوت') || inputText.length > 5)) {
      const aiReply = await getAIResponse(inputText);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 3).toString(),
          user: 'Guardia AI',
          text: aiReply,
          timestamp: new Date(),
          isBot: true,
          type: 'bot'
        }
      ]);
      onStatsUpdate('ai');
    }
    
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="text-blue-500" />
            محاكاة التفاعل والحماية
          </h2>
          <p className="text-sm text-slate-400">جرب إرسال رسائل عادية أو روابط أو كلمات مسيئة لترى رد فعل البوت.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
          <Clock size={16} className="text-slate-400" />
          <span className="text-xs text-slate-400">توقيت السيرفر: {new Date().toLocaleTimeString('ar-EG')}</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl backdrop-blur-sm">
        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.type === 'bot' ? 'items-start' : msg.type === 'system' ? 'items-center' : 'items-end'}`}
            >
              {msg.type !== 'system' && (
                <span className="text-[10px] text-slate-500 mb-1 px-2">{msg.user}</span>
              )}
              
              <div 
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                  msg.type === 'system' 
                  ? 'bg-slate-800/80 text-slate-400 text-xs py-1 px-4 border border-slate-700' 
                  : msg.type === 'bot'
                  ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-br-none'
                  : 'bg-slate-800 text-slate-100 rounded-bl-none'
                } ${msg.status === 'warned' ? 'bg-red-500/20 text-red-200 border-red-500/30' : ''}`}
              >
                {msg.text}
                {msg.status === 'warned' && (
                  <ShieldAlert size={14} className="inline mr-2 text-red-400" />
                )}
                {msg.isBot && !msg.status && (
                  <Zap size={14} className="inline mr-2 text-amber-400" />
                )}
              </div>
              <span className="text-[9px] text-slate-600 mt-1 px-1">
                {msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-2 text-slate-500 text-xs bg-slate-800/30 w-fit px-4 py-2 rounded-full border border-slate-700">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              البوت يحلل الرسالة...
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-slate-800">
          <div className="relative flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب رسالة للمجموعة..."
              className="flex-1 bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white p-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <Send size={20} className="rotate-180" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatSimulator;
