import type { SystemAffected } from '../types';
import {
  createSystemAffected as createSystemAffectedInStore,
  listSystemsAffected as listSystemsAffectedFromStore,
  normalizeSystemAffectedNameKey,
  SYSTEMS_AFFECTED_CHANGED_EVENT,
} from './supabaseData';

export { SYSTEMS_AFFECTED_CHANGED_EVENT };

export function normalizeSystemAffectedName(name: string): string {
  return normalizeSystemAffectedNameKey(name);
}

export async function listSystemsAffected(): Promise<SystemAffected[]> {
  return listSystemsAffectedFromStore();
}

export async function createSystemAffected(name: string): Promise<SystemAffected> {
  return createSystemAffectedInStore(name);
}
