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
    description: 'New employee accounts created in the last 48 hours have not received Microsoft 365 license assignments. They cannot access Outlook, Teams, or SharePoint.',
    systemAffected: 'Microsoft 365 / Licensing',
    severity: 'Medium',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Priya Patel',
    tags: ['permissions', 'api'],
    referenceCount: 1
  },
  {
    id: 'ISS-005',
    title: 'Database connection pool exhaustion on production',
    description: 'The production database is hitting connection pool limits during peak hours (9-11 AM EST). Applications are throwing connection timeout errors and some requests are failing.',
    systemAffected: 'Database / PostgreSQL',
    severity: 'Critical',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'James Liu',
    tags: ['database', 'timeout'],
    resolution: {
      id: 'RES-001',
      steps: '1. Identified connection leak in the reporting service.\n2. Increased pool size from 20 to 50 connections temporarily.\n3. Deployed fix to close connections properly after query execution.\n4. Monitored for 2 hours to confirm stability.',
      resolvedBy: 'James Liu',
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      timeToResolve: 180,
      verified: true
    },
    referenceCount: 8
  },
  {
    id: 'ISS-006',
    title: 'SSL certificate expiry warning for api.company.com',
    description: 'The SSL certificate for api.company.com expires in 7 days. If not renewed, all API integrations will fail and browsers will show security warnings.',
    systemAffected: 'Infrastructure / SSL',
    severity: 'Medium',
    status: 'Open',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    tags: ['api', 'network'],
    referenceCount: 3
  },
  {
    id: 'ISS-007',
    title: 'Slack integration not posting to #alerts channel',
    description: 'The automated monitoring alerts that should post to the #alerts Slack channel have stopped working. No alerts have been received since yesterday morning.',
    systemAffected: 'Integrations / Slack',
    severity: 'Low',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Sarah Chen',
    tags: ['api', 'authentication'],
    resolution: {
      id: 'RES-002',
      steps: '1. Checked Slack app configuration - found OAuth token had expired.\n2. Regenerated the OAuth token in Slack app settings.\n3. Updated the token in the environment configuration.\n4. Restarted the alerting service.\n5. Confirmed alerts are flowing correctly.',
      resolvedBy: 'Sarah Chen',
      resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      timeToResolve: 45,
      verified: true
    },
    referenceCount: 6
  },
  {
    id: 'ISS-008',
    title: 'Windows update causing blue screen on Dell laptops',
    description: 'The KB5031356 Windows update rolled out last night is causing BSOD on approximately 15 Dell Latitude 5520 laptops. Affected users cannot boot their machines.',
    systemAffected: 'Endpoint / Windows',
    severity: 'High',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    assignee: 'Marcus Webb',
    tags: ['deployment'],
    isMasterIncident: true,
    linkedIncidentCount: 15
  },
  {
    id: 'ISS-009',
    title: 'Printer offline errors across floor 3',
    description: 'All 4 printers on floor 3 are showing as offline. Users cannot print documents. The printers appear to be powered on but not responding to the network.',
    systemAffected: 'Hardware / Printing',
    severity: 'Low',
    status: 'Closed',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['network'],
    resolution: {
      id: 'RES-003',
      steps: '1. Investigated print server logs - found the print spooler service had crashed.\n2. Restarted print spooler service on the server.\n3. Cleared stuck print jobs from queue.\n4. Reset network adapters on 2 printers that still showed offline.\n5. All printers confirmed operational.',
      resolvedBy: 'Priya Patel',
      resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
      timeToResolve: 90,
      verified: true
    },
    referenceCount: 4
  },
  {
    id: 'ISS-010',
    title: 'Two-factor authentication codes not sending via SMS',
    description: 'Users are not receiving SMS verification codes for two-factor authentication. This is blocking access for users who rely on SMS-based 2FA. Email-based 2FA still works.',
    systemAffected: 'Authentication / 2FA',
    severity: 'High',
    status: 'Open',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    assignee: 'James Liu',
    tags: ['authentication', 'api']
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
  const issues = defaultIssues;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  return issues;
}

function saveIssues(issues: Issue[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
}

function loadRelationships(): IssueRelationship[] {
  try {
    const stored = localStorage.getItem(RELATIONSHIPS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return [];
}

function saveRelationships(rels: IssueRelationship[]): void {
  localStorage.setItem(RELATIONSHIPS_KEY, JSON.stringify(rels));
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
  issues[idx] = { ...issues[idx], ...updates, updatedAt: new Date().toISOString() };
  saveIssues(issues);
  return issues[idx];
}

export function deleteIssue(id: string): void {
  const issues = loadIssues().filter(i => i.id !== id);
  saveIssues(issues);
}

export function addResolution(issueId: string, resolution: Omit<Resolution, 'id' | 'resolvedAt'>): Issue | undefined {
  const issues = loadIssues();
  const idx = issues.findIndex(i => i.id === issueId);
  if (idx === -1) return undefined;
  const res: Resolution = {
    ...resolution,
    id: `RES-${Date.now()}`,
    resolvedAt: new Date().toISOString()
  };
  issues[idx] = { ...issues[idx], resolution: res, status: 'Resolved', updatedAt: new Date().toISOString() };
  saveIssues(issues);
  return issues[idx];
}

export function calculateConfidenceScore(issue: Issue): number {
  let score = 0;
  if (issue.resolution) {
    score += 40;
    if (issue.resolution.verified) score += 20;
    if (issue.resolution.timeToResolve) score += 10;
    if (issue.resolution.steps && issue.resolution.steps.length > 100) score += 10;
  }
  if (issue.referenceCount && issue.referenceCount > 0) {
    score += Math.min(issue.referenceCount * 3, 15);
  }
  if (issue.tags && issue.tags.length > 0) score += 5;
  if (issue.assignee) score += 5;
  return Math.min(score, 100);
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
    const severityOrder: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
  });
}

export function promoteToMasterIncident(id: string): Issue | undefined {
  return updateIssue(id, { isMasterIncident: true, linkedIncidentCount: 0 });
}

export function demoteMasterIncident(id: string): Issue | undefined {
  return updateIssue(id, { isMasterIncident: false });
}

export function linkIssueToMaster(sourceId: string, masterId: string, type: RelationshipType): IssueRelationship {
  const rels = loadRelationships();
  const rel: IssueRelationship = {
    id: `REL-${Date.now()}`,
    masterId,
    sourceId,
    type,
    createdAt: new Date().toISOString()
  };
  rels.push(rel);
  saveRelationships(rels);
  const masterIssue = getIssueById(masterId);
  if (masterIssue) {
    updateIssue(masterId, { linkedIncidentCount: (masterIssue.linkedIncidentCount || 0) + 1 });
  }
  updateIssue(sourceId, { masterIncidentId: masterId });
  return rel;
}

export function unlinkIssue(sourceId: string): void {
  const rels = loadRelationships();
  const rel = rels.find(r => r.sourceId === sourceId);
  if (rel) {
    const newRels = rels.filter(r => r.sourceId !== sourceId);
    saveRelationships(newRels);
    const masterIssue = getIssueById(rel.masterId);
    if (masterIssue) {
      updateIssue(rel.masterId, { linkedIncidentCount: Math.max((masterIssue.linkedIncidentCount || 1) - 1, 0) });
    }
    updateIssue(sourceId, { masterIncidentId: undefined });
  }
}

export function getRelationshipsForMaster(masterId: string): IssueRelationship[] {
  return loadRelationships().filter(r => r.masterId === masterId);
}

export function getRelationshipForSource(sourceId: string): IssueRelationship | undefined {
  return loadRelationships().find(r => r.sourceId === sourceId);
}

export function incrementReferenceCount(id: string): void {
  const issue = getIssueById(id);
  if (issue) {
    updateIssue(id, { referenceCount: (issue.referenceCount || 0) + 1 });
  }
}
