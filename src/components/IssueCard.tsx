import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Issue } from '../types';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { TagBadge } from './TagBadge';
import { formatRelativeTime } from '../lib/utils';
import { Monitor, Clock, User, CheckCircle2 } from 'lucide-react';

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
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
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
      <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{issue.description}</p>
      {issue.tags && issue.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3" onClick={e => e.stopPropagation()}>
          {issue.tags.map(tag => (
            <TagBadge key={tag} tag={tag} size="sm" />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <StatusBadge status={issue.status} size="sm" />
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <Monitor size={11} />
            {issue.systemAffected}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {issue.assignee && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <User size={11} />
              {issue.assignee}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock size={11} />
            {formatRelativeTime(issue.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};
