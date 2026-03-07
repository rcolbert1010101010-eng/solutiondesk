import { Issue, Status, Severity, Resolution, Tag } from '../types';

const STORAGE_KEY = 'resolution_desk_issues';

const defaultIssues: Issue[] = [
  {
    id: 'ISS-001',
    title: 'VPN connection dropping intermittently for remote users',
    description: 'Multiple remote employees are reporting that their VPN connections drop every 30-45 minutes, forcing them to reconnect. This is impacting productivity across the sales and engineering teams.',
    systemAffected: 'Network / VPN',
    severity: 'High',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    assignee: 'Sarah Chen',
    tags: ['network', 'timeout']
  },
  {
    id: 'ISS-002',
    title: 'Email delivery failures to external domains',
    description: 'Outbound emails to Gmail and Yahoo addresses are bouncing with a 550 error. Internal email works fine. Approximately 200 emails have failed in the last 6 hours.',
    systemAffected: 'Email / Exchange',
    severity: 'Critical',
    status: 'Open',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    assignee: 'Marcus Webb',
    tags: ['api', 'deployment']
  },
  {
    id: 'ISS-003',
    title: 'Active Directory password reset portal returning 503',
    description: 'The self-service password reset portal is returning a 503 Service Unavailable error. Users who forget their passwords cannot reset them without calling the helpdesk.',
    systemAffected: 'Active Directory / Identity',
    severity: 'High',
    status: 'Open',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['authentication', 'permissions']
  },
  {
    id: 'ISS-004',
    title: 'Microsoft 365 licenses not provisioning for new hires',
    description: 'New employee accounts created in the last 48 hours have not received Microsoft 365 license assignments. They cannot access Outlook, Teams, or SharePoint.',
    systemAffected: 'Microsoft 365 / Licensing',
    severity: 'Medium',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Sarah Chen',
    tags: ['authentication', 'api']
  },
  {
    id: 'ISS-005',
    title: 'ERP system slow query performance on reports module',
    description: 'Finance team reports that running monthly expense reports in the ERP system takes 15-20 minutes instead of the usual 2-3 minutes. Database query times have spiked significantly.',
    systemAffected: 'ERP / SAP',
    severity: 'Medium',
    status: 'Open',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'James Okafor',
    tags: ['database', 'timeout']
  },
  {
    id: 'ISS-006',
    title: 'Customer portal login page throwing JavaScript errors',
    description: 'External customers are unable to log into the support portal. Browser console shows uncaught TypeError on the authentication module. Affects Chrome and Firefox.',
    systemAffected: 'Web / Customer Portal',
    severity: 'Critical',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Priya Nair',
    tags: ['authentication', 'api'],
    resolution: {
      rootCause: 'A recent deployment introduced a breaking change in the auth library version.',
      stepsTaken: 'Rolled back deployment, identified incompatible dependency version, patched the auth module.',
      finalResolution: 'Reverted to auth library v2.3.1 and deployed hotfix. Login functionality restored.',
      preventionNotes: 'Added automated compatibility checks to CI/CD pipeline for auth dependencies.',
      resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'ISS-007',
    title: 'Printer fleet offline after network switch replacement',
    description: 'All 12 printers on the 3rd floor are showing offline after the network switch was replaced yesterday. Physical connections appear intact but devices are not communicating.',
    systemAffected: 'Printing / Hardware',
    severity: 'Low',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Marcus Webb',
    tags: ['network'],
    resolution: {
      rootCause: 'New switch was configured with different VLAN settings than the original.',
      stepsTaken: 'Audited switch configuration, compared with backup config, updated VLAN assignments.',
      finalResolution: 'Corrected VLAN configuration on new switch. All printers back online.',
      preventionNotes: 'Created network change checklist to ensure VLAN configs are preserved during hardware swaps.',
      resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'ISS-008',
    title: 'Backup jobs failing silently for file server',
    description: 'Nightly backup jobs for the primary file server have been failing without alerts for an estimated 5 days. Discovered during routine audit. No recent restore points available.',
    systemAffected: 'Backup / Storage',
    severity: 'Critical',
    status: 'Open',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    assignee: 'James Okafor',
    tags: ['database', 'permissions']
  }
];

function loadIssues(): Issue[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Issue[];
    }
  } catch {
    // ignore
  }
  const initial = defaultIssues;
  saveIssues(initial);
  return initial;
}

function saveIssues(issues: Issue[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  } catch {
    // ignore
  }
}

export function getAllIssues(): Issue[] {
  return loadIssues();
}

export function getIssueById(id: string): Issue | undefined {
  return loadIssues().find(i => i.id === id);
}

export function createIssue(data: Omit<Issue, 'id' | 'createdAt'>): Issue {
  const issues = loadIssues();
  const maxNum = issues.reduce((max, issue) => {
    const match = issue.id.match(/ISS-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);
  const newId = `ISS-${String(maxNum + 1).padStart(3, '0')}`;
  const newIssue: Issue = {
    ...data,
    id: newId,
    createdAt: new Date().toISOString()
  };
  const updated = [newIssue, ...issues];
  saveIssues(updated);
  return newIssue;
}

export function updateIssue(id: string, updates: Partial<Issue>): Issue | undefined {
  const issues = loadIssues();
  const index = issues.findIndex(i => i.id === id);
  if (index === -1) return undefined;
  const updated = { ...issues[index], ...updates };
  issues[index] = updated;
  saveIssues(issues);
  return updated;
}

export function deleteIssue(id: string): boolean {
  const issues = loadIssues();
  const filtered = issues.filter(i => i.id !== id);
  if (filtered.length === issues.length) return false;
  saveIssues(filtered);
  return true;
}

export function addResolution(id: string, resolution: Resolution): Issue | undefined {
  return updateIssue(id, {
    resolution,
    status: 'Resolved'
  });
}

export function getResolvedIssues(): Issue[] {
  return loadIssues().filter(i => i.status === 'Resolved' || i.status === 'Closed');
}
