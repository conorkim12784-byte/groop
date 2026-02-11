
export interface GroupSettings {
  id: string;
  title: string;
  lockLinks: boolean;
  lockPhotos: boolean;
  lockStickers: boolean;
  lockForward: boolean;
  lockAbuse: boolean;
  lockNSFW: boolean;
  aiMode: 'formal' | 'funny' | 'smart';
  aiEnabled: boolean;
  warnLimit: number;
  muteDuration: number;
  welcomeEnabled: boolean;
  punishment: 'delete' | 'warn' | 'mute' | 'ban' | 'restrict';
  forcedSubChannel?: string;
  antiLiquidation: boolean;
  customRanks: Record<string, string[]>; // name: permissions[]
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

export interface UserWarning {
  count: number;
  lastWarned: Date;
}

export interface BotStats {
  messagesProcessed: number;
  threatsBlocked: number;
  aiInteractions: number;
  activeUsers: number;
}
