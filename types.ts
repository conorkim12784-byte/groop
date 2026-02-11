
export interface GroupSettings {
  id: string;
  title: string;
  lockLinks: boolean;
  lockPhotos: boolean;
  lockVideos: boolean;
  lockStickers: boolean;
  lockForward: boolean;
  lockAbuse: boolean;
  lockVoice: boolean;
  lockAudio: boolean;
  lockAnimation: boolean;
  lockDocuments: boolean;
  lockInline: boolean;
  lockBots: boolean;
  lockContacts: boolean;
  lockNotices: boolean;
  lockChat: boolean;
  aiMode: 'formal' | 'funny' | 'smart';
  aiEnabled: boolean;
  warnLimit: number;
  muteDuration: number;
  welcomeEnabled: boolean;
  punishment: 'delete' | 'warn' | 'mute' | 'ban' | 'restrict';
  forcedSubChannel?: string;
  antiLiquidation: boolean;
  admins: number[];
  managers: number[];
  features: number[];
  silencers: number[];
  baners: number[];
  enrollers: number[];
  spamLimit: number;
  idPhoto: boolean;
}

export interface SecurityConfig {
  antiLink: boolean;
  antiAbuse: boolean;
  antiForward: boolean;
  antiSpam: boolean;
  aiResponse: boolean;
  welcomeMessage: boolean;
  autoBanThreshold: number;
  punishmentType: 'delete' | 'warn' | 'mute' | 'restrict' | 'ban';
}

export interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
  type: 'system' | 'user' | 'bot';
  status?: 'allowed' | 'warned' | 'blocked';
  isBot?: boolean;
}

export interface BotStats {
  messagesProcessed: number;
  threatsBlocked: number;
  aiInteractions: number;
  activeUsers: number;
}
