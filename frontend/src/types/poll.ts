export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  options: PollOption[];
  total_votes: number;
  created_at: string;
  updated_at?: string;
  is_active: boolean;
}

export interface CreatePollInput {
  title: string;
  description?: string;
  options: string[];
}

export interface VotePayload {
  option_id: string;
  voter_id?: string;
}

export interface VoteEvent {
  type: string;
  poll_id: string;
  option_id?: string;
  total_votes: number;
  options: PollOption[];
  timestamp: string;
}

export interface ServerHealth {
  status: 'ok' | 'degraded' | 'error' | 'disconnected';
  timestamp?: string;
  services?: {
    mongodb: boolean;
    redis: boolean;
  };
  version?: string;
}
