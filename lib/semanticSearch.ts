import { Issue } from '../types';

export interface SemanticMatch {
  issue: Issue;
  score: number;
  reasons: MatchReason[];
}

export type MatchReasonType =
  | 'similar_error_pattern'
  | 'same_affected_system'
  | 'matching_root_cause'
  | 'linked_master_incident'
  | 'keyword_overlap'
  | 'tag_overlap'
  | 'similar_description';

export interface MatchReason {
  type: MatchReasonType;
  label: string;
  detail?: string;
}

// Synonym/semantic groups for common IT terms
const SEMANTIC_GROUPS: string[][] = [
  ['vpn', 'tunnel', 'remote access', 'connectivity', 'connection'],
  ['crash', 'fail', 'error', 'down', 'unavailable', 'outage', '503', '500', '502', '504'],
  ['slow', 'latency', 'timeout', 'performance', 'lag', 'delay', 'unresponsive'],
  ['login', 'authentication', 'auth', 'password', 'credentials', 'sso', 'saml', 'ldap', 'active directory'],
  ['database', 'db', 'sql', 'postgres', 'mysql', 'mongo', 'storage'],
  ['network', 'dns', 'firewall', 'proxy', 'router', 'switch', 'ip', 'tcp', 'udp'],
  ['email', 'smtp', 'exchange', 'mail', 'outlook'],
  ['api', 'endpoint', 'rest', 'graphql', 'webhook', 'integration'],
  ['deploy', 'deployment', 'release', 'update', 'upgrade', 'patch', 'rollout'],
  ['permission', 'access', 'role', 'policy', 'acl', 'rbac', 'unauthorized', '403', '401'],
  ['certificate', 'ssl', 'tls', 'https', 'cert', 'expired'],
  ['memory', 'cpu', 'disk', 'storage', 'capacity', 'resource', 'oom'],
  ['sync', 'replication', 'backup', 'restore', 'failover', 'cluster'],
  ['user', 'account', 'provisioning', 'onboarding', 'license'],
  ['server', 'host', 'instance', 'vm', 'container', 'kubernetes', 'docker'],
  ['log', 'audit', 'monitoring', 'alert', 'notification'],
  ['browser', 'client', 'frontend', 'ui', 'web', 'portal'],
  ['payment', 'billing', 'invoice', 'subscription'],
  ['report', 'dashboard', 'analytics', 'metrics', 'kpi'],
  ['file', 'upload', 'download', 'attachment', 'document', 'share'],
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function getSemanticGroup(token: string): number {
  for (let i = 0; i < SEMANTIC_GROUPS.length; i++) {
    if (SEMANTIC_GROUPS[i].some(term => token.includes(term) || term.includes(token))) {
      return i;
    }
  }
  return -1;
}

function getTokenGroups(tokens: string[]): Set<number> {
  const groups = new Set<number>();
  for (const token of tokens) {
    const group = getSemanticGroup(token);
    if (group !== -1) groups.add(group);
  }
  return groups;
}

function cosineSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x));
  if (intersection.length === 0) return 0;
  return intersection.length / Math.sqrt(setA.size * setB.size);
}

function semanticGroupSimilarity(groupsA: Set<number>, groupsB: Set<number>): number {
  if (groupsA.size === 0 || groupsB.size === 0) return 0;
  let overlap = 0;
  groupsA.forEach(g => { if (groupsB.has(g)) overlap++; });
  return overlap / Math.sqrt(groupsA.size * groupsB.size);
}

function getIssueText(issue: Issue): string {
  const parts = [
    issue.title,
    issue.description,
    issue.systemAffected,
    issue.resolution?.rootCause ?? '',
    issue.resolution?.summary ?? '',
    ...(issue.tags ?? [])
  ];
  return parts.join(' ');
}

export function semanticSearch(
  query: string,
  issues: Issue[],
  options: {
    currentIssueId?: string;
    onlyResolved?: boolean;
    topK?: number;
    minScore?: number;
  } = {}
): SemanticMatch[] {
  const { currentIssueId, onlyResolved = false, topK = 5, minScore = 0.05 } = options;

  const queryTokens = tokenize(query);
  const queryGroups = getTokenGroups(queryTokens);
  const queryLower = query.toLowerCase();

  const candidates = issues.filter(issue => {
    if (issue.id === currentIssueId) return false;
    if (onlyResolved && issue.status !== 'Resolved' && issue.status !== 'Closed') return false;
    return true;
  });

  const results: SemanticMatch[] = candidates.map(issue => {
    const issueText = getIssueText(issue);
    const issueTokens = tokenize(issueText);
    const issueGroups = getTokenGroups(issueTokens);

    const reasons: MatchReason[] = [];
    let score = 0;

    // 1. Keyword overlap (direct)
    const kwScore = cosineSimilarity(queryTokens, issueTokens);
    if (kwScore > 0) {
      score += kwScore * 0.3;
      if (kwScore > 0.1) {
        reasons.push({ type: 'keyword_overlap', label: 'Keyword overlap', detail: `${Math.round(kwScore * 100)}% keyword match` });
      }
    }

    // 2. Semantic group similarity
    const semScore = semanticGroupSimilarity(queryGroups, issueGroups);
    if (semScore > 0) {
      score += semScore * 0.35;
      if (semScore > 0.15) {
        const matchedGroups = [...queryGroups].filter(g => issueGroups.has(g));
        const groupTerms = matchedGroups.map(g => SEMANTIC_GROUPS[g][0]).join(', ');
        reasons.push({ type: 'similar_error_pattern', label: 'Similar error pattern', detail: groupTerms });
      }
    }

    // 3. System affected match
    const systemLower = issue.systemAffected.toLowerCase();
    const systemTokens = tokenize(issue.systemAffected);
    const systemKwMatch = cosineSimilarity(queryTokens, systemTokens);
    const systemGroupMatch = semanticGroupSimilarity(queryGroups, getTokenGroups(systemTokens));
    if (systemKwMatch > 0.1 || systemGroupMatch > 0.2 || queryLower.includes(systemLower) || systemLower.split('/').some(s => queryLower.includes(s.trim().toLowerCase()))) {
      score += 0.2;
      reasons.push({ type: 'same_affected_system', label: 'Same affected system', detail: issue.systemAffected });
    }

    // 4. Root cause match
    if (issue.resolution?.rootCause) {
      const rcTokens = tokenize(issue.resolution.rootCause);
      const rcScore = cosineSimilarity(queryTokens, rcTokens);
      const rcGroupScore = semanticGroupSimilarity(queryGroups, getTokenGroups(rcTokens));
      if (rcScore > 0.08 || rcGroupScore > 0.2) {
        score += Math.max(rcScore, rcGroupScore) * 0.25;
        reasons.push({ type: 'matching_root_cause', label: 'Matching root cause', detail: issue.resolution.rootCause.slice(0, 80) + (issue.resolution.rootCause.length > 80 ? '...' : '') });
      }
    }

    // 5. Tag overlap
    const issueTags = issue.tags ?? [];
    const queryTagMatches = issueTags.filter(tag => queryLower.includes(tag) || tokenize(tag).some(t => queryTokens.includes(t)));
    if (queryTagMatches.length > 0) {
      score += queryTagMatches.length * 0.08;
      reasons.push({ type: 'tag_overlap', label: 'Matching tags', detail: queryTagMatches.join(', ') });
    }

    // 6. Description similarity
    const descTokens = tokenize(issue.description);
    const descScore = cosineSimilarity(queryTokens, descTokens);
    if (descScore > 0.12) {
      score += descScore * 0.2;
      reasons.push({ type: 'similar_description', label: 'Similar description' });
    }

    // 7. Master incident bonus
    if (issue.isMasterIncident) {
      score *= 1.2;
      if (reasons.length > 0) {
        reasons.push({ type: 'linked_master_incident', label: 'Linked to master incident', detail: `${issue.linkedIncidentCount ?? 0} linked incidents` });
      }
    }

    // 8. Confidence score bonus
    const refCount = issue.referenceCount ?? 0;
    const linkedCount = issue.linkedIncidentCount ?? 0;
    const confidenceBonus = Math.min((refCount + linkedCount) * 0.01, 0.1);
    score += confidenceBonus;

    // Deduplicate reasons
    const seen = new Set<string>();
    const uniqueReasons = reasons.filter(r => {
      if (seen.has(r.type)) return false;
      seen.add(r.type);
      return true;
    });

    return { issue, score, reasons: uniqueReasons };
  });

  return results
    .filter(r => r.score >= minScore && r.reasons.length > 0)
    .sort((a, b) => {
      // Prioritize master incidents with high score
      const aMaster = a.issue.isMasterIncident ? 1 : 0;
      const bMaster = b.issue.isMasterIncident ? 1 : 0;
      if (Math.abs(a.score - b.score) < 0.05) {
        return bMaster - aMaster || b.score - a.score;
      }
      return b.score - a.score;
    })
    .slice(0, topK);
}

export function getMatchReasonIcon(type: MatchReasonType): string {
  const icons: Record<MatchReasonType, string> = {
    similar_error_pattern: '⚡',
    same_affected_system: '🖥',
    matching_root_cause: '🔍',
    linked_master_incident: '🔗',
    keyword_overlap: '📝',
    tag_overlap: '🏷',
    similar_description: '📄',
  };
  return icons[type] ?? '•';
}
