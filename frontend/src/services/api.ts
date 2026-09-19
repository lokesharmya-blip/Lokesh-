import { CreatePollInput, Poll, ServerHealth, VotePayload } from '../types/poll';

// Get API base URL with fallback to standard Go Gin port 8080
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Checks connectivity and health of the Go backend, MongoDB, and Redis.
 */
export async function checkBackendHealth(): Promise<ServerHealth> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new ApiError(`Health check returned HTTP ${res.status}`, res.status);
    }

    const data = await res.json();
    return data as ServerHealth;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Connection timed out while connecting to Go backend');
    }
    throw new ApiError(
      err instanceof Error ? err.message : 'Unable to connect to Go backend'
    );
  }
}

/**
 * Fetches all polls from the Go Gin backend (backed by MongoDB).
 */
export async function fetchPolls(): Promise<Poll[]> {
  const res = await fetch(`${API_BASE_URL}/api/polls`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(errorBody.error || `Failed to fetch polls (HTTP ${res.status})`, res.status);
  }

  const data = await res.json();
  return data.polls || [];
}

/**
 * Fetches a single poll by ID.
 */
export async function fetchPollById(id: string): Promise<Poll> {
  const res = await fetch(`${API_BASE_URL}/api/polls/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(errorBody.error || `Failed to fetch poll ${id}`, res.status);
  }

  return await res.json();
}

/**
 * Creates a new poll in MongoDB via Go Gin backend.
 */
export async function createPoll(input: CreatePollInput): Promise<Poll> {
  const res = await fetch(`${API_BASE_URL}/api/polls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(errorBody.error || `Failed to create poll (HTTP ${res.status})`, res.status);
  }

  return await res.json();
}

/**
 * Casts a vote on a poll option in MongoDB and triggers Redis Pub/Sub broadcast.
 */
export async function castVote(pollId: string, payload: VotePayload): Promise<Poll> {
  const res = await fetch(`${API_BASE_URL}/api/polls/${pollId}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(errorBody.error || `Failed to cast vote (HTTP ${res.status})`, res.status);
  }

  return await res.json();
}
