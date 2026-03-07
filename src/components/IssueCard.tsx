import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Issue } from '../types';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { TagBadge } from './TagBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { formatRelativeTime } from '../lib/utils';
import { Monitor, Clock, User, CheckCircle2, Star, Link } from 'lucide-react';

interface IssueCardProps {
  issue: Issue;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue }) => {
  const navigate = useNavigate();
  const isResolved = issue.status === 'Resolved' || issue.status === 'Closed';

  return (
    <div
      onClick={() => navigate(`/issues/${issue.id}`)}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
            {issue.isMasterIncident && (
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                <Star size={9} fill="currentColor" /> Master
              </span>
            )}
            {isResolved && (
              <span className="inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={10} />
                Resolved
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate">{issue.title}</h3>
        </div>
        <SeverityBadge severity={issue.severity} size="sm" />
      </div>
      <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{issue.description}</p>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {issue.tags && issue.tags.map(tag => (
          <TagBadge key={tag} tag={tag} size="sm" />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Monitor size={11} />
            {issue.systemAffected}
          </span>
          {issue.assignee && (
            <span className="flex items-center gap-1">
              <User size={11} />
              {issue.assignee}
            </span>
          )}
          {issue.linkedIncidentCount && issue.linkedIncidentCount > 0 ? (
            <span className="flex items-center gap-1 text-violet-400">
              <Link size={11} />
              {issue.linkedIncidentCount}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={issue.status} size="sm" />
          <span className="flex items-center gap-1 text-xs text-zinc-600">
            <Clock size={10} />
            {formatRelativeTime(issue.createdAt)}
          </span>
        </div>
      </div>
      {issue.resolution && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <ConfidenceBadge issue={issue} size="sm" showScore />
        </div>
      )}
    </div>
  );
};
