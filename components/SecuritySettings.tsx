
import React from 'react';
import { 
  Link2Off, 
  MessageCircleOff, 
  Zap, 
  UserPlus, 
  Image,
  Video,
  FileText,
  Repeat,
  Save,
  ShieldCheck
} from 'lucide-react';
import { SecurityConfig } from '../types';

interface SecuritySettingsProps {
  config: SecurityConfig;
  setConfig: React.Dispatch<React.SetStateAction<SecurityConfig>>;
}

const SettingsToggle = ({ title, description, icon: Icon, active, onChange }: any) => (
  <div className="flex items-center justify-between p-6 bg-slate-900 border border-slate-800 rounded-3xl hover:border-slate-700 transition-all shadow-lg">
    <div className="flex gap-4">
      <div className={`p-4 rounded-2xl ${active ? 'bg-blue-500/10 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-slate-800 text-slate-500'}`}>
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
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <ShieldCheck className="text-blue-500" />
            إدارة أقفال المجموعة م3
          </h2>
          <p className="text-slate-400">تحكم كامل في ميزات الأمان لـ {config.antiLink ? 'المجموعة مؤمنة' : 'المجموعة غير مؤمنة حالياً'}.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
          <Save size={20} />
          حفظ التغييرات
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingsToggle
          title="قفل الروابط"
          description="سيقوم البوت بحذف أي روابط ترسل في المجموعة فوراً."
          icon={Link2Off}
          active={config.antiLink}
          onChange={() => toggleSetting('antiLink')}
        />
        <SettingsToggle
          title="قفل التكرار"
          description="حماية المجموعة من هجمات السبام والرسائل المتكررة."
          icon={Repeat}
          active={config.antiSpam}
          onChange={() => toggleSetting('antiSpam')}
        />
        <SettingsToggle
          title="قفل الصور"
          description="منع إرسال الصور لغير المسؤولين (مطلوب رتبة ادمن)."
          icon={Image}
          active={true}
          onChange={() => {}}
        />
        <SettingsToggle
          title="قفل التوجيه"
          description="منع إعادة توجيه الرسائل من قنوات أو مجموعات أخرى."
          icon={Repeat}
          active={config.antiForward}
          onChange={() => toggleSetting('antiForward')}
        />
        <SettingsToggle
          title="الرد الذكي AI"
          description="تفعيل م1: البحث الديني والرد التلقائي عبر Gemini."
          icon={Zap}
          active={config.aiResponse}
          onChange={() => toggleSetting('aiResponse')}
        />
        <SettingsToggle
          title="الترحيب بالأعضاء"
          description="إرسال رسالة ترحيب مخصصة عند انضمام عضو جديد."
          icon={UserPlus}
          active={config.welcomeMessage}
          onChange={() => toggleSetting('welcomeMessage')}
        />
      </div>
    </div>
  );
};

export default SecuritySettings;
