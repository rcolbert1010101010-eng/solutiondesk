import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Issue } from '../types';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { TagBadge } from './TagBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { formatRelativeTime } from '../lib/utils';
import { ArrowUpDown, CheckCircle2, Star, Link } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface IssueTableProps {
  issues: Issue[];
}

export const IssueTable: React.FC<IssueTableProps> = ({ issues }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (issues.length === 0) {
    return (
      <div className="text-center py-20">
        <p className={`text-sm ${
          isDark ? 'text-zinc-500' : 'text-slate-400'
        }`}>No issues found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className={`border-b ${
            isDark ? 'border-zinc-800' : 'border-slate-200'
          }`}>
            <th className={`text-left text-xs font-medium uppercase tracking-wider pb-3 px-4 w-24 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}>
              <span className="flex items-center gap-1">ID <ArrowUpDown size={10} /></span>
            </th>
            <th className={`text-left text-xs font-medium uppercase tracking-wider pb-3 px-4 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}>Title</th>
            <th className={`text-left text-xs font-medium uppercase tracking-wider pb-3 px-4 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}>Tags</th>
            <th className={`text-left text-xs font-medium uppercase tracking-wider pb-3 px-4 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}>System</th>
            <th className={`text-left text-xs font-medium uppercase tracking-wider pb-3 px-4 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}>Severity</th>
            <th className={`text-left text-xs font-medium uppercase tracking-wider pb-3 px-4 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}>Status</th>
            <th className={`text-left text-xs font-medium uppercase tracking-wider pb-3 px-4 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}>Created</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${
          isDark ? 'divide-zinc-800/60' : 'divide-slate-100'
        }`}>
          {issues.map(issue => {
            const isResolved = issue.status === 'Resolved' || issue.status === 'Closed';
            return (
              <tr
                key={issue.id}
                onClick={() => navigate(`/issues/${issue.id}`)}
                className={`cursor-pointer transition-colors group ${
                  isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50'
                }`}
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-mono ${
                      isDark ? 'text-zinc-500' : 'text-slate-400'
                    }`}>{issue.id}</span>
                    {issue.isMasterIncident && (
                      <Star size={10} className="text-violet-400" fill="currentColor" />
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium max-w-xs truncate ${
                      isDark ? 'text-zinc-200 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'
                    }`}>
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
                      <span className={`text-xs ${
                        isDark ? 'text-zinc-600' : 'text-slate-400'
                      }`}>+{issue.tags.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span className={`text-xs ${
                    isDark ? 'text-zinc-400' : 'text-slate-500'
                  }`}>{issue.systemAffected}</span>
                </td>
                <td className="py-3.5 px-4">
                  <SeverityBadge severity={issue.severity} size="sm" />
                </td>
                <td className="py-3.5 px-4">
                  <StatusBadge status={issue.status} size="sm" />
                </td>
                <td className="py-3.5 px-4">
                  <span className={`text-xs ${
                    isDark ? 'text-zinc-500' : 'text-slate-400'
                  }`}>{formatRelativeTime(issue.createdAt)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
