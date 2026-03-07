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
      className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all duration-150 group shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-slate-400">{issue.id}</span>
            {issue.isMasterIncident && (
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
                <Star size={9} fill="currentColor" /> Master
              </span>
            )}
            {isResolved && (
              <span className="inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 size={10} />
                Resolved
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 truncate">{issue.title}</h3>
        </div>
        <SeverityBadge severity={issue.severity} size="sm" />
      </div>
      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{issue.description}</p>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {issue.tags && issue.tags.map(tag => (
          <TagBadge key={tag} tag={tag} size="sm" />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-slate-500">
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
            <span className="flex items-center gap-1 text-violet-500">
              <Link size={11} />
              {issue.linkedIncidentCount}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={issue.status} size="sm" />
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={10} />
            {formatRelativeTime(issue.createdAt)}
          </span>
        </div>
      </div>
      {issue.resolution && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <ConfidenceBadge issue={issue} size="sm" showScore />
        </div>
      )}
    </div>
  );
};
