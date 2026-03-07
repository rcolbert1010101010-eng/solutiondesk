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
    scorePercent >= 60 ? 'text-emerald-600' :
    scorePercent >= 35 ? 'text-amber-600' :
    'text-slate-500';
  const scoreBg =
    scorePercent >= 60 ? 'bg-emerald-50 border-emerald-200' :
    scorePercent >= 35 ? 'bg-amber-50 border-amber-200' :
    'bg-slate-100 border-slate-200';

  return (
    <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all duration-150 shadow-sm ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start gap-3">
        {/* Rank + Score */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <span className="text-xs text-slate-400 font-mono">#{rank}</span>
          <div className={`text-xs font-bold px-1.5 py-0.5 rounded border ${scoreBg} ${scoreColor}`}>
            {scorePercent}%
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-slate-400">{issue.id}</span>
            {issue.isMasterIncident && (
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
                <Star size={9} fill="currentColor" /> Master
              </span>
            )}
            <StatusBadge status={issue.status} size="sm" />
            <SeverityBadge severity={issue.severity} size="sm" />
          </div>

          <h4 className={`font-semibold text-slate-800 leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>
            {issue.title}
          </h4>

          {!compact && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{issue.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-slate-500">{issue.systemAffected}</span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs text-slate-500">{formatRelativeTime(issue.createdAt)}</span>
            {(issue.status === 'Resolved' || issue.status === 'Closed') && issue.resolution && (
              <>
                <span className="text-xs text-slate-300">•</span>
                <span className="text-xs text-emerald-600">Has resolution</span>
              </>
            )}
          </div>

          {/* Why this matched */}
          <div className="mt-2">
            <button
              onClick={() => setShowReasons(v => !v)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 transition-colors"
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
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600"
                    title={reason.detail}
                  >
                    <span>{getMatchReasonIcon(reason.type)}</span>
                    {reason.label}
                    {reason.detail && (
                      <span className="text-slate-400 truncate max-w-[120px]" title={reason.detail}>
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
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            title="View issue"
          >
            <ExternalLink size={12} />
          </button>
          {onSelect && (
            <button
              onClick={() => onSelect(issue.id)}
              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-500 transition-colors"
              title="Use this resolution"
            >
              <Star size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Resolution preview */}
      {!compact && issue.resolution && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-400 mb-1">Resolution</p>
          <p className="text-xs text-slate-600 line-clamp-2">{issue.resolution.summary}</p>
          {issue.resolution.rootCause && (
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-slate-400">Root cause:</span> {issue.resolution.rootCause.slice(0, 100)}{issue.resolution.rootCause.length > 100 ? '...' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
