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
    status: 'Resolved',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Sarah Chen',
    tags: ['authentication', 'permissions'],
    resolution: {
      rootCause: 'Azure AD sync was paused due to a failed sync cycle caused by a corrupted user object.',
      stepsTaken: 'Identified the corrupted user object using Azure AD Connect Health. Removed the corrupted object and forced a full sync.',
      finalResolution: 'Deleted the corrupted user object from the on-premises AD and ran a full Azure AD Connect sync. All licenses provisioned successfully within 15 minutes.',
      preventionNotes: 'Set up Azure AD Connect Health alerts. Schedule weekly sync health checks.',
      resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    isMasterIncident: true,
    linkedIncidentCount: 4,
    lastLinkedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    referenceCount: 7,
    confidenceScore: 92
  },
  {
    id: 'ISS-005',
    title: 'Slow database queries causing ERP timeout',
    description: 'The ERP system is timing out during month-end processing. Database queries are taking 10x longer than normal.',
    systemAffected: 'ERP / SAP',
    severity: 'High',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Marcus Webb',
    tags: ['database', 'timeout'],
    resolution: {
      rootCause: 'Missing index on the transactions table caused full table scans during month-end aggregate queries.',
      stepsTaken: 'Ran EXPLAIN ANALYZE on slow queries. Identified missing composite index. Added index during maintenance window.',
      finalResolution: 'Added composite index on (account_id, created_at) columns. Query time dropped from 45s to 0.3s.',
      preventionNotes: 'Set up slow query logging. Review query plans monthly. Add index recommendations to deployment checklist.',
      resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    isMasterIncident: true,
    linkedIncidentCount: 6,
    lastLinkedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    referenceCount: 12,
    confidenceScore: 98
  },
  {
    id: 'ISS-006',
    title: 'SSL certificate expired on customer portal',
    description: 'The customer-facing web portal is showing SSL certificate errors. Customers cannot access their accounts.',
    systemAffected: 'Web / Customer Portal',
    severity: 'Critical',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Jordan Kim',
    tags: ['api', 'permissions'],
    resolution: {
      rootCause: 'Auto-renewal of SSL certificate failed because the DNS challenge could not complete due to a misconfigured CAA record.',
      stepsTaken: 'Corrected the CAA record in DNS. Manually triggered certificate renewal. Updated load balancer config.',
      finalResolution: 'Fixed CAA DNS record, renewed certificate manually via certbot, and deployed to all load balancer nodes.',
      preventionNotes: 'Set up certificate expiry monitoring with 30/14/7 day alerts. Document CAA record requirements.',
      resolvedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
    },
    isMasterIncident: true,
    linkedIncidentCount: 3,
    lastLinkedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    referenceCount: 5,
    confidenceScore: 78
  },
  {
    id: 'ISS-007',
    title: 'Printer offline after Windows Update',
    description: 'Multiple users report their network printers went offline after last nights Windows Update push.',
    systemAffected: 'Printing / Hardware',
    severity: 'Medium',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Alex Torres',
    tags: ['network', 'deployment'],
    resolution: {
      rootCause: 'Windows Update KB5025239 reset the print spooler service startup type to Manual.',
      stepsTaken: 'Verified spooler service state on affected machines. Set startup type back to Automatic. Restarted service.',
      finalResolution: 'Deployed GPO fix to set Print Spooler service to Automatic on all workstations.',
      preventionNotes: 'Add printer connectivity to post-update validation checklist. Monitor spooler service via RMM.',
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    linkedIncidentCount: 2,
    lastLinkedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    referenceCount: 3,
    confidenceScore: 55
  },
  {
    id: 'ISS-008',
    title: 'Azure AD license provisioning failure after org migration',
    description: 'Following the org unit migration, new user accounts are not receiving Microsoft 365 licenses. Pattern similar to ISS-004.',
    systemAffected: 'Microsoft 365 / Licensing',
    severity: 'High',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Sarah Chen',
    tags: ['authentication', 'permissions'],
    resolution: {
      rootCause: 'Azure AD sync corrupted user objects during OU migration.',
      stepsTaken: 'Applied same fix as ISS-004: identified corrupted objects and forced full sync.',
      finalResolution: 'Removed corrupted user objects and ran full Azure AD Connect sync.',
      preventionNotes: 'Follow ISS-004 prevention guidelines.',
      resolvedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    masterIncidentId: 'ISS-004'
  },
  {
    id: 'ISS-009',
    title: 'ERP reports timing out during quarterly close',
    description: 'Finance team cannot run quarterly close reports — queries timing out after 30 seconds.',
    systemAffected: 'ERP / SAP',
    severity: 'Critical',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Marcus Webb',
    tags: ['database', 'timeout'],
    resolution: {
      rootCause: 'Same missing index pattern as ISS-005 on the reports aggregate table.',
      stepsTaken: 'Added required indexes following ISS-005 resolution playbook.',
      finalResolution: 'Indexes added, query time normalized.',
      preventionNotes: 'See ISS-005 prevention notes.',
      resolvedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString()
    },
    masterIncidentId: 'ISS-005'
  }
];

const defaultRelationships: IssueRelationship[] = [
  {
    id: 'REL-001',
    source_issue_id: 'ISS-008',
    master_issue_id: 'ISS-004',
    relationship_type: 'confirmed_same_root_cause',
    linked_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    linked_by: 'Sarah Chen'
  },
  {
    id: 'REL-002',
    source_issue_id: 'ISS-009',
    master_issue_id: 'ISS-005',
    relationship_type: 'confirmed_same_root_cause',
    linked_at: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    linked_by: 'Marcus Webb'
  }
];

function loadIssues(): Issue[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Issue[];
  } catch {}
  const initial = defaultIssues;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveIssues(issues: Issue[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
}

function loadRelationships(): IssueRelationship[] {
  try {
    const raw = localStorage.getItem(RELATIONSHIPS_KEY);
    if (raw) return JSON.parse(raw) as IssueRelationship[];
  } catch {}
  localStorage.setItem(RELATIONSHIPS_KEY, JSON.stringify(defaultRelationships));
  return defaultRelationships;
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
  issues[idx] = { ...issues[idx], ...updates };
  saveIssues(issues);
  return issues[idx];
}

export function deleteIssue(id: string): void {
  const issues = loadIssues().filter(i => i.id !== id);
  saveIssues(issues);
}

export function addResolution(id: string, resolution: Resolution): Issue | undefined {
  return updateIssue(id, { resolution, status: 'Resolved' });
}

export function promoteToMasterIncident(id: string): Issue | undefined {
  const issue = getIssueById(id);
  if (!issue || (issue.status !== 'Resolved' && issue.status !== 'Closed')) return undefined;
  return updateIssue(id, { isMasterIncident: true });
}

export function demoteMasterIncident(id: string): Issue | undefined {
  return updateIssue(id, { isMasterIncident: false });
}

export function linkIssueToMaster(
  sourceId: string,
  masterId: string,
  relationshipType: RelationshipType,
  linkedBy: string
): IssueRelationship | undefined {
  const issues = loadIssues();
  const source = issues.find(i => i.id === sourceId);
  const master = issues.find(i => i.id === masterId);
  if (!source || !master) return undefined;

  const rels = loadRelationships();
  const existing = rels.find(r => r.source_issue_id === sourceId && r.master_issue_id === masterId);
  if (existing) return existing;

  const newRel: IssueRelationship = {
    id: `REL-${String(rels.length + 1).padStart(3, '0')}`,
    source_issue_id: sourceId,
    master_issue_id: masterId,
    relationship_type: relationshipType,
    linked_at: new Date().toISOString(),
    linked_by: linkedBy
  };
  rels.push(newRel);
  saveRelationships(rels);

  // Update source issue
  const srcIdx = issues.findIndex(i => i.id === sourceId);
  if (srcIdx !== -1) issues[srcIdx] = { ...issues[srcIdx], masterIncidentId: masterId };

  // Update master incident counts
  const masterIdx = issues.findIndex(i => i.id === masterId);
  if (masterIdx !== -1) {
    const currentCount = issues[masterIdx].linkedIncidentCount ?? 0;
    const currentRef = issues[masterIdx].referenceCount ?? 0;
    issues[masterIdx] = {
      ...issues[masterIdx],
      linkedIncidentCount: currentCount + 1,
      lastLinkedAt: new Date().toISOString(),
      referenceCount: currentRef + 1
    };
    issues[masterIdx].confidenceScore = calculateConfidenceScore(issues[masterIdx]);
  }

  saveIssues(issues);
  return newRel;
}

export function unlinkIssue(sourceId: string, masterId: string): void {
  const rels = loadRelationships().filter(
    r => !(r.source_issue_id === sourceId && r.master_issue_id === masterId)
  );
  saveRelationships(rels);

  const issues = loadIssues();
  const srcIdx = issues.findIndex(i => i.id === sourceId);
  if (srcIdx !== -1) {
    const { masterIncidentId, ...rest } = issues[srcIdx];
    issues[srcIdx] = rest;
  }

  const masterIdx = issues.findIndex(i => i.id === masterId);
  if (masterIdx !== -1) {
    const currentCount = issues[masterIdx].linkedIncidentCount ?? 1;
    issues[masterIdx] = {
      ...issues[masterIdx],
      linkedIncidentCount: Math.max(0, currentCount - 1)
    };
    issues[masterIdx].confidenceScore = calculateConfidenceScore(issues[masterIdx]);
  }
  saveIssues(issues);
}

export function getRelationshipsForMaster(masterId: string): IssueRelationship[] {
  return loadRelationships().filter(r => r.master_issue_id === masterId);
}

export function getRelationshipForSource(sourceId: string): IssueRelationship | undefined {
  return loadRelationships().find(r => r.source_issue_id === sourceId);
}

export function getAllRelationships(): IssueRelationship[] {
  return loadRelationships();
}

export function calculateConfidenceScore(issue: Issue): number {
  let score = 0;
  if (issue.status === 'Resolved' || issue.status === 'Closed') score += 20;
  if (issue.isMasterIncident) score += 20;
  const linked = issue.linkedIncidentCount ?? 0;
  score += Math.min(linked * 8, 30);
  const refs = issue.referenceCount ?? 0;
  score += Math.min(refs * 2, 15);
  if (issue.lastLinkedAt) {
    const daysSince = (Date.now() - new Date(issue.lastLinkedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 1) score += 15;
    else if (daysSince < 7) score += 10;
    else if (daysSince < 30) score += 5;
  }
  return Math.min(score, 100);
}

export function getConfidenceLevel(score: number): import('../types').ConfidenceLevel {
  if (score >= 85) return 'Proven Resolution';
  if (score >= 65) return 'High Confidence';
  if (score >= 40) return 'Medium Confidence';
  return 'Low Confidence';
}

export function rankIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.isMasterIncident) scoreA += 30;
    if (b.isMasterIncident) scoreB += 30;
    scoreA += Math.min((a.linkedIncidentCount ?? 0) * 5, 25);
    scoreB += Math.min((b.linkedIncidentCount ?? 0) * 5, 25);
    scoreA += (a.confidenceScore ?? 0) * 0.3;
    scoreB += (b.confidenceScore ?? 0) * 0.3;
    if (a.lastLinkedAt) {
      const days = (Date.now() - new Date(a.lastLinkedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (days < 1) scoreA += 20;
      else if (days < 7) scoreA += 10;
      else if (days < 30) scoreA += 5;
    }
    if (b.lastLinkedAt) {
      const days = (Date.now() - new Date(b.lastLinkedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (days < 1) scoreB += 20;
      else if (days < 7) scoreB += 10;
      else if (days < 30) scoreB += 5;
    }
    return scoreB - scoreA;
  });
}

export function incrementReferenceCount(id: string): void {
  const issues = loadIssues();
  const idx = issues.findIndex(i => i.id === id);
  if (idx === -1) return;
  issues[idx] = {
    ...issues[idx],
    referenceCount: (issues[idx].referenceCount ?? 0) + 1
  };
  issues[idx].confidenceScore = calculateConfidenceScore(issues[idx]);
  saveIssues(issues);
}
