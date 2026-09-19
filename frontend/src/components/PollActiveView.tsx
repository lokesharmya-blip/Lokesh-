import React, { useEffect, useState, useRef } from 'react';
import { Poll, PollOption, VoteEvent } from '../types/poll';
import { castVote } from '../services/api';
import { PollWebSocketClient, WSConnectionStatus } from '../services/websocket';
import {
  ArrowLeft,
  Radio,
  Users,
  CheckCircle2,
  Share2,
  Clock,
  Sparkles,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface PollActiveViewProps {
  poll: Poll;
  onBack: () => void;
  onPollUpdated: (updatedPoll: Poll) => void;
}

export const PollActiveView: React.FC<PollActiveViewProps> = ({
  poll: initialPoll,
  onBack,
  onPollUpdated,
}) => {
  const [poll, setPoll] = useState<Poll>(initialPoll);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState<boolean>(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<WSConnectionStatus>('connecting');
  const [lastLiveEventTime, setLastLiveEventTime] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const wsClientRef = useRef<PollWebSocketClient | null>(null);

  // Check if voter already voted for this poll in localStorage
  useEffect(() => {
    const votedStorageKey = `voted_poll_${initialPoll.id}`;
    const storedOption = localStorage.getItem(votedStorageKey);
    if (storedOption) {
      setSelectedOptionId(storedOption);
      setHasVoted(true);
    }
  }, [initialPoll.id]);

  // Connect to Go backend WebSocket for real-time Redis updates
  useEffect(() => {
    const client = new PollWebSocketClient(
      initialPoll.id,
      (event: VoteEvent) => {
        // Handle incoming live vote event from Redis
        if (event.type === 'VOTE_CAST' && event.poll_id === initialPoll.id) {
          setPoll((prev) => {
            const updated: Poll = {
              ...prev,
              total_votes: event.total_votes,
              options: event.options,
            };
            onPollUpdated(updated);
            return updated;
          });
          setLastLiveEventTime(new Date().toLocaleTimeString());
        }
      },
      (status: WSConnectionStatus) => {
        setWsStatus(status);
      }
    );

    wsClientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
    };
  }, [initialPoll.id, onPollUpdated]);

  const handleVoteSubmit = async (optionId: string) => {
    if (hasVoted || isSubmittingVote) return;

    setIsSubmittingVote(true);
    setVoteError(null);

    try {
      const updatedPoll = await castVote(poll.id, {
        option_id: optionId,
        voter_id: `voter_${Math.random().toString(36).substring(2, 9)}`,
      });

      setSelectedOptionId(optionId);
      setHasVoted(true);
      setPoll(updatedPoll);
      onPollUpdated(updatedPoll);
      localStorage.setItem(`voted_poll_${poll.id}`, optionId);
    } catch (err: unknown) {
      setVoteError(err instanceof Error ? err.message : 'Failed to submit vote');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const totalVotes = poll.total_votes || 0;

  // Find leading option
  const leadingOption = poll.options.reduce<PollOption | null>((max, opt) => {
    if (!max || opt.votes > max.votes) return opt;
    return max;
  }, null);

  return (
    <div id="active-poll-container" className="max-w-3xl mx-auto space-y-6">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-4">
        <button
          id="back-to-polls-btn"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-100 transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-900 border border-transparent hover:border-neutral-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Polls</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Real-time Redis WebSocket status indicator */}
          <div
            id="ws-status-badge"
            className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-900 border border-neutral-800"
            title={`WebSocket Live Stream: ${wsStatus}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                  : wsStatus === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-neutral-300">
              {wsStatus === 'connected'
                ? 'Redis Live Stream'
                : wsStatus === 'connecting'
                ? 'Connecting Live Stream...'
                : 'Live Stream Offline'}
            </span>
            {lastLiveEventTime && (
              <span className="text-[10px] text-neutral-400 font-mono">({lastLiveEventTime})</span>
            )}
          </div>

          <button
            id="share-poll-btn"
            onClick={copyShareLink}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Poll Card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 backdrop-blur p-6 sm:p-8 shadow-xl">
        {/* Title & metadata */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-400 mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Live Interactive Poll</span>
            <span className="text-neutral-600">•</span>
            <span className="text-neutral-400">ID: {poll.id}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-neutral-100 tracking-tight mb-2">
            {poll.title}
          </h2>

          {poll.description && (
            <p className="text-sm text-neutral-300 leading-relaxed mb-4">
              {poll.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 pt-3 border-t border-neutral-800/80">
            <span className="flex items-center gap-1.5 font-medium text-neutral-300">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-bold text-neutral-100">{totalVotes}</span> total {totalVotes === 1 ? 'vote' : 'votes'}
            </span>

            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Created {new Date(poll.created_at).toLocaleDateString()}</span>
            </span>

            {hasVoted && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Your vote was recorded</span>
              </span>
            )}
          </div>
        </div>

        {voteError && (
          <div className="mb-6 p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{voteError}</span>
          </div>
        )}

        {/* Voting Options */}
        <div className="space-y-3 mb-6">
          {poll.options.map((option) => {
            const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            const isSelected = selectedOptionId === option.id;
            const isLeader = leadingOption && leadingOption.id === option.id && totalVotes > 0;

            return (
              <div
                key={option.id}
                id={`poll-option-${option.id}`}
                className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/20 shadow-sm'
                    : isLeader
                    ? 'border-neutral-700 bg-neutral-900/90'
                    : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                }`}
              >
                {/* Live Animated Background Fill Bar */}
                <div
                  className={`absolute top-0 bottom-0 left-0 transition-all duration-700 ease-out opacity-20 ${
                    isSelected ? 'bg-blue-500' : isLeader ? 'bg-emerald-500' : 'bg-neutral-600'
                  }`}
                  style={{ width: `${percentage}%` }}
                />

                <div className="relative p-4 flex items-center justify-between gap-4">
                  {/* Option Text & Vote Button */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      id={`vote-btn-${option.id}`}
                      onClick={() => handleVoteSubmit(option.id)}
                      disabled={hasVoted || isSubmittingVote}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-blue-400 bg-blue-500 text-white'
                          : hasVoted
                          ? 'border-neutral-700 bg-neutral-800/50 text-transparent cursor-default'
                          : 'border-neutral-600 hover:border-blue-400 bg-neutral-800 hover:bg-neutral-700 text-transparent'
                      }`}
                      title={hasVoted ? 'You already voted' : 'Vote for this option'}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-current" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-100 truncate">
                          {option.text}
                        </span>
                        {isLeader && (
                          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium shrink-0">
                            <TrendingUp className="w-3 h-3" />
                            Leading
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-400">
                        {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
                      </span>
                    </div>
                  </div>

                  {/* Percentage & Progress */}
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold font-mono text-neutral-100">
                      {percentage}%
                    </div>
                    {!hasVoted && (
                      <button
                        onClick={() => handleVoteSubmit(option.id)}
                        disabled={isSubmittingVote}
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 underline underline-offset-2"
                      >
                        Vote
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Real-time status footer */}
        <div className="rounded-xl bg-neutral-950/60 border border-neutral-800/80 p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Votes synchronize instantaneously across all clients via Redis Pub/Sub</span>
          </div>
          <span className="font-mono text-[11px] text-neutral-500">Go Gin + MongoDB + Redis</span>
        </div>
      </div>
    </div>
  );
};
