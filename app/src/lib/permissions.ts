export type ProjectRole = 'admin' | 'manager' | 'member' | 'guest';

export const rolePriority: Record<ProjectRole, number> = {
  admin: 4,
  manager: 3,
  member: 2,
  guest: 1
};

export function normalizeRole(role: unknown): ProjectRole {
  if (role === 'admin' || role === 'manager' || role === 'member' || role === 'guest') {
    return role;
  }
  return 'guest';
}

export function canViewProject(role: ProjectRole | null): boolean {
  return role !== null;
}

export function canCreateTask(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager' || role === 'member';
}

export function canEditTask(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager' || role === 'member';
}

export function canDeleteTask(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager';
}

export function canComment(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager' || role === 'member' || role === 'guest';
}

export function canManageProject(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager';
}

export function canDeleteProject(role: ProjectRole | null): boolean {
  return role === 'admin';
}

export function canViewFinancials(role: ProjectRole | null): boolean {
  return role === 'admin';
}

export function canManageFinancials(role: ProjectRole | null): boolean {
  return role === 'admin';
}

export function canManageFiles(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager' || role === 'member';
}

export function canManageWiki(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager' || role === 'member';
}

export function canManageMilestones(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager' || role === 'member';
}

export function canManageCalendar(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager';
}

export function canManageTime(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager' || role === 'member';
}

export function canManageBilling(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager';
}

export function canManageAgile(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager' || role === 'member';
}

export function canViewReports(role: ProjectRole | null): boolean {
  return role === 'admin' || role === 'manager';
}
