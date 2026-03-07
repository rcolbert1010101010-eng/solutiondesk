export type Status = 'Open' | 'Investigating' | 'Resolved' | 'Closed';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type Tag = 'network' | 'database' | 'authentication' | 'api' | 'permissions' | 'timeout' | 'deployment';
export type RelationshipType = 'duplicate' | 'similar' | 'derived_from' | 'confirmed_same_root_cause';
export type ConfidenceLevel = 'Low Confidence' | 'Medium Confidence' | 'High Confidence' | 'Proven Resolution';

export const ALL_TAGS: Tag[] = ['network', 'database', 'authentication', 'api', 'permissions', 'timeout', 'deployment'];

export interface Resolution {
  rootCause: string;
  stepsTaken: string;
  finalResolution: string;
  preventionNotes: string;
  resolvedAt: string;
}

export interface IssueRelationship {
  id: string;
  source_issue_id: string;
  master_issue_id: string;
  relationship_type: RelationshipType;
  linked_at: string;
  linked_by: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  systemAffected: string;
  severity: Severity;
  status: Status;
  createdAt: string;
  assignee?: string;
  tags?: Tag[];
  resolution?: Resolution;
  isMasterIncident?: boolean;
  masterIncidentId?: string;
  linkedIncidentCount?: number;
  lastLinkedAt?: string;
  referenceCount?: number;
  confidenceScore?: number;
}
