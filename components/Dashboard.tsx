
import React from 'react';
import { 
  Users, 
  MessageSquare, 
  ShieldAlert, 
  Zap,
  Gamepad2,
  Trophy
} from 'lucide-react';
import { BotStats, SecurityConfig } from '../types';

interface DashboardProps {
  stats: BotStats;
  config: SecurityConfig;
}

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl hover:border-blue-500/20 transition-all group">
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 mb-4 inline-block`}>
      <Icon className={color.replace('bg-', 'text-')} size={24} />
    </div>
    <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ stats, config }) => {
  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">إحصائيات نظام سيلا 🛡️</h2>
          <p className="text-slate-400">نظام حماية السفاح المصري يعمل الآن بكامل طاقته.</p>
        </div>
        <div className="flex gap-2">
           <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/20">رتبة المطور: 100</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="الرسائل" value={stats.messagesProcessed} icon={MessageSquare} color="bg-blue-500" />
        <StatCard title="التهديدات" value={stats.threatsBlocked} icon={ShieldAlert} color="bg-red-500" />
        <StatCard title="الأعضاء" value={stats.activeUsers} icon={Users} color="bg-emerald-500" />
        <StatCard title="الألعاب النشطة" value={24} icon={Gamepad2} color="bg-purple-500" />
        <StatCard title="نقاط الموزعة" value={15200} icon={Trophy} color="bg-amber-500" />
        <StatCard title="ذكاء اصطناعي" value={stats.aiInteractions} icon={Zap} color="bg-cyan-500" />
      </div>
      
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <h3 className="text-lg font-bold text-white mb-4">أحدث الأنشطة</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800">
             <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
             <p className="text-sm text-slate-300">قام المطور برفع مدير جديد في مجموعة الدعم.</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800">
             <div className="w-2 h-2 bg-red-500 rounded-full"></div>
             <p className="text-sm text-slate-300">تم حظر حساب سبام حاول إرسال روابط محظورة.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
