
import React from 'react';
import { 
  ShieldCheck, 
  Link2Off, 
  MessageCircleOff, 
  Zap, 
  UserPlus, 
  AlertTriangle,
  Save,
  Image,
  Video,
  FileText,
  Repeat
} from 'lucide-react';
import { SecurityConfig } from '../types';

interface SecuritySettingsProps {
  config: SecurityConfig;
  setConfig: React.Dispatch<React.SetStateAction<SecurityConfig>>;
}

const SettingsToggle = ({ title, description, icon: Icon, active, onChange }: any) => (
  <div className="flex items-center justify-between p-6 bg-slate-900 border border-slate-800 rounded-3xl hover:border-slate-700 transition-all">
    <div className="flex gap-4">
      <div className={`p-4 rounded-2xl ${active ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-800 text-slate-500'}`}>
        <Icon size={24} />
      </div>
      <div>
        <h4 className="font-bold text-white mb-1">{title}</h4>
        <p className="text-xs text-slate-500 max-w-md">{description}</p>
      </div>
    </div>
    <button
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
        active ? 'bg-blue-600' : 'bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          active ? '-translate-x-6' : '-translate-x-1'
        }`}
      />
    </button>
  </div>
);

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ config, setConfig }) => {
  const toggleSetting = (key: keyof SecurityConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">إدارة أقفال المجموعة (م2)</h2>
          <p className="text-slate-400">تحكم في ما يسمح بإرساله داخل مجموعتك.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-600/20">
          <Save size={20} />
          تحديث الإعدادات
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingsToggle
          title="قفل الروابط"
          description="منع إرسال أي روابط خارجية للمجموعة."
          icon={Link2Off}
          active={config.antiLink}
          onChange={() => toggleSetting('antiLink')}
        />
        <SettingsToggle
          title="قفل التكرار (Anti-Spam)"
          description="حذف الرسائل المتكررة وحماية المجموعة."
          icon={Repeat}
          active={config.antiSpam}
          onChange={() => toggleSetting('antiSpam')}
        />
        <SettingsToggle
          title="قفل الصور"
          description="منع إرسال الصور في المجموعة."
          icon={Image}
          active={false} // تجريبي
          onChange={() => {}}
        />
        <SettingsToggle
          title="قفل الفيديوهات"
          description="منع إرسال المقاطع المرئية."
          icon={Video}
          active={false} // تجريبي
          onChange={() => {}}
        />
        <SettingsToggle
          title="الرد الذكي (AI)"
          description="تفعيل م1: البحث الديني والرد التلقائي."
          icon={Zap}
          active={config.aiResponse}
          onChange={() => toggleSetting('aiResponse')}
        />
        <SettingsToggle
          title="الترحيب والمغادرة"
          description="إرسال رسائل عند دخول أعضاء جدد."
          icon={UserPlus}
          active={config.welcomeMessage}
          onChange={() => toggleSetting('welcomeMessage')}
        />
      </div>
    </div>
  );
};

export default SecuritySettings;
