import type { Issue, IssueRelationship, RelationshipType, Resolution } from '../types';
import {
  addIssueToStore,
  addResolutionToStore,
  deleteIssueFromStore,
  deleteResolutionFromStore,
  demoteIssueFromMaster,
  getAllIssuesFromStore,
  getIssueByIdFromStore,
  getRelationshipForSourceFromStore,
  getRelationshipsForMasterFromStore,
  incrementIssueReferenceCount,
  ISSUES_CHANGED_EVENT,
  linkIssueToMasterInStore,
  promoteIssueToMaster,
  syncIssueAttachmentsInStore,
  syncResolutionAttachmentsInStore,
  unlinkIssueInStore,
  updateIssueInStore,
  updateResolutionInStore,
} from './supabaseData';
import { getIssueDescriptionText } from './richText';

export { ISSUES_CHANGED_EVENT };

export async function getAllIssues(): Promise<Issue[]> {
  return getAllIssuesFromStore();
}

export async function listIssues(): Promise<Issue[]> {
  return getAllIssues();
}

export async function getIssueById(id: string): Promise<Issue | undefined> {
  return getIssueByIdFromStore(id);
}

export async function getIssue(id: string): Promise<Issue | undefined> {
  return getIssueById(id);
}

export async function addIssue(newIssue: Omit<Issue, 'id' | 'createdAt'>): Promise<Issue> {
  return addIssueToStore(newIssue);
}

export async function createIssue(newIssue: Omit<Issue, 'id' | 'createdAt'>): Promise<Issue> {
  return addIssue(newIssue);
}

export async function updateIssue(id: string, updates: Partial<Issue>): Promise<Issue | undefined> {
  return updateIssueInStore(id, updates);
}

export async function deleteIssue(id: string): Promise<boolean> {
  return deleteIssueFromStore(id);
}

export async function addResolution(issueId: string, resolution: Omit<Resolution, 'id'>): Promise<Issue | undefined> {
  return addResolutionToStore(issueId, resolution);
}

export async function updateResolution(issueId: string, resolutionId: string, updates: Partial<Resolution>): Promise<Issue | undefined> {
  return updateResolutionInStore(issueId, resolutionId, updates);
}

export async function deleteResolution(issueId: string, resolutionId: string): Promise<Issue | undefined> {
  return deleteResolutionFromStore(issueId, resolutionId);
}

export async function syncIssueAttachments(issueId: string, input: { attachmentIdsToDelete: string[]; filesToUpload: File[] }) {
  return syncIssueAttachmentsInStore(issueId, input);
}

export async function syncResolutionAttachments(resolutionId: string, input: { attachmentIdsToDelete: string[]; filesToUpload: File[] }) {
  return syncResolutionAttachmentsInStore(resolutionId, input);
}

export async function incrementReferenceCount(issueId: string, resolutionId?: string): Promise<Issue | undefined> {
  return incrementIssueReferenceCount(issueId, resolutionId);
}

export async function promoteToMasterIncident(issueId: string): Promise<Issue | undefined> {
  return promoteIssueToMaster(issueId);
}

export async function demoteMasterIncident(issueId: string): Promise<Issue | undefined> {
  return demoteIssueFromMaster(issueId);
}

export async function linkIssueToMaster(sourceId: string, masterId: string, type: RelationshipType): Promise<IssueRelationship | undefined> {
  return linkIssueToMasterInStore(sourceId, masterId, type);
}

export async function unlinkIssue(sourceId: string): Promise<boolean> {
  return unlinkIssueInStore(sourceId);
}

export async function getRelationshipsForMaster(masterId: string): Promise<IssueRelationship[]> {
  return getRelationshipsForMasterFromStore(masterId);
}

export async function getRelationshipForSource(sourceId: string): Promise<IssueRelationship | undefined> {
  return getRelationshipForSourceFromStore(sourceId);
}

export function calculateConfidenceScore(issue: Issue): number {
  let score = 0;
  const description = getIssueDescriptionText(issue);

  if (description && description.length > 50) score += 20;
  if (description && description.length > 150) score += 10;
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
