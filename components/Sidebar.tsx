
import React from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  Bot
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'chat', label: 'محاكاة الجروب (AI)', icon: MessageSquare },
    { id: 'settings', label: 'إعدادات الحماية', icon: Settings },
  ];

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-64 bg-slate-900 border-l border-slate-800 transform transition-transform duration-300">
      <div className="flex flex-col h-full">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Guardia AI</h1>
            <p className="text-xs text-slate-400">نظام حماية التلجرام</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-slate-300">البوت متصل حالياً</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              يعمل بمحرك Gemini 3 المتطور لحماية مجموعتك على مدار الساعة.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
