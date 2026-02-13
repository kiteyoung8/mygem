export enum AppMode {
  CHAT = 'chat',
  SEARCH = 'search',
  REPORT = 'report',
  PRESENTATION = 'presentation',
  DRAWING = 'drawing'
}

export interface Message {
  id: string;
  role: 'user' | 'ai' | 'system';
  text: string;
  thinking?: string; // For "Reasoning" display
  timestamp: number;
  meta?: {
    model?: string;
    image?: string;
    mime?: string;
    fileName?: string;
    docUrl?: string; // For Reports/PPTs
    sources?: Array<{title: string, url: string}>;
  };
}

export interface Session {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
}

export interface PptOptions {
  length: number;
  density: 'detailed' | 'brief';
  theme: string;
  pptMode: 'hybrid' | 'geometric' | 'ai_visual';
  visualStyle: string;
  language: string; // New: Output language
  audience: string; // New: Target audience
}

export interface ApiResponse {
  status: 'success' | 'error';
  reply?: string;
  error?: string;
  model?: string;
  image?: string;
  mime?: string;
  thinking?: string; // New field for thought process
  sources?: Array<any>;
}