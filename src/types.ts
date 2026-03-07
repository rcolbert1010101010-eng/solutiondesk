export type Status = 'Open' | 'Investigating' | 'Resolved' | 'Closed';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type Tag = 'network' | 'database' | 'authentication' | 'api' | 'permissions' | 'timeout' | 'deployment';

export const ALL_TAGS: Tag[] = ['network', 'database', 'authentication', 'api', 'permissions', 'timeout', 'deployment'];

export interface Resolution {
  rootCause: string;
  stepsTaken: string;
  finalResolution: string;
  preventionNotes: string;
  resolvedAt: string;
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
  resolution?: string;
  resolutionDetails?: Resolution;
  tags: Tag[];
}
