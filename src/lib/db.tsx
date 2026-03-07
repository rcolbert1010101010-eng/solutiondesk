import { Issue, Status, Severity } from '../types';

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
    title: 'SAP ERP slow performance during month-end reporting',
    description: 'Finance team is experiencing 10-15 second response times when running month-end reports in SAP. Normal response time is under 2 seconds. Affecting the entire finance department.',
    systemAffected: 'ERP / SAP',
    severity: 'High',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'James Okafor',
    resolution: 'Identified and terminated 3 long-running queries that were locking tables. Added indexes to the reporting views. Performance restored to normal.'
  },
  {
    id: 'ISS-006',
    title: 'Customer portal login page showing blank screen',
    description: 'Customers are reporting that the login page at portal.company.com shows a blank white screen after a recent deployment. Estimated impact: ~500 customers unable to access their accounts.',
    systemAffected: 'Web / Customer Portal',
    severity: 'Critical',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Priya Nair',
    resolution: 'A JavaScript bundle error caused by a missing environment variable in production. Rolled back the deployment and fixed the configuration. Portal restored within 45 minutes.'
  },
  {
    id: 'ISS-007',
    title: 'Network printer on Floor 3 offline after office move',
    description: 'The HP LaserJet on Floor 3 (printer name: HP-FL3-01) went offline after the weekend office rearrangement. Users on Floor 3 cannot print.',
    systemAffected: 'Printing / Hardware',
    severity: 'Low',
    status: 'Closed',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Tom Bradley',
    resolution: 'Printer IP address had changed after being reconnected to a different switch port. Updated the IP in the print server configuration and redistributed the printer mapping via GPO.'
  },
  {
    id: 'ISS-008',
    title: 'Backup jobs failing for file server FS-PROD-02',
    description: 'Nightly backup jobs for FS-PROD-02 have been failing for the past 5 nights with error code 0xE000FED1. The last successful backup was 6 days ago.',
    systemAffected: 'Backup / Storage',
    severity: 'Critical',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Marcus Webb'
  },
  {
    id: 'ISS-009',
    title: 'Firewall blocking legitimate traffic to payment gateway',
    description: 'A recent firewall rule update is blocking outbound HTTPS traffic on port 443 to the payment gateway IP range. Online payments are failing for approximately 15% of transactions.',
    systemAffected: 'Security / Firewall',
    severity: 'Critical',
    status: 'Open',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 'ISS-010',
    title: 'SQL Server transaction log disk at 95% capacity',
    description: 'The transaction log drive on SQL-PROD-01 is at 95% capacity. If it fills completely, all database writes will fail, taking down the main application.',
    systemAffected: 'Database / SQL',
    severity: 'High',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    assignee: 'James Okafor'
  },
  {
    id: 'ISS-011',
    title: 'AWS EC2 instances not auto-scaling during peak hours',
    description: 'The auto-scaling group for the web tier is not launching new instances despite CPU utilization exceeding 85% threshold. This is causing slow response times during morning peak hours.',
    systemAffected: 'Cloud Infrastructure',
    severity: 'High',
    status: 'Open',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    assignee: 'Priya Nair'
  },
  {
    id: 'ISS-012',
    title: 'Windows update causing blue screen on Dell Latitude laptops',
    description: 'KB5031356 deployed last Tuesday is causing BSOD (DRIVER_IRQL_NOT_LESS_OR_EQUAL) on Dell Latitude 5540 laptops. 23 devices affected so far.',
    systemAffected: 'Endpoint / Workstation',
    severity: 'Medium',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Tom Bradley'
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
  saveIssues(defaultIssues);
  return defaultIssues;
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

export function getIssueById(id: string): Issue | null {
  const issues = loadIssues();
  return issues.find(i => i.id === id) ?? null;
}

export function createIssue(data: Omit<Issue, 'id' | 'createdAt'>): Issue {
  const issues = loadIssues();
  const maxNum = issues.reduce((max, issue) => {
    const num = parseInt(issue.id.replace('ISS-', ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  const newIssue: Issue = {
    ...data,
    id: `ISS-${String(maxNum + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString()
  };
  const updated = [newIssue, ...issues];
  saveIssues(updated);
  return newIssue;
}

export function updateIssue(id: string, data: Partial<Issue>): Issue | null {
  const issues = loadIssues();
  const index = issues.findIndex(i => i.id === id);
  if (index === -1) return null;
  const updated = { ...issues[index], ...data };
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
