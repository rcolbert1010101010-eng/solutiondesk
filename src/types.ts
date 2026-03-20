export type Status = 'Open' | 'Investigating' | 'Resolved' | 'Closed';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type RelationshipType = 'duplicate' | 'similar' | 'derived_from' | 'confirmed_same_root_cause';
export type ConfidenceLevel = 'Low Confidence' | 'Medium Confidence' | 'High Confidence' | 'Proven Resolution';

export type TagReference = string;

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Resolution {
  id?: string;
  issueId?: string | null;
  sourceType?: 'library' | 'issue';
  sourceIssueId?: string;
  sourceIssueTitle?: string;
  title?: string;
  summary?: string;
  rootCause?: string;
  steps?: string[] | string;
  stepsHtml?: string;
  stepsTaken?: string;
  finalResolution?: string;
  preventionNotes?: string;
  notes?: string;
  notesText?: string;
  tags?: TagReference[];
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  referenceCount?: number;
  timeToResolve?: number;
  timeToResolveMinutes?: number;
}

export interface IssueRelationship {
  id?: string;
  sourceId?: string;
  masterId?: string;
  relationshipType?: RelationshipType;
  linkedAt?: string;
  type?: RelationshipType;
  source_issue_id?: string;
  master_issue_id?: string;
  relationship_type?: RelationshipType;
  linked_at?: string;
  linked_by?: string;
  createdAt?: string;
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  descriptionText?: string;
  descriptionHtml?: string;
  systemAffected: string;
  severity: Severity;
  status: Status;
  createdAt: string;
  updatedAt?: string;
  assignee?: string;
  tags?: TagReference[];
  resolution?: Resolution;
  resolutions?: Resolution[];
  isMasterIncident?: boolean;
  masterIncidentId?: string;
  linkedIncidentCount?: number;
  lastLinkedAt?: string;
  referenceCount?: number;
  confidenceScore?: number;
}

export interface SystemAffected {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
