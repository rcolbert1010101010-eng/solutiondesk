export type Status = 'Open' | 'Investigating' | 'Resolved' | 'Closed';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type Tag = 'network' | 'database' | 'authentication' | 'api' | 'permissions' | 'timeout' | 'deployment';
export type RelationshipType = 'duplicate' | 'similar' | 'derived_from' | 'confirmed_same_root_cause';

export const ALL_TAGS: Tag[] = ['network', 'database', 'authentication', 'api', 'permissions', 'timeout', 'deployment'];

export interface Resolution {
  id: string;
  steps: string;
  resolvedBy: string;
  resolvedAt: string;
  timeToResolve?: number;
  verified?: boolean;
}

export interface IssueRelationship {
  id: string;
  masterId: string;
  sourceId: string;
  type: RelationshipType;
  createdAt: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  systemAffected: string;
  severity: Severity;
  status: Status;
  createdAt: string;
  updatedAt?: string;
  assignee?: string;
  tags: Tag[];
  resolution?: Resolution;
  isMasterIncident?: boolean;
  linkedIncidentCount?: number;
  referenceCount?: number;
  masterIncidentId?: string;
}
