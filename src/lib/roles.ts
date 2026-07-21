import type { Rolle } from '../types/database';

export const HOME_PATH_BY_ROLE: Record<Rolle, string> = {
  junior: '/junior',
  trainer: '/trainer',
  admin: '/admin',
};

export function homePathForRole(rolle: Rolle | undefined): string {
  if (!rolle) return '/login';
  return HOME_PATH_BY_ROLE[rolle];
}
