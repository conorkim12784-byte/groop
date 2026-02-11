
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  Activity,
  Zap,
  Lock,
  Search,
  UserPlus,
  ShieldAlert
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ChatSimulator from './components/ChatSimulator';
import SecuritySettings from './components/SecuritySettings';
import Sidebar from './components/Sidebar';
import { SecurityConfig, BotStats } from './types';

const INITIAL_CONFIG: SecurityConfig = {
  antiLink: true,
  antiAbuse: true,
  antiForward: true,
  antiSpam: true,
  aiResponse: true,
  welcomeMessage: true,
  autoBanThreshold: 3,
  punishmentType: 'warn'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'settings'>('dashboard');
  const [config, setConfig] = useState<SecurityConfig>(INITIAL_CONFIG);
  const [stats, setStats] = useState<BotStats>({
    messagesProcessed: 4520,
    threatsBlocked: 212,
    aiInteractions: 890,
    activeUsers: 1240
  });

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans rtl">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={true} 
      />

      <main className="flex-1 overflow-y-auto mr-64">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header Summary */}
          <div className="flex items-center justify-between mb-8 bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">نظام {activeTab === 'dashboard' ? 'الإحصائيات' : activeTab === 'chat' ? 'المحاكاة' : 'الإعدادات'}</h1>
              <p className="text-slate-400">تحكم كامل في بوت تلجرام الاحترافي الخاص بك.</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-blue-600/20 px-4 py-2 rounded-2xl border border-blue-500/20 text-blue-400 flex items-center gap-2">
                <Search size={18} />
                <span>م1: البحث AI نشط</span>
              </div>
              <div className="bg-green-600/20 px-4 py-2 rounded-2xl border border-green-500/20 text-green-400 flex items-center gap-2">
                <Lock size={18} />
                <span>م2: الحماية مفعلة</span>
              </div>
            </div>
          </div>

          {activeTab === 'dashboard' && <Dashboard stats={stats} config={config} />}
          {activeTab === 'chat' && (
            <ChatSimulator 
              config={config} 
              onStatsUpdate={(type) => {
                setStats(prev => ({
                  ...prev,
                  messagesProcessed: type === 'message' ? prev.messagesProcessed + 1 : prev.messagesProcessed,
                  threatsBlocked: type === 'block' ? prev.threatsBlocked + 1 : prev.threatsBlocked,
                  aiInteractions: type === 'ai' ? prev.aiInteractions + 1 : prev.aiInteractions
                }));
              }} 
            />
          )}
          {activeTab === 'settings' && <SecuritySettings config={config} setConfig={setConfig} />}
        </div>
      </main>
    </div>
  );
};

export default App;
