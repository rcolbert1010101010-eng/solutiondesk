export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type Status = 'Open' | 'Investigating' | 'Resolved' | 'Closed';

export interface Issue {
  id: string;
  title: string;
  description: string;
  systemAffected: string;
  severity: Severity;
  status: Status;
  createdAt: string;
  resolution?: string;
  assignee?: string;
}
