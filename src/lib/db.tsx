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
    title: 'ERP system slow performance during peak hours',
    description: 'The SAP ERP system is experiencing significant slowdowns between 9 AM and 11 AM. Report generation is timing out and order processing is taking 3-4x longer than normal.',
    systemAffected: 'ERP / SAP',
    severity: 'Medium',
    status: 'Open',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'James Liu'
  },
  {
    id: 'ISS-006',
    title: 'Customer portal login failures after SSL certificate update',
    description: 'Following the SSL certificate renewal last night, approximately 15% of customers are unable to log into the web portal. The error shown is a certificate mismatch warning.',
    systemAffected: 'Web / Customer Portal',
    severity: 'Critical',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Marcus Webb',
    resolution: 'Updated intermediate certificate chain on load balancer and cleared CDN cache. All customers can now log in successfully.'
  },
  {
    id: 'ISS-007',
    title: 'Network printer offline in Building B floor 3',
    description: 'The HP LaserJet Pro on floor 3 of Building B is showing as offline. Users on that floor are unable to print and are walking to other floors to use printers.',
    systemAffected: 'Printing / Hardware',
    severity: 'Low',
    status: 'Closed',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Tom Bradley',
    resolution: 'Printer IP address had changed due to DHCP lease expiration. Updated printer configuration with static IP assignment.'
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

export function deleteIssue(id: string): boolean {
  const issues = loadIssues();
  const idx = issues.findIndex(i => i.id === id);
  if (idx === -1) return false;
  issues.splice(idx, 1);
  saveIssues(issues);
  return true;
}

export function addResolution(id: string, resolutionData: Resolution): Issue | undefined {
  const issues = loadIssues();
  const idx = issues.findIndex(i => i.id === id);
  if (idx === -1) return undefined;
  issues[idx] = {
    ...issues[idx],
    resolutionData,
    resolution: resolutionData.finalResolution,
    status: 'Resolved'
  };
  saveIssues(issues);
  return issues[idx];
}
