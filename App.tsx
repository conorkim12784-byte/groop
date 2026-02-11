
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  MessageSquare, 
  Settings, 
  Activity, 
  Users, 
  ShieldAlert,
  Zap,
  Lock,
  Menu,
  X,
  ShieldHalf,
  UserCheck
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ChatSimulator from './components/ChatSimulator';
import SecuritySettings from './components/SecuritySettings';
import Sidebar from './components/Sidebar';
import { SecurityConfig, BotStats } from './types';

const INITIAL_CONFIG: SecurityConfig = {
  antiLink: true,
  antiAbuse: true,
  antiForward: false,
  antiSpam: true,
  aiResponse: true,
  welcomeMessage: true,
  autoBanThreshold: 3,
  punishmentType: 'warn'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [config, setConfig] = useState<SecurityConfig>(INITIAL_CONFIG);
  const [stats, setStats] = useState<BotStats>({
    messagesProcessed: 2840,
    threatsBlocked: 156,
    aiInteractions: 412,
    activeUsers: 865
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <button 
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-blue-600 rounded-lg shadow-lg"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
      />

      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isSidebarOpen ? 'lg:mr-64' : 'mr-0'}`}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard stats={stats} config={config} />
          )}
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
          {activeTab === 'settings' && (
            <SecuritySettings config={config} setConfig={setConfig} />
          )}
        </div>
      </main>
    </div>
  );
};

// Fix: Added missing default export
export default App;
