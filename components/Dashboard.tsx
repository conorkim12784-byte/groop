
import React from 'react';
import { 
  Users, 
  MessageSquare, 
  ShieldAlert, 
  Zap,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { BotStats, SecurityConfig } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface DashboardProps {
  stats: BotStats;
  config: SecurityConfig;
}

const data = [
  { name: '00:00', msgs: 400, threats: 24 },
  { name: '04:00', msgs: 300, threats: 13 },
  { name: '08:00', msgs: 900, threats: 98 },
  { name: '12:00', msgs: 1200, threats: 45 },
  { name: '16:00', msgs: 1500, threats: 120 },
  { name: '20:00', msgs: 1800, threats: 32 },
];

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl hover:border-slate-700 transition-all group">
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 mb-4`}>
        <Icon className={color.replace('bg-', 'text-')} size={24} />
      </div>
      <span className="flex items-center text-green-400 text-xs font-medium">
        {trend} <ArrowUpRight size={14} className="mr-1" />
      </span>
    </div>
    <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ stats, config }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-white mb-2">مرحباً بك في Guardia AI</h2>
        <p className="text-slate-400">إليك نظرة عامة على نشاط البوت في المجموعة.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="الرسائل المعالجة" 
          value={stats.messagesProcessed} 
          icon={MessageSquare} 
          color="bg-blue-500" 
          trend="+12%"
        />
        <StatCard 
          title="التهديدات التي تم حظرها" 
          value={stats.threatsBlocked} 
          icon={ShieldAlert} 
          color="bg-red-500" 
          trend="+5%"
        />
        <StatCard 
          title="تفاعلات الذكاء الاصطناعي" 
          value={stats.aiInteractions} 
          icon={Zap} 
          color="bg-amber-500" 
          trend="+28%"
        />
        <StatCard 
          title="الأعضاء النشطون" 
          value={stats.activeUsers} 
          icon={Users} 
          color="bg-emerald-500" 
          trend="+2%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={20} />
            تحليل نشاط المجموعة (24 ساعة)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="msgs" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMsgs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Panel */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <h3 className="text-lg font-bold mb-6">حالة الحماية النشطة</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
              <span className="text-slate-300">حماية الروابط</span>
              <span className={`px-2 py-1 rounded text-[10px] font-bold ${config.antiLink ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {config.antiLink ? 'مفعل' : 'معطل'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
              <span className="text-slate-300">الرد الذكي (AI)</span>
              <span className={`px-2 py-1 rounded text-[10px] font-bold ${config.aiResponse ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {config.aiResponse ? 'مفعل' : 'معطل'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
              <span className="text-slate-300">منع السبام</span>
              <span className={`px-2 py-1 rounded text-[10px] font-bold ${config.antiSpam ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {config.antiSpam ? 'مفعل' : 'معطل'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
              <span className="text-slate-300">رسائل الترحيب</span>
              <span className={`px-2 py-1 rounded text-[10px] font-bold ${config.welcomeMessage ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {config.welcomeMessage ? 'مفعل' : 'معطل'}
              </span>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl">
            <p className="text-xs text-blue-400 leading-relaxed">
              <strong>نصيحة:</strong> فعل ميزة "الرد الذكي" لتقليل عبء الإشراف وتوفير إجابات فورية للأعضاء الجدد.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
