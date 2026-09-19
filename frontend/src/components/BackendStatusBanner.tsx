import React, { useState } from 'react';
import { AlertTriangle, Terminal, Check, Copy, ExternalLink, RefreshCw, Settings2 } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

interface BackendStatusBannerProps {
  isOffline: boolean;
  errorMessage?: string;
  onRetry: () => void;
  isRetrying: boolean;
}

export const BackendStatusBanner: React.FC<BackendStatusBannerProps> = ({
  isOffline,
  errorMessage,
  onRetry,
  isRetrying,
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(API_BASE_URL);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  if (!isOffline) return null;

  return (
    <div
      id="backend-offline-banner"
      className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 sm:p-5 text-neutral-200 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-300">Go Backend Offline or Unreachable</h3>
            <p className="text-xs text-neutral-400">
              Connecting to <code className="text-neutral-300 bg-neutral-900 px-1.5 py-0.5 rounded">{API_BASE_URL}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            id="toggle-config-btn"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>Config</span>
          </button>

          <button
            id="retry-connection-btn"
            onClick={onRetry}
            disabled={isRetrying}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Checking...' : 'Check Again'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <p className="mt-2 text-xs text-amber-400/90 font-mono bg-neutral-900/60 p-2 rounded border border-neutral-800">
          Error: {errorMessage}
        </p>
      )}

      {showConfig && (
        <div className="mt-3 p-3 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs">
          <label className="block text-neutral-300 mb-1 font-medium">Backend API Endpoint URL:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1 text-neutral-100 font-mono text-xs focus:outline-none focus:border-blue-500"
              placeholder="http://localhost:8080"
            />
            <button
              onClick={() => {
                window.location.search = `?api=${encodeURIComponent(customUrl)}`;
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
            >
              Apply
            </button>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Or configure <code>VITE_API_BASE_URL</code> in <code>/frontend/.env</code>.
          </p>
        </div>
      )}

      {/* Quick Setup Instructions */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg bg-neutral-900/80 border border-neutral-800 p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              Option 1: Docker Compose (All-in-One)
            </span>
            <button
              onClick={() => copyToClipboard('docker compose up', 'docker')}
              className="text-neutral-400 hover:text-neutral-200 flex items-center gap-1 text-[11px]"
            >
              {copiedCmd === 'docker' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCmd === 'docker' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-neutral-400 mb-2">
            Spins up Go backend + MongoDB + Redis + Frontend containers simultaneously:
          </p>
          <code className="block bg-neutral-950 text-neutral-300 px-2 py-1 rounded text-xs font-mono select-all">
            docker compose up
          </code>
        </div>

        <div className="rounded-lg bg-neutral-900/80 border border-neutral-800 p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Option 2: Run Go Server Directly
            </span>
            <button
              onClick={() => copyToClipboard('cd backend && go run cmd/server/main.go', 'go')}
              className="text-neutral-400 hover:text-neutral-200 flex items-center gap-1 text-[11px]"
            >
              {copiedCmd === 'go' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCmd === 'go' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-neutral-400 mb-2">
            Starts the Gin HTTP &amp; WebSocket server on port 8080:
          </p>
          <code className="block bg-neutral-950 text-neutral-300 px-2 py-1 rounded text-xs font-mono select-all">
            cd backend && go run cmd/server/main.go
          </code>
        </div>
      </div>
    </div>
  );
};
