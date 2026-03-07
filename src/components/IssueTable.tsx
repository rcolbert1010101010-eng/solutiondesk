import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Issue } from '../types';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { formatRelativeTime } from '../lib/utils';
import { ArrowUpDown } from 'lucide-react';

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
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4 w-24">
              <span className="flex items-center gap-1">ID <ArrowUpDown size={10} /></span>
            </th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4">Title</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4">System</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4">Severity</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4">Status</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-3 px-4">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {issues.map(issue => (
            <tr
              key={issue.id}
              onClick={() => navigate(`/issues/${issue.id}`)}
              className="hover:bg-zinc-800/40 cursor-pointer transition-colors group"
            >
              <td className="py-3.5 px-4">
                <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
              </td>
              <td className="py-3.5 px-4">
                <div>
                  <p className="text-sm font-medium text-zinc-100 group-hover:text-white">{issue.title}</p>
                  {issue.assignee && (
                    <p className="text-xs text-zinc-500 mt-0.5">{issue.assignee}</p>
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
          ))}
        </tbody>
      </table>
    </div>
  );
};
