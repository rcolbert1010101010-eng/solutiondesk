import { Issue, Status, Severity, Resolution, Tag, IssueRelationship, RelationshipType } from '../types';

const STORAGE_KEY = 'resolution_desk_issues';
const RELATIONSHIPS_KEY = 'resolution_desk_relationships';

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
    tags: ['network', 'timeout'],
    isMasterIncident: true,
    linkedIncidentCount: 3,
    referenceCount: 5
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
    tags: ['api', 'deployment'],
    referenceCount: 2
  },
  {
    id: 'ISS-003',
    title: 'Active Directory password reset portal returning 503',
    description: 'The self-service password reset portal is returning a 503 Service Unavailable error. Users who forget their passwords cannot reset them without calling the helpdesk.',
    systemAffected: 'Active Directory / Identity',
    severity: 'High',
    status: 'Open',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['authentication', 'permissions'],
    isMasterIncident: true,
    linkedIncidentCount: 1
  },
  {
    id: 'ISS-004',
    title: 'Microsoft 365 licenses not provisioning for new hires',
    description: 'New employees onboarded in the last two weeks have not received their Microsoft 365 licenses. They cannot access Outlook, Teams, or SharePoint.',
    systemAffected: 'Microsoft 365 / Licensing',
    severity: 'Medium',
    status: 'Open',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Priya Nair',
    tags: ['permissions', 'api'],
    referenceCount: 1
  },
  {
    id: 'ISS-005',
    title: 'Printer offline across 3rd floor office',
    description: 'All three network printers on the 3rd floor are showing as offline. Users have tried restarting the printers but the issue persists.',
    systemAffected: 'Print Services',
    severity: 'Low',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Tom Bradley',
    tags: ['network'],
    resolutions: [
      {
        id: 'RES-001',
        steps: 'Restarted the print spooler service on the print server. Updated printer drivers on the server. Re-added printers to the network.',
        resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedBy: 'Tom Bradley',
        timeToResolveMinutes: 45
      }
    ],
    referenceCount: 3
  },
  {
    id: 'ISS-006',
    title: 'Salesforce CRM slow load times reported by sales team',
    description: 'The sales team is reporting that Salesforce is taking 10-15 seconds to load pages, compared to the usual 2-3 seconds. Dashboards are particularly slow.',
    systemAffected: 'Salesforce CRM',
    severity: 'Medium',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Sarah Chen',
    tags: ['api', 'timeout'],
    referenceCount: 0
  },
  {
    id: 'ISS-007',
    title: 'Two-factor authentication codes not being received via SMS',
    description: 'Users attempting to log in with 2FA are not receiving SMS codes. The issue affects all mobile carriers. Email-based 2FA appears to be working.',
    systemAffected: 'Authentication / 2FA',
    severity: 'Critical',
    status: 'Open',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    tags: ['authentication', 'api'],
    isMasterIncident: false,
    referenceCount: 4
  },
  {
    id: 'ISS-008',
    title: 'Database backup jobs failing overnight',
    description: 'Automated database backups have been failing for the past 3 nights. The backup logs show a timeout error after 2 hours. Full backups are not completing.',
    systemAffected: 'Database / Backup',
    severity: 'High',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Priya Nair',
    tags: ['database', 'timeout'],
    resolutions: [
      {
        id: 'RES-002',
        steps: 'Identified that the backup window was too short due to database growth. Extended backup window to 6 hours. Implemented incremental backups to reduce full backup size. Added monitoring alerts for backup job duration.',
        resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedBy: 'Priya Nair',
        timeToResolveMinutes: 180
      }
    ],
    referenceCount: 6
  },
  {
    id: 'ISS-009',
    title: 'Remote desktop connections failing for branch office',
    description: 'Staff at the Manchester branch office cannot establish remote desktop connections to head office servers. The issue started after a firewall rule change yesterday.',
    systemAffected: 'Remote Desktop / Network',
    severity: 'High',
    status: 'Open',
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    tags: ['network', 'permissions'],
    referenceCount: 0
  },
  {
    id: 'ISS-010',
    title: 'HR portal login broken after SSO migration',
    description: 'Following last week migration to SSO, employees can no longer log into the HR portal. The portal redirects to a broken callback URL.',
    systemAffected: 'HR Portal / SSO',
    severity: 'High',
    status: 'Closed',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Marcus Webb',
    tags: ['authentication', 'deployment'],
    resolutions: [
      {
        id: 'RES-003',
        steps: 'Updated the SSO callback URL in the HR portal configuration to match the new identity provider endpoint. Cleared session caches on all HR portal servers. Tested login flow with 10 users before confirming resolution.',
        resolvedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedBy: 'Marcus Webb',
        timeToResolveMinutes: 90
      }
    ],
    referenceCount: 8
  }
];

function loadIssues(): Issue[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // ignore
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultIssues));
  return defaultIssues;
}

function saveIssues(issues: Issue[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
}

function loadRelationships(): IssueRelationship[] {
  try {
    const stored = localStorage.getItem(RELATIONSHIPS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // ignore
  }
  return [];
}

function saveRelationships(relationships: IssueRelationship[]): void {
  localStorage.setItem(RELATIONSHIPS_KEY, JSON.stringify(relationships));
}

export function getAllIssues(): Issue[] {
  return loadIssues();
}

export function getIssueById(id: string): Issue | undefined {
  return loadIssues().find(i => i.id === id);
}

export function addIssue(newIssue: Omit<Issue, 'id' | 'createdAt'>): Issue {
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
  const issue: Issue = {
    ...newIssue,
    id: newId,
    createdAt: new Date().toISOString()
  };
  const updated = [issue, ...issues];
  saveIssues(updated);
  return issue;
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
  const filtered = issues.filter(i => i.id !== id);
  if (filtered.length === issues.length) return false;
  saveIssues(filtered);
  const relationships = loadRelationships().filter(
    r => r.masterId !== id && r.sourceId !== id
  );
  saveRelationships(relationships);
  return true;
}

export function addResolution(issueId: string, resolution: Omit<Resolution, 'id'>): Issue | undefined {
  const issues = loadIssues();
  const idx = issues.findIndex(i => i.id === issueId);
  if (idx === -1) return undefined;
  const newResolution: Resolution = {
    ...resolution,
    id: `RES-${Date.now()}`
  };
  if (!issues[idx].resolutions) {
    issues[idx].resolutions = [];
  }
  issues[idx].resolutions!.push(newResolution);
  saveIssues(issues);
  return issues[idx];
}

export function incrementReferenceCount(issueId: string): Issue | undefined {
  const issues = loadIssues();
  const idx = issues.findIndex(i => i.id === issueId);
  if (idx === -1) return undefined;
  issues[idx].referenceCount = (issues[idx].referenceCount ?? 0) + 1;
  saveIssues(issues);
  return issues[idx];
}

export function promoteToMasterIncident(issueId: string): Issue | undefined {
  return updateIssue(issueId, { isMasterIncident: true });
}

export function demoteMasterIncident(issueId: string): Issue | undefined {
  const issues = loadIssues();
  const idx = issues.findIndex(i => i.id === issueId);
  if (idx === -1) return undefined;
  issues[idx].isMasterIncident = false;
  issues[idx].linkedIncidentCount = 0;
  saveIssues(issues);
  const relationships = loadRelationships().filter(r => r.masterId !== issueId);
  saveRelationships(relationships);
  return issues[idx];
}

export function linkIssueToMaster(
  sourceId: string,
  masterId: string,
  type: RelationshipType
): IssueRelationship | undefined {
  const issues = loadIssues();
  const masterIdx = issues.findIndex(i => i.id === masterId);
  const sourceIdx = issues.findIndex(i => i.id === sourceId);
  if (masterIdx === -1 || sourceIdx === -1) return undefined;

  const relationships = loadRelationships();
  const existing = relationships.find(r => r.sourceId === sourceId);
  if (existing) {
    const oldMasterIdx = issues.findIndex(i => i.id === existing.masterId);
    if (oldMasterIdx !== -1) {
      issues[oldMasterIdx].linkedIncidentCount = Math.max(
        0,
        (issues[oldMasterIdx].linkedIncidentCount ?? 0) - 1
      );
    }
    const newRelationships = relationships.filter(r => r.sourceId !== sourceId);
    newRelationships.push({ sourceId, masterId, type, linkedAt: new Date().toISOString() });
    saveRelationships(newRelationships);
  } else {
    relationships.push({ sourceId, masterId, type, linkedAt: new Date().toISOString() });
    saveRelationships(relationships);
  }

  issues[masterIdx].linkedIncidentCount = (issues[masterIdx].linkedIncidentCount ?? 0) + 1;
  saveIssues(issues);

  return { sourceId, masterId, type, linkedAt: new Date().toISOString() };
}

export function unlinkIssue(sourceId: string): boolean {
  const relationships = loadRelationships();
  const rel = relationships.find(r => r.sourceId === sourceId);
  if (!rel) return false;

  const issues = loadIssues();
  const masterIdx = issues.findIndex(i => i.id === rel.masterId);
  if (masterIdx !== -1) {
    issues[masterIdx].linkedIncidentCount = Math.max(
      0,
      (issues[masterIdx].linkedIncidentCount ?? 0) - 1
    );
    saveIssues(issues);
  }

  const newRelationships = relationships.filter(r => r.sourceId !== sourceId);
  saveRelationships(newRelationships);
  return true;
}

export function getRelationshipsForMaster(masterId: string): IssueRelationship[] {
  return loadRelationships().filter(r => r.masterId === masterId);
}

export function getRelationshipForSource(sourceId: string): IssueRelationship | undefined {
  return loadRelationships().find(r => r.sourceId === sourceId);
}

export function calculateConfidenceScore(issue: Issue): number {
  let score = 0;

  if (issue.description && issue.description.length > 50) score += 20;
  if (issue.description && issue.description.length > 150) score += 10;

  if (issue.assignee) score += 15;

  if (issue.tags && issue.tags.length > 0) score += 10;
  if (issue.tags && issue.tags.length >= 2) score += 5;

  if (issue.resolutions && issue.resolutions.length > 0) score += 25;
  if (issue.resolutions && issue.resolutions.length > 1) score += 10;

  if ((issue.referenceCount ?? 0) >= 1) score += 5;
  if ((issue.referenceCount ?? 0) >= 3) score += 5;
  if ((issue.referenceCount ?? 0) >= 5) score += 5;

  if (issue.isMasterIncident) score += 5;

  return Math.min(100, score);
}

export function getConfidenceLevel(issue: Issue): { level: 'high' | 'medium' | 'low'; label: string; score: number } {
  const score = calculateConfidenceScore(issue);
  if (score >= 70) return { level: 'high', label: 'High Confidence', score };
  if (score >= 40) return { level: 'medium', label: 'Medium Confidence', score };
  return { level: 'low', label: 'Low Confidence', score };
}

export function rankIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    const scoreA = calculateConfidenceScore(a);
    const scoreB = calculateConfidenceScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
