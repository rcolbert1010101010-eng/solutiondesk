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
    status: 'Open',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Priya Nair',
    tags: ['permissions', 'api']
  },
  {
    id: 'ISS-005',
    title: 'Printer queues stalling on Floor 3',
    description: 'All printers on the third floor are showing jobs stuck in queue. Restarting the print spooler temporarily fixes the issue but it recurs within an hour.',
    systemAffected: 'Printing / Hardware',
    severity: 'Low',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Tom Bradley',
    tags: ['network'],
    resolution: {
      rootCause: 'Corrupted print spooler service caused by a failed driver update.',
      stepsTaken: 'Identified the faulty HP driver update. Rolled back driver to previous version. Cleared spooler queue manually.',
      finalResolution: 'Rolled back HP Universal Print Driver from v7.0 to v6.9. Deployed corrected driver via GPO.',
      preventionNotes: 'Test driver updates in staging environment before broad deployment. Monitor print spooler health via SIEM.',
      resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'ISS-006',
    title: 'ERP system slow during month-end close',
    description: 'The SAP ERP system is experiencing severe slowdowns during the month-end financial close process. Report generation is taking 10x longer than normal.',
    systemAffected: 'ERP / SAP',
    severity: 'Critical',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    assignee: 'Lisa Park',
    tags: ['database', 'timeout']
  },
  {
    id: 'ISS-007',
    title: 'Customer portal login broken for SSO users',
    description: 'Users attempting to log into the customer portal via SSO (Okta) are being redirected to a blank page. Direct login with username/password still works.',
    systemAffected: 'Web / Customer Portal',
    severity: 'High',
    status: 'Open',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    tags: ['authentication', 'api']
  },
  {
    id: 'ISS-008',
    title: 'Nightly backup jobs failing on file server',
    description: 'Backup jobs for the main file server have been failing for the past 3 nights. The backup window is being exceeded due to a large dataset increase.',
    systemAffected: 'Backup / Storage',
    severity: 'Medium',
    status: 'Closed',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'James Okafor',
    tags: ['network', 'timeout'],
    resolution: {
      rootCause: 'Backup window was not adjusted after a 40% increase in file server data volume.',
      stepsTaken: 'Extended backup window. Enabled incremental backups. Moved large archive files to cold storage.',
      finalResolution: 'Implemented incremental daily backups with full weekly backup. Archived 2TB of old data to cold storage tier.',
      preventionNotes: 'Set up automated alerting when data volume grows by more than 20%. Review backup windows quarterly.',
      resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
];

function getStorage(): Issue[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultIssues;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultIssues;
  } catch {
    return defaultIssues;
  }
}

function setStorage(issues: Issue[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
}

export function getAllIssues(): Issue[] {
  return getStorage();
}

export function getIssueById(id: string): Issue | undefined {
  return getStorage().find(i => i.id === id);
}

export function createIssue(data: Omit<Issue, 'id' | 'createdAt'>): Issue {
  const issues = getStorage();
  const nextNum = issues.length + 1;
  const newIssue: Issue = {
    ...data,
    id: `ISS-${String(nextNum).padStart(3, '0')}`,
    createdAt: new Date().toISOString()
  };
  setStorage([...issues, newIssue]);
  return newIssue;
}

export function updateIssue(id: string, updates: Partial<Issue>): Issue | undefined {
  const issues = getStorage();
  const idx = issues.findIndex(i => i.id === id);
  if (idx === -1) return undefined;
  issues[idx] = { ...issues[idx], ...updates };
  setStorage(issues);
  return issues[idx];
}

export function deleteIssue(id: string): void {
  const issues = getStorage().filter(i => i.id !== id);
  setStorage(issues);
}

export function addResolution(id: string, resolution: Resolution): Issue | undefined {
  return updateIssue(id, {
    resolution,
    status: 'Resolved'
  });
}

export function getConfidenceLevel(issue: Issue): { level: 'high' | 'medium' | 'low'; score: number; label: string } {
  let score = 0;

  if (issue.resolution) {
    if (issue.resolution.rootCause && issue.resolution.rootCause.trim().length > 20) score += 30;
    if (issue.resolution.stepsTaken && issue.resolution.stepsTaken.trim().length > 20) score += 25;
    if (issue.resolution.finalResolution && issue.resolution.finalResolution.trim().length > 20) score += 25;
    if (issue.resolution.preventionNotes && issue.resolution.preventionNotes.trim().length > 10) score += 20;
  }

  if (issue.assignee) score += 10;
  if (issue.tags && issue.tags.length > 0) score += 5;
  if (issue.status === 'Resolved' || issue.status === 'Closed') score += 10;

  const capped = Math.min(score, 100);

  if (capped >= 70) return { level: 'high', score: capped, label: 'High Confidence' };
  if (capped >= 40) return { level: 'medium', score: capped, label: 'Medium Confidence' };
  return { level: 'low', score: capped, label: 'Low Confidence' };
}
