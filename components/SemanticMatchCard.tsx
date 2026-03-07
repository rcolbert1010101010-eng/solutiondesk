import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SemanticMatch, getMatchReasonIcon } from '../lib/semanticSearch';
import { ConfidenceBadge } from './ConfidenceBadge';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { formatRelativeTime } from '../lib/utils';
import { ChevronDown, ChevronUp, Star, ExternalLink, Zap } from 'lucide-react';

interface SemanticMatchCardProps {
  match: SemanticMatch;
  rank: number;
  onSelect?: (issueId: string) => void;
  compact?: boolean;
}

export const SemanticMatchCard: React.FC<SemanticMatchCardProps> = ({ match, rank, onSelect, compact = false }) => {
  const { issue, score, reasons } = match;
  const [showReasons, setShowReasons] = useState(!compact);
  const navigate = useNavigate();

  const scorePercent = Math.min(Math.round(score * 100), 99);
  const scoreColor =
    scorePercent >= 60 ? 'text-emerald-400' :
    scorePercent >= 35 ? 'text-amber-400' :
    'text-zinc-400';
  const scoreBg =
    scorePercent >= 60 ? 'bg-emerald-500/10 border-emerald-500/20' :
    scorePercent >= 35 ? 'bg-amber-500/10 border-amber-500/20' :
    'bg-zinc-500/10 border-zinc-500/20';

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all duration-150 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start gap-3">
        {/* Rank + Score */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <span className="text-xs text-zinc-600 font-mono">#{rank}</span>
          <div className={`text-xs font-bold px-1.5 py-0.5 rounded border ${scoreBg} ${scoreColor}`}>
            {scorePercent}%
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
            {issue.isMasterIncident && (
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                <Star size={9} fill="currentColor" /> Master
              </span>
            )}
            <StatusBadge status={issue.status} size="sm" />
            <SeverityBadge severity={issue.severity} size="sm" />
          </div>

          <h4 className={`font-semibold text-zinc-100 leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>
            {issue.title}
          </h4>

          {!compact && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{issue.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-zinc-500">{issue.systemAffected}</span>
            <span className="text-xs text-zinc-600">•</span>
            <span className="text-xs text-zinc-500">{formatRelativeTime(issue.createdAt)}</span>
            {(issue.status === 'Resolved' || issue.status === 'Closed') && issue.resolution && (
              <>
                <span className="text-xs text-zinc-600">•</span>
                <span className="text-xs text-emerald-400">Has resolution</span>
              </>
            )}
          </div>

          {/* Why this matched */}
          <div className="mt-2">
            <button
              onClick={() => setShowReasons(v => !v)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-400 transition-colors"
            >
              <Zap size={10} />
              Why this matched
              {showReasons ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>

            {showReasons && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {reasons.map((reason, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300"
                    title={reason.detail}
                  >
                    <span>{getMatchReasonIcon(reason.type)}</span>
                    {reason.label}
                    {reason.detail && (
                      <span className="text-zinc-500 truncate max-w-[120px]" title={reason.detail}>
                        : {reason.detail}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={() => navigate(`/issues/${issue.id}`)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="View issue"
          >
            <ExternalLink size={12} />
          </button>
          {onSelect && (
            <button
              onClick={() => onSelect(issue.id)}
              className="p-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 transition-colors"
              title="Use this resolution"
            >
              <Star size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Resolution preview */}
      {!compact && issue.resolution && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <p className="text-xs font-medium text-zinc-500 mb-1">Resolution</p>
          <p className="text-xs text-zinc-400 line-clamp-2">{issue.resolution.summary}</p>
          {issue.resolution.rootCause && (
            <p className="text-xs text-zinc-500 mt-1">
              <span className="text-zinc-600">Root cause:</span> {issue.resolution.rootCause.slice(0, 100)}{issue.resolution.rootCause.length > 100 ? '...' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
