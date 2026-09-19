import React from 'react';
import { Poll } from '../types/poll';
import { Users, BarChart3, ChevronRight, Clock } from 'lucide-react';

interface PollCardProps {
  poll: Poll;
  onSelect: (poll: Poll) => void;
}

export const PollCard: React.FC<PollCardProps> = ({ poll, onSelect }) => {
  const totalVotes = poll.total_votes || 0;

  // Format date
  const dateFormatted = new Date(poll.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id={`poll-card-${poll.id}`}
      onClick={() => onSelect(poll)}
      className="group relative cursor-pointer rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900/90 hover:shadow-lg hover:shadow-black/40 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-base font-semibold text-neutral-100 group-hover:text-blue-400 transition-colors line-clamp-2">
            {poll.title}
          </h3>
          <span className="shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
            <Users className="w-3 h-3 text-blue-400" />
            <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
          </span>
        </div>

        {poll.description && (
          <p className="text-xs text-neutral-400 mb-4 line-clamp-2">
            {poll.description}
          </p>
        )}

        {/* Options Preview with Mini Progress Bars */}
        <div className="space-y-2 mb-4">
          {poll.options.slice(0, 3).map((opt) => {
            const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
            return (
              <div key={opt.id} className="text-xs">
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span className="truncate pr-2">{opt.text}</span>
                  <span className="font-mono text-neutral-400 shrink-0">{percentage}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          {poll.options.length > 3 && (
            <p className="text-[11px] text-neutral-400 italic">
              +{poll.options.length - 3} more options
            </p>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-neutral-400" />
          <span>{dateFormatted}</span>
        </span>

        <span className="flex items-center gap-1 font-medium text-blue-400 group-hover:translate-x-0.5 transition-transform">
          <span>Vote &amp; Results</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
