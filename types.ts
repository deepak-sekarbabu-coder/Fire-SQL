export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  message?: string;
  type: 'read' | 'write' | 'error';
  collectionName?: string;
}

export interface QueryHistoryItem {
  query: string;
  timestamp: number;
  status: 'success' | 'error';
}

export enum AppState {
  LOGIN = 'LOGIN',
  CONFIG = 'CONFIG',
  EDITOR = 'EDITOR',
}