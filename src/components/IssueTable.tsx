import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Issue } from '../types';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { TagBadge } from './TagBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { formatRelativeTime } from '../lib/utils';
import { ArrowUpDown, CheckCircle2, Star, Link } from 'lucide-react';

interface IssueTableProps {
  issues: Issue[];
}

export const IssueTable: React.FC<IssueTableProps> = ({ issues }) => {
  const navigate = useNavigate();

  if (issues.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500 text-sm">No issues found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4 w-24">
              <span className="flex items-center gap-1">ID <ArrowUpDown size={10} /></span>
            </th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4">Title</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4">Tags</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4">System</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4">Severity</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4">Status</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {issues.map(issue => {
            const isResolved = issue.status === 'Resolved' || issue.status === 'Closed';
            return (
              <tr
                key={issue.id}
                onClick={() => navigate(`/issues/${issue.id}`)}
                className="cursor-pointer hover:bg-zinc-800/40 transition-colors group"
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
                    {issue.isMasterIncident && (
                      <Star size={10} className="text-violet-400" fill="currentColor" />
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-200 group-hover:text-white font-medium max-w-xs truncate">
                      {issue.title}
                    </span>
                    {isResolved && issue.resolution && (
                      <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                    )}
                    {issue.linkedIncidentCount && issue.linkedIncidentCount > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-xs text-violet-400">
                        <Link size={11} />{issue.linkedIncidentCount}
                      </span>
                    ) : null}
                  </div>
                  {issue.resolution && (
                    <div className="mt-1">
                      <ConfidenceBadge issue={issue} size="sm" />
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1 flex-wrap">
                    {issue.tags && issue.tags.slice(0, 2).map(tag => (
                      <TagBadge key={tag} tag={tag} size="sm" />
                    ))}
                    {issue.tags && issue.tags.length > 2 && (
                      <span className="text-xs text-zinc-600">+{issue.tags.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-xs text-zinc-400">{issue.systemAffected}</span>
                </td>
                <td className="py-3.5 px-4">
                  <SeverityBadge severity={issue.severity} size="sm" />
                </td>
                <td className="py-3.5 px-4">
                  <StatusBadge status={issue.status} size="sm" />
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-xs text-zinc-500">{formatRelativeTime(issue.createdAt)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
