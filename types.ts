
export interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
  isAdmin?: boolean;
  isBot?: boolean;
  type: 'system' | 'user' | 'bot';
  status?: 'allowed' | 'deleted' | 'warned';
}

export interface SecurityConfig {
  antiLink: boolean;
  antiSpam: boolean;
  aiResponse: boolean;
  welcomeMessage: boolean;
  autoBanThreshold: number;
}

export interface BotStats {
  messagesProcessed: number;
  threatsBlocked: number;
  aiInteractions: number;
  activeUsers: number;
}
