import React from 'react';
import { Radio, Plus, Server, Database, Zap, RefreshCw } from 'lucide-react';
import { ServerHealth } from '../types/poll';

interface NavbarProps {
  serverHealth: ServerHealth | null;
  isCheckingHealth: boolean;
  onRefreshHealth: () => void;
  onCreatePollClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  serverHealth,
  isCheckingHealth,
  onRefreshHealth,
  onCreatePollClick,
}) => {
  const isOnline = serverHealth?.status === 'ok' || serverHealth?.status === 'degraded';
  const mongoOk = serverHealth?.services?.mongodb;
  const redisOk = serverHealth?.services?.redis;

  return (
    <header id="app-header" className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-100 tracking-tight">Live Polling</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                Go + Gin
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              Real-time polls backed by MongoDB &amp; Redis Pub/Sub
            </p>
          </div>
        </div>

        {/* Backend & Database Health Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            id="backend-health-indicator"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950/60 text-xs text-neutral-300 shadow-inner"
            title="Go Backend & Database Connection State"
          >
            {/* Go Backend indicator */}
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden md:inline font-medium">Go:</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500'
                }`}
              />
            </div>

            <span className="text-neutral-700">|</span>

            {/* MongoDB indicator */}
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden md:inline font-medium">Mongo:</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  mongoOk ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-500/80'
                }`}
              />
            </div>

            <span className="text-neutral-700">|</span>

            {/* Redis indicator */}
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden md:inline font-medium">Redis:</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  redisOk ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-500/80'
                }`}
              />
            </div>

            <button
              id="refresh-health-btn"
              onClick={onRefreshHealth}
              disabled={isCheckingHealth}
              className="ml-1 text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Ping Backend"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>

          {/* Create Poll Button */}
          <button
            id="create-poll-header-btn"
            onClick={onCreatePollClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium transition-all shadow-sm hover:shadow-blue-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Poll</span>
          </button>
        </div>
      </div>
    </header>
  );
};
