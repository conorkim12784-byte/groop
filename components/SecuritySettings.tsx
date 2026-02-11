
import React from 'react';
import { 
  ShieldCheck, 
  Link2Off, 
  MessageCircleOff, 
  Zap, 
  UserPlus, 
  AlertTriangle,
  Save
} from 'lucide-react';
import { SecurityConfig } from '../types';

interface SecuritySettingsProps {
  config: SecurityConfig;
  setConfig: React.Dispatch<React.SetStateAction<SecurityConfig>>;
}

const SettingsToggle = ({ title, description, icon: Icon, active, onChange }: any) => (
  <div className="flex items-center justify-between p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all">
    <div className="flex gap-4">
      <div className={`p-3 rounded-xl ${active ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-800 text-slate-500'}`}>
        <Icon size={24} />
      </div>
      <div>
        <h4 className="font-bold text-white mb-1">{title}</h4>
        <p className="text-xs text-slate-500 max-w-md">{description}</p>
      </div>
    </div>
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        active ? 'bg-blue-600' : 'bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
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
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">إعدادات الحماية</h2>
          <p className="text-slate-400">تحكم في الطريقة التي يتفاعل بها البوت مع الأعضاء.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95">
          <Save size={18} />
          حفظ التغييرات
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4">
        <SettingsToggle
          title="حماية الروابط (Anti-Link)"
          description="حذف تلقائي للرسائل التي تحتوي على روابط لزيادة أمان المجموعة ومنع الترويج."
          icon={Link2Off}
          active={config.antiLink}
          onChange={() => toggleSetting('antiLink')}
        />
        <SettingsToggle
          title="كشف الرسائل المزعجة (Anti-Spam)"
          description="استخدام الذكاء الاصطناعي للكشف عن الرسائل المتكررة أو العشوائية."
          icon={MessageCircleOff}
          active={config.antiSpam}
          onChange={() => toggleSetting('antiSpam')}
        />
        <SettingsToggle
          title="الرد الذكي (AI Responses)"
          description="تفعيل محرك Gemini للرد على استفسارات الأعضاء وتوجيههم بشكل آلي."
          icon={Zap}
          active={config.aiResponse}
          onChange={() => toggleSetting('aiResponse')}
        />
        <SettingsToggle
          title="رسائل الترحيب التلقائية"
          description="إرسال رسالة ترحيب مخصصة للأعضاء الجدد تحتوي على قوانين المجموعة."
          icon={UserPlus}
          active={config.welcomeMessage}
          onChange={() => toggleSetting('welcomeMessage')}
        />
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl">
        <div className="flex gap-4">
          <div className="text-amber-500">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h4 className="font-bold text-amber-500 mb-1">تنبيه هام حول الذكاء الاصطناعي</h4>
            <p className="text-sm text-amber-200/70 leading-relaxed">
              تفعيل ميزة الرد الذكي قد يستهلك حصة الـ API الخاصة بك بشكل أسرع. نوصي بتفعيلها فقط في المجموعات النشطة التي تحتاج للدعم الفني المستمر.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
