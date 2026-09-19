import React, { useState, useEffect, useCallback } from 'react';
import { Poll, ServerHealth } from './types/poll';
import { checkBackendHealth, fetchPolls } from './services/api';
import { Navbar } from './components/Navbar';
import { BackendStatusBanner } from './components/BackendStatusBanner';
import { PollCard } from './components/PollCard';
import { PollActiveView } from './components/PollActiveView';
import { CreatePollModal } from './components/CreatePollModal';
import {
  Radio,
  Plus,
  Loader2,
  Inbox,
  Sparkles,
  Server,
  Database,
  Zap,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(true);
  const [isLoadingPolls, setIsLoadingPolls] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Check Go backend health
  const checkHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const health = await checkBackendHealth();
      setServerHealth(health);
    } catch (err: unknown) {
      setServerHealth({
        status: 'disconnected',
      });
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  // Fetch real polls from Go Gin backend
  const loadPolls = useCallback(async () => {
    setIsLoadingPolls(true);
    setFetchError(null);
    try {
      const fetched = await fetchPolls();
      setPolls(fetched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load polls from Go backend';
      setFetchError(msg);
    } finally {
      setIsLoadingPolls(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkHealth();
    loadPolls();
  }, [checkHealth, loadPolls]);

  // Keep health updated periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkHealth();
    }, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handlePollCreated = (newPoll: Poll) => {
    setPolls((prev) => [newPoll, ...prev]);
    setSelectedPoll(newPoll);
  };

  const handlePollUpdated = (updatedPoll: Poll) => {
    setPolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
    if (selectedPoll && selectedPoll.id === updatedPoll.id) {
      setSelectedPoll(updatedPoll);
    }
  };

  const isBackendOffline = serverHealth?.status === 'disconnected' || serverHealth?.status === 'error';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        serverHealth={serverHealth}
        isCheckingHealth={isCheckingHealth}
        onRefreshHealth={checkHealth}
        onCreatePollClick={() => setIsCreateModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Backend Status Notification Banner */}
        <BackendStatusBanner
          isOffline={isBackendOffline}
          errorMessage={fetchError || undefined}
          onRetry={() => {
            checkHealth();
            loadPolls();
          }}
          isRetrying={isCheckingHealth || isLoadingPolls}
        />

        {selectedPoll ? (
          <PollActiveView
            poll={selectedPoll}
            onBack={() => setSelectedPoll(null)}
            onPollUpdated={handlePollUpdated}
          />
        ) : (
          <div className="space-y-8">
            {/* Header & Architecture Overview Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
                  Active Community Polls
                </h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Real-time voting powered by Go Gin, MongoDB persistence, and Redis Pub/Sub streams.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="create-poll-main-btn"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-sm hover:shadow-blue-500/20 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Poll</span>
                </button>
              </div>
            </div>

            {/* Architecture Highlights Pill Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-neutral-200 truncate">Go + Gin</div>
                  <div className="text-[11px] text-neutral-400 truncate">REST API &amp; WebSockets</div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-neutral-200 truncate">MongoDB</div>
                  <div className="text-[11px] text-neutral-400 truncate">Atomic Document Store</div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-neutral-200 truncate">Redis</div>
                  <div className="text-[11px] text-neutral-400 truncate">Realtime Pub/Sub</div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Radio className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-neutral-200 truncate">React + TS</div>
                  <div className="text-[11px] text-neutral-400 truncate">Live State Sync</div>
                </div>
              </div>
            </div>

            {/* Polls Listing Content */}
            {isLoadingPolls && polls.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-neutral-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                <p className="text-sm font-medium">Connecting to Go backend &amp; querying MongoDB...</p>
              </div>
            ) : fetchError && polls.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-neutral-800 bg-neutral-900/30 p-8">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center mx-auto mb-4 text-neutral-400">
                  <Server className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-neutral-200 mb-1">
                  Go Backend Not Connected
                </h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto mb-5">
                  The frontend is configured to fetch live polls from the Go Gin backend at{' '}
                  <code className="bg-neutral-800 px-1 py-0.5 rounded text-neutral-300">
                    http://localhost:8080
                  </code>
                  . Once started, click the button below to load polls.
                </p>
                <button
                  onClick={loadPolls}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                >
                  Retry Loading Polls
                </button>
              </div>
            ) : polls.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-neutral-800 bg-neutral-900/30 p-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4 text-blue-400">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-neutral-200 mb-1">
                  No polls in database yet
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-5">
                  Create your first real-time poll to begin collecting live votes across users.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                >
                  Create First Poll
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {polls.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    onSelect={(p) => setSelectedPoll(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-900/40 py-6 text-xs text-neutral-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Live Polling Web App</span>
            <span className="text-neutral-600">•</span>
            <span>React + TypeScript + Go + Gin + MongoDB + Redis</span>
          </div>
          <div className="text-neutral-500">
            Realtime updates broadcasted via Redis Pub/Sub channels
          </div>
        </div>
      </footer>

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPollCreated={handlePollCreated}
      />
    </div>
  );
}
