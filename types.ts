
export enum AppMode {
  CHAT = 'CHAT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  LIVE = 'LIVE',
  TOUR_GUIDE = 'TOUR_GUIDE'
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  type?: 'text' | 'image' | 'video';
  mediaUrl?: string;
  timestamp: number;
}

export interface GenerationState {
  isGenerating: boolean;
  progress: number;
  status: string;
}
