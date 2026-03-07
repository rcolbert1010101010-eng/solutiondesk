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
    assignee: 'Jordan Park',
    tags: ['permissions', 'deployment']
  },
  {
    id: 'ISS-005',
    title: 'ERP system slow performance during month-end processing',
    description: 'The SAP ERP system is responding very slowly during month-end financial processing. Batch jobs that normally take 2 hours are taking 8+ hours, blocking the finance team.',
    systemAffected: 'ERP / SAP',
    severity: 'High',
    status: 'Open',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['database', 'timeout']
  },
  {
    id: 'ISS-006',
    title: 'Customer portal login page throwing 500 errors',
    description: 'The public-facing customer portal login page is intermittently throwing 500 Internal Server errors. Approximately 15% of login attempts are failing.',
    systemAffected: 'Web / Customer Portal',
    severity: 'Critical',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Alex Rivera',
    resolution: 'Identified a memory leak in the authentication middleware. Patched and redeployed.',
    resolutionDetails: {
      rootCause: 'Memory leak in authentication middleware caused by unclosed database connections.',
      stepsTaken: 'Analyzed server logs, identified the faulty middleware, patched connection pooling logic.',
      finalResolution: 'Deployed patched version v2.3.1 to production. Memory usage stabilized.',
      preventionNotes: 'Added automated memory monitoring alerts. Code review checklist updated.',
      resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    tags: ['authentication', 'api', 'database']
  },
  {
    id: 'ISS-007',
    title: 'Backup jobs failing on primary file server',
    description: 'Nightly backup jobs for the primary file server have been failing for 3 consecutive nights. Last successful backup was 72 hours ago, creating a significant data protection gap.',
    systemAffected: 'Backup / Storage',
    severity: 'High',
    status: 'Open',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['network', 'deployment']
  },
  {
    id: 'ISS-008',
    title: 'Printer fleet offline after network switch replacement',
    description: 'All 24 network printers in Building B went offline following the replacement of the core network switch. The new switch configuration may not match the previous VLAN setup.',
    systemAffected: 'Printing / Hardware',
    severity: 'Medium',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Sarah Chen',
    resolution: 'Reconfigured VLAN settings on new switch to match previous configuration.',
    resolutionDetails: {
      rootCause: 'New switch deployed with default VLAN configuration, missing printer VLAN 30.',
      stepsTaken: 'Reviewed old switch config backup, identified missing VLANs, reconfigured new switch.',
      finalResolution: 'Added VLAN 30 to new switch and updated port assignments. All printers online.',
      preventionNotes: 'Created switch configuration documentation. Change management process updated.',
      resolvedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    tags: ['network', 'deployment']
  }
];

function loadIssues(): Issue[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: Issue[] = JSON.parse(stored);
      // Migrate old issues that lack tags
      return parsed.map(issue => ({
        ...issue,
        tags: issue.tags ?? []
      }));
    }
  } catch {
    // ignore
  }
  return defaultIssues;
}

function saveIssues(issues: Issue[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
}

export function getAllIssues(): Issue[] {
  return loadIssues();
}

export function getIssueById(id: string): Issue | undefined {
  return loadIssues().find(i => i.id === id);
}

export function createIssue(data: Omit<Issue, 'id' | 'createdAt'>): Issue {
  const issues = loadIssues();
  const num = issues.length + 1;
  const id = `ISS-${String(num).padStart(3, '0')}`;
  const newIssue: Issue = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    tags: data.tags ?? []
  };
  saveIssues([...issues, newIssue]);
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
    resolutionDetails: resolution,
    status: 'Resolved',
    resolution: resolution.finalResolution
  });
}
