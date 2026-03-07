import { Issue, Status, Severity, Resolution } from '../types';

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
    assignee: 'Sarah Chen'
  },
  {
    id: 'ISS-002',
    title: 'Email delivery failures to external domains',
    description: 'Outbound emails to Gmail and Yahoo addresses are bouncing with a 550 error. Internal email works fine. Approximately 200 emails have failed in the last 6 hours.',
    systemAffected: 'Email / Exchange',
    severity: 'Critical',
    status: 'Open',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    assignee: 'Marcus Webb'
  },
  {
    id: 'ISS-003',
    title: 'Active Directory password reset portal returning 503',
    description: 'The self-service password reset portal is returning a 503 Service Unavailable error. Users who forget their passwords cannot reset them without calling the helpdesk.',
    systemAffected: 'Active Directory / Identity',
    severity: 'High',
    status: 'Open',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ISS-004',
    title: 'Microsoft 365 licenses not provisioning for new hires',
    description: 'New employee accounts created in the last 48 hours have not received Microsoft 365 license assignments. They cannot access Outlook, Teams, or SharePoint.',
    systemAffected: 'Microsoft 365 / Licensing',
    severity: 'Medium',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Sarah Chen'
  },
  {
    id: 'ISS-005',
    title: 'Printer offline on 3rd floor — Finance department',
    description: 'The shared network printer (HP LaserJet Pro) on the 3rd floor has been offline since this morning. Finance staff cannot print invoices or reports.',
    systemAffected: 'Printing / Hardware',
    severity: 'Low',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'James Park',
    resolutionData: {
      rootCause: 'Printer IP address conflict due to DHCP lease renewal assigning the same IP to another device.',
      stepsTaken: '1. Identified IP conflict using network scanner.\n2. Assigned static IP to the printer.\n3. Updated printer port on all Finance workstations.\n4. Performed test print from 5 machines.',
      finalResolution: 'Printer is back online with a static IP assignment. All Finance workstations updated.',
      preventionNotes: 'Reserve static IPs for all shared network printers to prevent future DHCP conflicts.',
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'ISS-006',
    title: 'ERP system slow performance during month-end processing',
    description: 'The SAP ERP system is experiencing severe slowdowns during the month-end financial close process. Report generation that normally takes 2 minutes is taking over 45 minutes.',
    systemAffected: 'ERP / SAP',
    severity: 'Critical',
    status: 'Open',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    assignee: 'Marcus Webb'
  }
];

function loadIssues(): Issue[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultIssues));
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
  const newIssue: Issue = {
    ...data,
    id: `ISS-${String(num).padStart(3, '0')}`,
    createdAt: new Date().toISOString()
  };
  issues.unshift(newIssue);
  saveIssues(issues);
  return newIssue;
}

export function updateIssue(id: string, updates: Partial<Issue>): Issue | undefined {
  const issues = loadIssues();
  const idx = issues.findIndex(i => i.id === id);
  if (idx === -1) return undefined;
  issues[idx] = { ...issues[idx], ...updates };
  saveIssues(issues);
  return issues[idx];
}

export function addResolution(id: string, resolutionData: Resolution): Issue | undefined {
  const issues = loadIssues();
  const idx = issues.findIndex(i => i.id === id);
  if (idx === -1) return undefined;
  issues[idx] = {
    ...issues[idx],
    status: 'Resolved',
    resolutionData
  };
  saveIssues(issues);
  return issues[idx];
}

export function deleteIssue(id: string): boolean {
  const issues = loadIssues();
  const filtered = issues.filter(i => i.id !== id);
  if (filtered.length === issues.length) return false;
  saveIssues(filtered);
  return true;
}
