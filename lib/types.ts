// Database model types
export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  status: 'new' | 'calling' | 'completed' | 'failed' | 'contacted' | 'qualified' | 'disqualified';
  source?: string | null;
  externalId?: string | null;
  createdAt: Date;
  calls?: Call[];
  interviewResponses?: InterviewResponse[];
  responses?: Record<string, string>;
}

export interface Call {
  id: string;
  driverId: string;
  agentId?: string | null;
  blandCallId?: string | null;
  vapiCallId?: string | null;
  startTime: Date;
  endTime?: Date | null;
  durationSeconds?: number | null;
  recordingUrl?: string | null;
  transcript?: string | null;
  summary?: string | null;
  status?: string | null;
  price?: number | null;
  callEndedBy?: string | null;
  answeredBy?: string | null;
  analysis?: string | null;
  variables?: string | null;
  driver?: Driver;
  agent?: Agent;
}

export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  questions: string; // JSON stringified
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewResponse {
  id: string;
  callId?: string | null;
  driverId?: string | null;
  questionId?: string | null;
  questionText?: string | null;
  answerText?: string | null;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiError {
  error: string;
  details?: string;
}

export interface SyncResult {
  name: string;
  phone: string;
  status: string;
  callId?: string;
  error?: string;
}

export interface SyncResponse {
  message: string;
  results: SyncResult[];
}

// Bland AI types
export interface BlandCallResponse {
  call_id: string;
  status: string;
}

export interface BlandTranscript {
  user: string;
  text: string;
}

// Dashboard stats
export interface DashboardStats {
  totalDrivers: number;
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
}

// Active call state
export interface ActiveCall {
  driverId: string;
  currentQuestionIndex: number;
  logs: string[];
}

// Question type from agent config
export interface AgentQuestion {
  id: string;
  text: string;
}



