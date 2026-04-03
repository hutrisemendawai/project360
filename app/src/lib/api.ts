import { pb } from './pocketbase';
import {
  canComment as hasCommentPermission,
  canCreateTask as hasTaskCreatePermission,
  canDeleteProject as hasProjectDeletePermission,
  canDeleteTask as hasTaskDeletePermission,
  canEditTask as hasTaskEditPermission,
  canManageProject as hasProjectManagePermission,
  canManageFinancials as hasFinancialManagePermission,
  canViewFinancials as hasFinancialViewPermission,
  canViewProject as hasProjectViewPermission,
  normalizeRole,
  type ProjectRole
} from './permissions';

type AuditAction = 'create' | 'update' | 'delete';

type ProjectAccess = {
  role: ProjectRole | null;
  canViewProject: boolean;
  canCreateTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canComment: boolean;
  canManageProject: boolean;
  canDeleteProject: boolean;
  canViewFinancials: boolean;
  canManageFinancials: boolean;
};

function buildAccess(role: ProjectRole | null): ProjectAccess {
  return {
    role,
    canViewProject: hasProjectViewPermission(role),
    canCreateTask: hasTaskCreatePermission(role),
    canEditTask: hasTaskEditPermission(role),
    canDeleteTask: hasTaskDeletePermission(role),
    canComment: hasCommentPermission(role),
    canManageProject: hasProjectManagePermission(role),
    canDeleteProject: hasProjectDeletePermission(role),
    canViewFinancials: hasFinancialViewPermission(role),
    canManageFinancials: hasFinancialManagePermission(role)
  };
}

function requireUserId(): string {
  const userId = pb.authStore.record?.id;
  if (!userId) {
    throw new Error('Authentication required.');
  }
  return userId;
}

async function getProjectRole(projectId: string): Promise<ProjectRole | null> {
  const userId = pb.authStore.record?.id;
  if (!userId) return null;

  try {
    const membership = await pb.collection('project_members').getFirstListItem(
      `project = "${projectId}" && user = "${userId}"`
    );
    return normalizeRole(membership.role);
  } catch {
    return null;
  }
}

async function getProjectAccess(projectId: string): Promise<ProjectAccess> {
  const role = await getProjectRole(projectId);
  return buildAccess(role);
}

async function getTaskWithAccess(taskId: string) {
  const task = await pb.collection('tasks').getOne(taskId);
  const access = await getProjectAccess(task.project);
  return { task, access };
}

async function getOrCreateProjectFinancials(projectId: string) {
  try {
    return await pb.collection('project_financials').getFirstListItem(`project = "${projectId}"`);
  } catch {
    return await pb.collection('project_financials').create({
      project: projectId,
      budget: 0,
      actualCost: 0
    });
  }
}

async function ensureDefaultWorkspaceForCurrentUser(): Promise<string> {
  const userId = requireUserId();

  try {
    const membership = await pb
      .collection('workspace_members')
      .getFirstListItem(`user = "${userId}"`, { expand: 'workspace' });
    return membership.workspace;
  } catch {
    const org = await pb.collection('organizations').create({
      name: `${pb.authStore.record?.name || pb.authStore.record?.email || 'Organization'}`,
      owner: userId
    });

    const workspace = await pb.collection('workspaces').create({
      organization: org.id,
      name: 'Default Workspace'
    });

    await pb.collection('workspace_members').create({
      workspace: workspace.id,
      user: userId,
      role: 'admin'
    });

    return workspace.id;
  }
}

async function getWorkspaceRole(workspaceId: string): Promise<ProjectRole | null> {
  const userId = pb.authStore.record?.id;
  if (!userId) return null;

  try {
    const membership = await pb
      .collection('workspace_members')
      .getFirstListItem(`workspace = "${workspaceId}" && user = "${userId}"`);
    return normalizeRole(membership.role);
  } catch {
    return null;
  }
}

async function logAudit(params: {
  action: AuditAction;
  entity: string;
  entityId: string;
  project?: string;
  workspace?: string;
  before?: unknown;
  after?: unknown;
}) {
  const userId = pb.authStore.record?.id;
  if (!userId) return;

  try {
    await pb.collection('audit_logs').create({
      user: userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      project: params.project || null,
      workspace: params.workspace || null,
      beforeData: params.before ? JSON.stringify(params.before) : '',
      afterData: params.after ? JSON.stringify(params.after) : ''
    });
  } catch (err) {
    console.warn('Failed to write audit log', err);
  }
}

function buildFinancialUpdatePayload(data: { budget?: number; actualCost?: number }) {
  return {
    ...(data.budget !== undefined ? { budget: data.budget } : {}),
    ...(data.actualCost !== undefined ? { actualCost: data.actualCost } : {})
  };
}

export const api = {
  governance: {
    async getProjectAccess(projectId: string): Promise<ProjectAccess> {
      return getProjectAccess(projectId);
    },

    async canCreateProjectInDefaultWorkspace(): Promise<boolean> {
      const workspaceId = await ensureDefaultWorkspaceForCurrentUser();
      const role = await getWorkspaceRole(workspaceId);
      return role === 'admin' || role === 'manager' || role === 'member';
    },

    async canManageFinancialsInDefaultWorkspace(): Promise<boolean> {
      const workspaceId = await ensureDefaultWorkspaceForCurrentUser();
      const role = await getWorkspaceRole(workspaceId);
      return role === 'admin';
    }
  },

  projects: {
    async getAll() {
      requireUserId();

      const [projects, memberships] = await Promise.all([
        pb.collection('projects').getFullList({ sort: '-created', expand: 'workspace' }),
        pb.collection('project_members').getFullList({ filter: `user = "${requireUserId()}"` })
      ]);

      const rolesByProject = new Map<string, ProjectRole>();
      memberships.forEach((membership) => {
        rolesByProject.set(membership.project, normalizeRole(membership.role));
      });

      const adminProjectIds = [...rolesByProject.entries()]
        .filter(([, role]) => role === 'admin')
        .map(([projectId]) => projectId);

      const financialsByProject = new Map<string, { budget: number; actualCost: number }>();
      if (adminProjectIds.length > 0) {
        const filters = adminProjectIds.map((id) => `project = "${id}"`).join(' || ');
        const financials = await pb.collection('project_financials').getFullList({ filter: filters });
        financials.forEach((record) => {
          financialsByProject.set(record.project, {
            budget: record.budget || 0,
            actualCost: record.actualCost || 0
          });
        });
      }

      return projects
        .map((project) => {
          const role = rolesByProject.get(project.id) ?? null;
          const access = buildAccess(role);
          if (!access.canViewProject) return null;

          return {
            ...project,
            access,
            financials: access.canViewFinancials ? financialsByProject.get(project.id) ?? null : null
          };
        })
        .filter(Boolean);
    },

    async getOne(id: string) {
      requireUserId();
      const project = await pb.collection('projects').getOne(id, { expand: 'workspace' });
      const access = await getProjectAccess(id);

      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }

      let financials = null;
      if (access.canViewFinancials) {
        const record = await getOrCreateProjectFinancials(id);
        financials = {
          id: record.id,
          budget: record.budget || 0,
          actualCost: record.actualCost || 0
        };
      }

      return {
        ...project,
        access,
        financials
      };
    },

    async create(data: { name: string; description?: string; status: string; workspace?: string; budget?: number; actualCost?: number }) {
      const userId = requireUserId();
      const workspaceId = data.workspace || (await ensureDefaultWorkspaceForCurrentUser());
      const workspaceRole = await getWorkspaceRole(workspaceId);

      if (!(workspaceRole === 'admin' || workspaceRole === 'manager' || workspaceRole === 'member')) {
        throw new Error('You do not have permission to create projects in this workspace.');
      }

      const payload = {
        name: data.name,
        description: data.description,
        status: data.status,
        workspace: workspaceId,
        createdBy: userId
      };

      const project = await pb.collection('projects').create(payload);

      await pb.collection('project_members').create({
        project: project.id,
        user: userId,
        role: 'admin'
      });

      await pb.collection('project_financials').create({
        project: project.id,
        budget: data.budget ?? 0,
        actualCost: data.actualCost ?? 0
      });

      await logAudit({
        action: 'create',
        entity: 'project',
        entityId: project.id,
        project: project.id,
        workspace: workspaceId,
        after: payload
      });

      return this.getOne(project.id);
    },

    async update(id: string, data: any) {
      const access = await getProjectAccess(id);
      if (!access.canManageProject) {
        throw new Error('You do not have permission to update this project.');
      }

      const before = await pb.collection('projects').getOne(id);
      const updates: Record<string, unknown> = {};

      if (typeof data.name === 'string') updates.name = data.name;
      if (typeof data.description === 'string') updates.description = data.description;
      if (typeof data.status === 'string') updates.status = data.status;

      let project = before;
      if (Object.keys(updates).length > 0) {
        project = await pb.collection('projects').update(id, updates);
      }

      const hasFinancialUpdates = data.budget !== undefined || data.actualCost !== undefined;
      const financialUpdates = buildFinancialUpdatePayload(data);

      if (hasFinancialUpdates && !access.canManageFinancials) {
        throw new Error('Only admins can manage financial fields.');
      }

      if (hasFinancialUpdates) {
        const financials = await getOrCreateProjectFinancials(id);
        await pb.collection('project_financials').update(financials.id, financialUpdates);
      }

      await logAudit({
        action: 'update',
        entity: 'project',
        entityId: id,
        project: id,
        workspace: before.workspace,
        before,
        after: {
          ...updates,
          ...(hasFinancialUpdates ? financialUpdates : {})
        }
      });

      return this.getOne(project.id);
    },

    async delete(id: string) {
      const access = await getProjectAccess(id);
      if (!access.canDeleteProject) {
        throw new Error('Only admins can delete projects.');
      }

      const before = await pb.collection('projects').getOne(id);

      try {
        const financials = await pb.collection('project_financials').getFirstListItem(`project = "${id}"`);
        await pb.collection('project_financials').delete(financials.id);
      } catch {
        // no-op
      }

      await pb.collection('projects').delete(id);

      await logAudit({
        action: 'delete',
        entity: 'project',
        entityId: id,
        project: id,
        workspace: before.workspace,
        before
      });
    }
  },

  tasks: {
    async getForProject(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }

      return await pb.collection('tasks').getFullList({
        filter: `project = "${projectId}"`,
        sort: 'order'
      });
    },

    async create(data: { title: string; project: string; status: string; order?: number; description?: string }) {
      const access = await getProjectAccess(data.project);
      if (!access.canCreateTask) {
        throw new Error('You do not have permission to create tasks in this project.');
      }

      const created = await pb.collection('tasks').create(data);

      const project = await pb.collection('projects').getOne(data.project);
      await logAudit({
        action: 'create',
        entity: 'task',
        entityId: created.id,
        project: data.project,
        workspace: project.workspace,
        after: data
      });

      return created;
    },

    async update(id: string, data: any) {
      const { task, access } = await getTaskWithAccess(id);
      if (!access.canEditTask) {
        throw new Error('You do not have permission to update tasks in this project.');
      }

      const updated = await pb.collection('tasks').update(id, data);
      const project = await pb.collection('projects').getOne(task.project);

      await logAudit({
        action: 'update',
        entity: 'task',
        entityId: id,
        project: task.project,
        workspace: project.workspace,
        before: task,
        after: data
      });

      return updated;
    },

    async delete(id: string) {
      const { task, access } = await getTaskWithAccess(id);
      if (!access.canDeleteTask) {
        throw new Error('Only admins and managers can delete tasks.');
      }

      await pb.collection('tasks').delete(id);
      const project = await pb.collection('projects').getOne(task.project);

      await logAudit({
        action: 'delete',
        entity: 'task',
        entityId: id,
        project: task.project,
        workspace: project.workspace,
        before: task
      });
    }
  },

  comments: {
    async getForTask(taskId: string) {
      const { task, access } = await getTaskWithAccess(taskId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }

      return await pb.collection('comments').getFullList({
        filter: `task = "${task.id}"`,
        sort: 'created',
        expand: 'author'
      });
    },

    async create(data: { task: string; content: string; author: string }) {
      const userId = requireUserId();
      if (data.author !== userId) {
        throw new Error('Cannot post comments as another user.');
      }

      const { task, access } = await getTaskWithAccess(data.task);
      if (!access.canComment) {
        throw new Error('You do not have permission to comment in this project.');
      }

      const created = await pb.collection('comments').create(data);
      const project = await pb.collection('projects').getOne(task.project);

      await logAudit({
        action: 'create',
        entity: 'comment',
        entityId: created.id,
        project: task.project,
        workspace: project.workspace,
        after: { task: data.task, content: data.content }
      });

      return created;
    },

    async delete(id: string) {
      const userId = requireUserId();
      const comment = await pb.collection('comments').getOne(id);
      const { task, access } = await getTaskWithAccess(comment.task);

      if (comment.author !== userId && !access.canManageProject) {
        throw new Error('You do not have permission to delete this comment.');
      }

      await pb.collection('comments').delete(id);
      const project = await pb.collection('projects').getOne(task.project);

      await logAudit({
        action: 'delete',
        entity: 'comment',
        entityId: id,
        project: task.project,
        workspace: project.workspace,
        before: comment
      });
    }
  }
};
