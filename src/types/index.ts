export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type Status = 'Open' | 'Investigating' | 'Resolved' | 'Closed';

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
  resolution?: string;
  resolutionData?: Resolution;
  assignee?: string;
}
