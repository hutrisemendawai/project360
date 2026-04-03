import { pb } from './pocketbase';
import {
  canComment as hasCommentPermission,
  canCreateTask as hasTaskCreatePermission,
  canDeleteProject as hasProjectDeletePermission,
  canDeleteTask as hasTaskDeletePermission,
  canEditTask as hasTaskEditPermission,
  canManageAgile as hasAgileManagePermission,
  canManageBilling as hasBillingManagePermission,
  canManageCalendar as hasCalendarManagePermission,
  canManageFiles as hasFilesManagePermission,
  canManageMilestones as hasMilestoneManagePermission,
  canManageProject as hasProjectManagePermission,
  canManageFinancials as hasFinancialManagePermission,
  canManageTime as hasTimeManagePermission,
  canManageWiki as hasWikiManagePermission,
  canViewFinancials as hasFinancialViewPermission,
  canViewProject as hasProjectViewPermission,
  canViewReports as hasReportsViewPermission,
  rolePriority,
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
  canManageFiles: boolean;
  canManageWiki: boolean;
  canManageMilestones: boolean;
  canManageCalendar: boolean;
  canManageTime: boolean;
  canManageBilling: boolean;
  canManageAgile: boolean;
  canViewReports: boolean;
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
    canManageFinancials: hasFinancialManagePermission(role),
    canManageFiles: hasFilesManagePermission(role),
    canManageWiki: hasWikiManagePermission(role),
    canManageMilestones: hasMilestoneManagePermission(role),
    canManageCalendar: hasCalendarManagePermission(role),
    canManageTime: hasTimeManagePermission(role),
    canManageBilling: hasBillingManagePermission(role),
    canManageAgile: hasAgileManagePermission(role),
    canViewReports: hasReportsViewPermission(role)
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

async function getProjectContext(projectId: string) {
  const access = await getProjectAccess(projectId);
  const project = await pb.collection('projects').getOne(projectId);
  return { access, project };
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
    const organization = await pb.collection('organizations').create({
      name: `${pb.authStore.record?.name || pb.authStore.record?.email || 'User Organization'}`,
      owner: userId
    });

    const workspace = await pb.collection('workspaces').create({
      organization: organization.id,
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
  critical?: boolean;
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
    if (params.critical) {
      throw new Error('Failed to write required audit log entry.');
    }
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

    async getDefaultWorkspacePermissions(): Promise<{ canCreateProject: boolean; canManageFinancials: boolean }> {
      const workspaceId = await ensureDefaultWorkspaceForCurrentUser();
      const role = await getWorkspaceRole(workspaceId);
      return {
        canCreateProject: role === 'admin' || role === 'manager' || role === 'member',
        canManageFinancials: role === 'admin'
      };
    },

    async canCreateProjectInDefaultWorkspace(): Promise<boolean> {
      const permissions = await this.getDefaultWorkspacePermissions();
      return permissions.canCreateProject;
    },

    async canManageFinancialsInDefaultWorkspace(): Promise<boolean> {
      const permissions = await this.getDefaultWorkspacePermissions();
      return permissions.canManageFinancials;
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
        const nextRole = normalizeRole(membership.role);
        const existingRole = rolesByProject.get(membership.project);
        if (!existingRole || rolePriority[nextRole] > rolePriority[existingRole]) {
          rolesByProject.set(membership.project, nextRole);
        }
      });

      const adminProjectIds = [...rolesByProject.entries()]
        .filter(([, role]) => role === 'admin')
        .map(([projectId]) => projectId);

      const financialsByProject = new Map<string, { budget: number; actualCost: number }>();
      if (adminProjectIds.length > 0) {
        // Keep query length safe and avoid oversized OR filters for large org datasets.
        const batchSize = 50;
        for (let i = 0; i < adminProjectIds.length; i += batchSize) {
          const batchIds = adminProjectIds.slice(i, i + batchSize);
          const filters = batchIds.map((id) => `project = "${id}"`).join(' || ');
          const financials = await pb.collection('project_financials').getFullList({ filter: filters });
          financials.forEach((record) => {
            financialsByProject.set(record.project, {
              budget: record.budget || 0,
              actualCost: record.actualCost || 0
            });
          });
        }
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
        before,
        critical: true
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
        before: task,
        critical: true
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

    async create(data: { task: string; content: string }) {
      const userId = requireUserId();

      const { task, access } = await getTaskWithAccess(data.task);
      if (!access.canComment) {
        throw new Error('You do not have permission to comment in this project.');
      }

      const created = await pb.collection('comments').create({
        task: data.task,
        content: data.content,
        author: userId
      });
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
        before: comment,
        critical: true
      });
    }
  },

  files: {
    async getForProject(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }

      return pb.collection('attachments').getFullList({
        filter: `project = "${projectId}"`,
        sort: '-created'
      });
    },

    async upload(data: { project: string; file: File; name?: string; task?: string }) {
      const userId = requireUserId();
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageFiles) {
        throw new Error('You do not have permission to upload files in this project.');
      }

      const payload: Record<string, unknown> = {
        project: data.project,
        task: data.task || null,
        name: data.name || data.file.name,
        file: data.file,
        uploadedBy: userId,
        currentVersion: 1
      };
      const attachment = await pb.collection('attachments').create(payload);
      await pb.collection('attachment_versions').create({
        attachment: attachment.id,
        file: data.file,
        version: 1,
        uploadedBy: userId
      });
      await logAudit({
        action: 'create',
        entity: 'attachment',
        entityId: attachment.id,
        project: data.project,
        workspace: project.workspace,
        after: { name: payload.name, task: payload.task, currentVersion: 1 }
      });
      return attachment;
    },

    async addVersion(attachmentId: string, data: { file: File; notes?: string }) {
      const userId = requireUserId();
      const attachment = await pb.collection('attachments').getOne(attachmentId);
      const { access, project } = await getProjectContext(attachment.project);
      if (!access.canManageFiles) {
        throw new Error('You do not have permission to update files in this project.');
      }

      const nextVersion = Number(attachment.currentVersion || 1) + 1;
      await pb.collection('attachment_versions').create({
        attachment: attachment.id,
        file: data.file,
        version: nextVersion,
        notes: data.notes || '',
        uploadedBy: userId
      });
      const updated = await pb.collection('attachments').update(attachment.id, {
        file: data.file,
        currentVersion: nextVersion
      });
      await logAudit({
        action: 'update',
        entity: 'attachment',
        entityId: attachment.id,
        project: attachment.project,
        workspace: project.workspace,
        after: { currentVersion: nextVersion, notes: data.notes || '' }
      });
      return updated;
    },

    async getVersions(attachmentId: string) {
      const attachment = await pb.collection('attachments').getOne(attachmentId);
      const access = await getProjectAccess(attachment.project);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }

      return pb.collection('attachment_versions').getFullList({
        filter: `attachment = "${attachmentId}"`,
        sort: '-version'
      });
    },

    async delete(attachmentId: string) {
      const attachment = await pb.collection('attachments').getOne(attachmentId);
      const { access, project } = await getProjectContext(attachment.project);
      if (!access.canManageFiles) {
        throw new Error('You do not have permission to delete files in this project.');
      }
      await pb.collection('attachments').delete(attachmentId);
      await logAudit({
        action: 'delete',
        entity: 'attachment',
        entityId: attachmentId,
        project: attachment.project,
        workspace: project.workspace,
        before: attachment
      });
    }
  },

  wiki: {
    async getForProject(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      return pb.collection('wiki_pages').getFullList({
        filter: `project = "${projectId}"`,
        sort: 'title'
      });
    },

    async getBacklinks(pageId: string) {
      const page = await pb.collection('wiki_pages').getOne(pageId);
      const access = await getProjectAccess(page.project);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      return pb.collection('wiki_links').getFullList({
        filter: `project = "${page.project}" && targetPage = "${pageId}"`,
        expand: 'sourcePage',
        sort: '-created'
      });
    },

    async createPage(data: { project: string; title: string; content?: string; parent?: string; template?: string }) {
      const userId = requireUserId();
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageWiki) {
        throw new Error('You do not have permission to edit wiki pages in this project.');
      }
      const slug = data.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const created = await pb.collection('wiki_pages').create({
        project: data.project,
        title: data.title,
        slug,
        parent: data.parent || null,
        content: data.content || '',
        template: data.template || null,
        lastEditedBy: userId
      });
      await logAudit({
        action: 'create',
        entity: 'wiki_page',
        entityId: created.id,
        project: data.project,
        workspace: project.workspace,
        after: { title: data.title, slug, parent: data.parent || null }
      });
      return created;
    },

    async updatePage(id: string, data: { title?: string; content?: string; parent?: string; template?: string }) {
      const userId = requireUserId();
      const page = await pb.collection('wiki_pages').getOne(id);
      const { access, project } = await getProjectContext(page.project);
      if (!access.canManageWiki) {
        throw new Error('You do not have permission to edit wiki pages in this project.');
      }
      const updates: Record<string, unknown> = { lastEditedBy: userId };
      if (typeof data.title === 'string') {
        updates.title = data.title;
        updates.slug = data.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      if (typeof data.content === 'string') updates.content = data.content;
      if (data.parent !== undefined) updates.parent = data.parent || null;
      if (data.template !== undefined) updates.template = data.template || null;
      const updated = await pb.collection('wiki_pages').update(id, updates);
      await logAudit({
        action: 'update',
        entity: 'wiki_page',
        entityId: id,
        project: page.project,
        workspace: project.workspace,
        before: page,
        after: updates
      });
      return updated;
    },

    async deletePage(id: string) {
      const page = await pb.collection('wiki_pages').getOne(id);
      const { access, project } = await getProjectContext(page.project);
      if (!access.canManageWiki) {
        throw new Error('You do not have permission to delete wiki pages in this project.');
      }
      await pb.collection('wiki_pages').delete(id);
      await logAudit({
        action: 'delete',
        entity: 'wiki_page',
        entityId: id,
        project: page.project,
        workspace: project.workspace,
        before: page
      });
    },

    async linkPages(data: { project: string; sourcePage: string; targetPage: string }) {
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageWiki) {
        throw new Error('You do not have permission to manage wiki links in this project.');
      }
      const link = await pb.collection('wiki_links').create(data);
      await logAudit({
        action: 'create',
        entity: 'wiki_link',
        entityId: link.id,
        project: data.project,
        workspace: project.workspace,
        after: data
      });
      return link;
    },

    async getTemplates(projectId?: string) {
      requireUserId();
      const filters = ['project = ""', 'workspace = ""'];
      if (projectId) {
        filters.push(`project = "${projectId}"`);
      }
      return pb.collection('templates').getFullList({
        filter: filters.join(' || '),
        sort: 'kind'
      });
    },

    async createTemplate(data: { name: string; kind: 'prd' | 'spec' | 'retro' | 'risk_register'; content: string; workspace?: string; project?: string }) {
      const userId = requireUserId();
      if (data.project) {
        const access = await getProjectAccess(data.project);
        if (!access.canManageWiki) {
          throw new Error('You do not have permission to create templates in this project.');
        }
      }
      return pb.collection('templates').create({
        ...data,
        createdBy: userId
      });
    },

    async unfurlLink(data: { project: string; url: string; title?: string; description?: string; imageUrl?: string }) {
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageWiki) {
        throw new Error('You do not have permission to add link previews in this project.');
      }
      const normalized = data.url.toLowerCase();
      const provider = normalized.includes('figma.com')
        ? 'figma'
        : normalized.includes('notion.so')
          ? 'notion'
          : normalized.includes('docs.google.com')
            ? 'google_docs'
            : 'other';
      let preview: any;
      try {
        preview = await pb.collection('link_previews').getFirstListItem(`url = "${data.url}"`);
        preview = await pb.collection('link_previews').update(preview.id, {
          project: data.project,
          provider,
          title: data.title || preview.title || data.url,
          description: data.description || preview.description || '',
          imageUrl: data.imageUrl || preview.imageUrl || ''
        });
      } catch {
        preview = await pb.collection('link_previews').create({
          project: data.project,
          url: data.url,
          provider,
          title: data.title || data.url,
          description: data.description || '',
          imageUrl: data.imageUrl || '',
          metaJson: {}
        });
      }
      await logAudit({
        action: 'create',
        entity: 'link_preview',
        entityId: preview.id,
        project: data.project,
        workspace: project.workspace,
        after: { url: data.url, provider }
      });
      return preview;
    },

    async getLinkPreviews(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      return pb.collection('link_previews').getFullList({
        filter: `project = "${projectId}"`,
        sort: '-created'
      });
    }
  },

  search: {
    async global(projectId: string, query: string, filters: { includeTasks?: boolean; includeComments?: boolean; includeFiles?: boolean; includeWiki?: boolean } = {}) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      const q = query.trim().replace(/"/g, '\\"');
      const [tasks, comments, files, wiki] = await Promise.all([
        filters.includeTasks === false ? [] : pb.collection('tasks').getFullList({ filter: `project = "${projectId}" && (title ~ "${q}" || description ~ "${q}")`, sort: '-updated' }),
        filters.includeComments === false
          ? []
          : pb.collection('comments').getFullList({
              filter: `content ~ "${q}"`,
              expand: 'task'
            }).then((rows) => rows.filter((row) => row.expand?.task?.project === projectId)),
        filters.includeFiles === false ? [] : pb.collection('attachments').getFullList({ filter: `project = "${projectId}" && name ~ "${q}"`, sort: '-updated' }),
        filters.includeWiki === false ? [] : pb.collection('wiki_pages').getFullList({ filter: `project = "${projectId}" && (title ~ "${q}" || content ~ "${q}")`, sort: '-updated' })
      ]);
      return { tasks, comments, files, wiki };
    }
  },

  milestones: {
    async getForProject(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      const [milestones, dependencies] = await Promise.all([
        pb.collection('milestones').getFullList({ filter: `project = "${projectId}"`, sort: 'plannedDue' }),
        pb.collection('dependencies').getFullList({ filter: `project = "${projectId}"`, sort: '-created' })
      ]);
      return { milestones, dependencies };
    },

    async create(data: {
      project: string;
      title: string;
      status?: 'planned' | 'in_progress' | 'completed' | 'blocked';
      plannedStart?: string;
      plannedDue?: string;
      actualStart?: string;
      actualDue?: string;
      completion?: number;
      owner?: string;
    }) {
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageMilestones) {
        throw new Error('You do not have permission to create milestones in this project.');
      }
      const created = await pb.collection('milestones').create({
        ...data,
        status: data.status || 'planned',
        completion: data.completion ?? 0
      });
      await logAudit({
        action: 'create',
        entity: 'milestone',
        entityId: created.id,
        project: data.project,
        workspace: project.workspace,
        after: data
      });
      return created;
    },

    async update(id: string, data: Record<string, unknown>) {
      const existing = await pb.collection('milestones').getOne(id);
      const { access, project } = await getProjectContext(existing.project);
      if (!access.canManageMilestones) {
        throw new Error('You do not have permission to update milestones in this project.');
      }
      const updated = await pb.collection('milestones').update(id, data);
      await logAudit({
        action: 'update',
        entity: 'milestone',
        entityId: id,
        project: existing.project,
        workspace: project.workspace,
        before: existing,
        after: data
      });
      return updated;
    },

    async delete(id: string) {
      const existing = await pb.collection('milestones').getOne(id);
      const { access, project } = await getProjectContext(existing.project);
      if (!access.canManageMilestones) {
        throw new Error('You do not have permission to delete milestones in this project.');
      }
      await pb.collection('milestones').delete(id);
      await logAudit({
        action: 'delete',
        entity: 'milestone',
        entityId: id,
        project: existing.project,
        workspace: project.workspace,
        before: existing
      });
    },

    async addDependency(data: { project: string; sourceMilestone: string; targetMilestone: string; type?: 'finish_to_start' | 'start_to_start' | 'finish_to_finish'; requiresApproval?: boolean }) {
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageMilestones) {
        throw new Error('You do not have permission to manage dependencies in this project.');
      }
      const created = await pb.collection('dependencies').create({
        ...data,
        type: data.type || 'finish_to_start',
        requiresApproval: data.requiresApproval ?? true
      });
      await logAudit({
        action: 'create',
        entity: 'dependency',
        entityId: created.id,
        project: data.project,
        workspace: project.workspace,
        after: data
      });
      return created;
    },

    async requestAutoReschedule(data: { project: string; dependencyId: string; reason?: string }) {
      const userId = requireUserId();
      const dependency = await pb.collection('dependencies').getOne(data.dependencyId);
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageMilestones) {
        throw new Error('You do not have permission to request rescheduling in this project.');
      }
      const approval = await pb.collection('approvals').create({
        project: data.project,
        type: 'reschedule',
        entityId: dependency.id,
        status: 'pending',
        requestedBy: userId,
        notes: data.reason || ''
      });
      await logAudit({
        action: 'create',
        entity: 'approval',
        entityId: approval.id,
        project: data.project,
        workspace: project.workspace,
        after: { type: 'reschedule', dependencyId: dependency.id }
      });
      return approval;
    }
  },

  calendar: {
    async getForProject(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      const [integrations, holidays] = await Promise.all([
        pb.collection('calendars').getFullList({ filter: `project = "${projectId}"`, sort: '-created' }),
        pb.collection('holidays').getFullList({ filter: `project = "${projectId}"`, sort: 'date' })
      ]);
      return { integrations, holidays };
    },

    async upsertIntegration(data: { project: string; provider: 'google' | 'microsoft' | 'ical'; externalId?: string; icalToken?: string; metaJson?: Record<string, unknown> }) {
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageCalendar) {
        throw new Error('You do not have permission to manage calendar integrations in this project.');
      }
      try {
        const existing = await pb.collection('calendars').getFirstListItem(
          `project = "${data.project}" && provider = "${data.provider}"`
        );
        const updated = await pb.collection('calendars').update(existing.id, data);
        await logAudit({
          action: 'update',
          entity: 'calendar',
          entityId: existing.id,
          project: data.project,
          workspace: project.workspace,
          before: existing,
          after: data
        });
        return updated;
      } catch {
        const created = await pb.collection('calendars').create(data);
        await logAudit({
          action: 'create',
          entity: 'calendar',
          entityId: created.id,
          project: data.project,
          workspace: project.workspace,
          after: data
        });
        return created;
      }
    },

    async addHoliday(data: { project?: string; workspace?: string; locale: string; team?: string; date: string; name: string }) {
      requireUserId();
      if (data.project) {
        const access = await getProjectAccess(data.project);
        if (!access.canManageCalendar) {
          throw new Error('You do not have permission to manage holidays in this project.');
        }
      }
      return pb.collection('holidays').create(data);
    },

    async getProjectIcsFeed(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      const project = await pb.collection('projects').getOne(projectId);
      let icalToken = '';
      try {
        const rec = await pb.collection('calendars').getFirstListItem(`project = "${projectId}" && provider = "ical"`);
        icalToken = rec.icalToken || '';
      } catch {
        // no-op
      }
      return {
        projectId,
        projectName: project.name,
        token: icalToken,
        feedPath: `/api/projects/${projectId}/calendar.ics${icalToken ? `?token=${encodeURIComponent(icalToken)}` : ''}`
      };
    }
  },

  time: {
    async getEntries(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      return pb.collection('time_entries').getFullList({
        filter: `project = "${projectId}"`,
        sort: '-created',
        expand: 'user,task'
      });
    },

    async startTimer(data: { project: string; task?: string; billable?: boolean; notes?: string }) {
      const userId = requireUserId();
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageTime) {
        throw new Error('You do not have permission to track time in this project.');
      }
      const record = await pb.collection('time_entries').create({
        project: data.project,
        task: data.task || null,
        user: userId,
        startedAt: new Date().toISOString(),
        minutes: 1,
        billable: data.billable ?? true,
        notes: data.notes || ''
      });
      await logAudit({
        action: 'create',
        entity: 'time_entry',
        entityId: record.id,
        project: data.project,
        workspace: project.workspace,
        after: { timerStarted: true, task: data.task || null }
      });
      return record;
    },

    async stopTimer(entryId: string) {
      const userId = requireUserId();
      const entry = await pb.collection('time_entries').getOne(entryId);
      const { access, project } = await getProjectContext(entry.project);
      if (!access.canManageTime || entry.user !== userId) {
        throw new Error('You do not have permission to stop this timer.');
      }
      const now = new Date();
      const started = entry.startedAt ? new Date(entry.startedAt) : now;
      const minutes = Math.max(1, Math.round((now.getTime() - started.getTime()) / 60000));
      const updated = await pb.collection('time_entries').update(entryId, {
        endedAt: now.toISOString(),
        minutes
      });
      await logAudit({
        action: 'update',
        entity: 'time_entry',
        entityId: entryId,
        project: entry.project,
        workspace: project.workspace,
        before: entry,
        after: { endedAt: now.toISOString(), minutes }
      });
      return updated;
    },

    async addManualEntry(data: { project: string; task?: string; minutes: number; billable?: boolean; notes?: string; startedAt?: string; endedAt?: string }) {
      const userId = requireUserId();
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageTime) {
        throw new Error('You do not have permission to add manual time in this project.');
      }
      const created = await pb.collection('time_entries').create({
        project: data.project,
        task: data.task || null,
        user: userId,
        minutes: Math.max(1, Math.round(data.minutes || 1)),
        billable: data.billable ?? true,
        notes: data.notes || '',
        startedAt: data.startedAt || null,
        endedAt: data.endedAt || null
      });
      await logAudit({
        action: 'create',
        entity: 'time_entry',
        entityId: created.id,
        project: data.project,
        workspace: project.workspace,
        after: { minutes: created.minutes, billable: created.billable, task: created.task }
      });
      return created;
    },

    async deleteEntry(entryId: string) {
      const userId = requireUserId();
      const entry = await pb.collection('time_entries').getOne(entryId);
      const { access, project } = await getProjectContext(entry.project);
      if (!access.canManageTime || (entry.user !== userId && !access.canManageProject)) {
        throw new Error('You do not have permission to delete this entry.');
      }
      await pb.collection('time_entries').delete(entryId);
      await logAudit({
        action: 'delete',
        entity: 'time_entry',
        entityId: entryId,
        project: entry.project,
        workspace: project.workspace,
        before: entry
      });
    },

    async getTimesheets(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      return pb.collection('timesheets').getFullList({
        filter: `project = "${projectId}"`,
        sort: '-weekStart',
        expand: 'user,approvedBy'
      });
    },

    async upsertTimesheet(data: { project: string; weekStart: string; totalMinutes: number }) {
      const userId = requireUserId();
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageTime) {
        throw new Error('You do not have permission to manage timesheets in this project.');
      }
      try {
        const existing = await pb.collection('timesheets').getFirstListItem(
          `project = "${data.project}" && user = "${userId}" && weekStart = "${data.weekStart}"`
        );
        const updated = await pb.collection('timesheets').update(existing.id, {
          totalMinutes: Math.max(0, Math.round(data.totalMinutes || 0)),
          status: 'draft'
        });
        await logAudit({
          action: 'update',
          entity: 'timesheet',
          entityId: existing.id,
          project: data.project,
          workspace: project.workspace,
          before: existing,
          after: updated
        });
        return updated;
      } catch {
        const created = await pb.collection('timesheets').create({
          project: data.project,
          user: userId,
          weekStart: data.weekStart,
          totalMinutes: Math.max(0, Math.round(data.totalMinutes || 0)),
          status: 'draft'
        });
        await logAudit({
          action: 'create',
          entity: 'timesheet',
          entityId: created.id,
          project: data.project,
          workspace: project.workspace,
          after: created
        });
        return created;
      }
    },

    async submitTimesheet(timesheetId: string) {
      const userId = requireUserId();
      const sheet = await pb.collection('timesheets').getOne(timesheetId);
      if (sheet.user !== userId) {
        throw new Error('You can only submit your own timesheet.');
      }
      const { access, project } = await getProjectContext(sheet.project);
      if (!access.canManageTime) {
        throw new Error('You do not have permission to submit timesheets in this project.');
      }
      const updated = await pb.collection('timesheets').update(timesheetId, {
        status: 'submitted',
        submittedAt: new Date().toISOString()
      });
      await pb.collection('approvals').create({
        project: sheet.project,
        type: 'timesheet',
        entityId: timesheetId,
        status: 'pending',
        requestedBy: userId
      });
      await logAudit({
        action: 'update',
        entity: 'timesheet',
        entityId: timesheetId,
        project: sheet.project,
        workspace: project.workspace,
        before: sheet,
        after: updated
      });
      return updated;
    },

    async approveTimesheet(timesheetId: string, approved: boolean, notes?: string) {
      const reviewerId = requireUserId();
      const sheet = await pb.collection('timesheets').getOne(timesheetId);
      const { access, project } = await getProjectContext(sheet.project);
      if (!access.canManageBilling) {
        throw new Error('You do not have permission to approve timesheets in this project.');
      }
      const nextStatus = approved ? 'approved' : 'rejected';
      const updated = await pb.collection('timesheets').update(timesheetId, {
        status: nextStatus,
        approvedBy: reviewerId,
        approvedAt: new Date().toISOString()
      });
      try {
        const approval = await pb.collection('approvals').getFirstListItem(
          `project = "${sheet.project}" && type = "timesheet" && entityId = "${timesheetId}" && status = "pending"`
        );
        await pb.collection('approvals').update(approval.id, {
          status: approved ? 'approved' : 'rejected',
          reviewedBy: reviewerId,
          notes: notes || ''
        });
      } catch {
        // no-op
      }
      await logAudit({
        action: 'update',
        entity: 'timesheet',
        entityId: timesheetId,
        project: sheet.project,
        workspace: project.workspace,
        before: sheet,
        after: updated
      });
      return updated;
    }
  },

  billing: {
    async getRates(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewFinancials) {
        throw new Error('Only admins can view rates.');
      }
      return pb.collection('rates').getFullList({
        filter: `project = "${projectId}" || project = ""`,
        sort: '-created',
        expand: 'user'
      });
    },

    async upsertRate(data: { project?: string; workspace?: string; user?: string; role?: ProjectRole; hourlyRate: number }) {
      requireUserId();
      if (data.project) {
        const access = await getProjectAccess(data.project);
        if (!access.canManageBilling) {
          throw new Error('You do not have permission to manage rates in this project.');
        }
      }
      const scopeFilters = [
        data.project ? `project = "${data.project}"` : 'project = ""',
        data.workspace ? `workspace = "${data.workspace}"` : 'workspace = ""',
        data.user ? `user = "${data.user}"` : 'user = ""',
        data.role ? `role = "${data.role}"` : 'role = ""'
      ];
      try {
        const existing = await pb.collection('rates').getFirstListItem(scopeFilters.join(' && '));
        return pb.collection('rates').update(existing.id, {
          hourlyRate: Math.max(0, Number(data.hourlyRate || 0))
        });
      } catch {
        return pb.collection('rates').create({
          ...data,
          hourlyRate: Math.max(0, Number(data.hourlyRate || 0))
        });
      }
    },

    async getBudgetVsActual(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      const [project, entries, expenses] = await Promise.all([
        api.projects.getOne(projectId),
        pb.collection('time_entries').getFullList({ filter: `project = "${projectId}"`, expand: 'user' }),
        pb.collection('expenses').getFullList({ filter: `project = "${projectId}" && status = "approved"` })
      ]);

      const rates = await pb.collection('rates').getFullList({
        filter: `project = "${projectId}" || project = ""`,
        sort: '-created'
      });

      const roleRate = new Map<string, number>();
      const userRate = new Map<string, number>();
      rates.forEach((rate) => {
        if (rate.user) userRate.set(rate.user, Number(rate.hourlyRate || 0));
        else if (rate.role) roleRate.set(rate.role, Number(rate.hourlyRate || 0));
      });

      const timeCost = entries.reduce((sum, entry) => {
        const minutes = Number(entry.minutes || 0);
        const userId = entry.user;
        const matchedUserRate = userRate.get(userId);
        const matchedRoleRate = roleRate.get('member') || 0;
        const hourly = matchedUserRate ?? matchedRoleRate;
        return sum + (minutes / 60) * hourly;
      }, 0);

      const expenseCost = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      const actual = timeCost + expenseCost;
      const budget = Number(project.financials?.budget || 0);

      return {
        budget,
        actual,
        variance: budget - actual,
        timeCost,
        expenseCost
      };
    },

    async getExpenses(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      return pb.collection('expenses').getFullList({
        filter: `project = "${projectId}"`,
        sort: '-expenseDate',
        expand: 'user'
      });
    },

    async createExpense(data: { project: string; amount: number; billable?: boolean; category?: string; description?: string; status?: 'draft' | 'submitted' | 'approved' | 'rejected'; expenseDate: string }) {
      const userId = requireUserId();
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageTime) {
        throw new Error('You do not have permission to create expenses in this project.');
      }
      const created = await pb.collection('expenses').create({
        ...data,
        user: userId,
        amount: Math.max(0, Number(data.amount || 0)),
        billable: data.billable ?? true,
        status: data.status || 'draft'
      });
      await logAudit({
        action: 'create',
        entity: 'expense',
        entityId: created.id,
        project: data.project,
        workspace: project.workspace,
        after: created
      });
      return created;
    },

    async submitExpense(id: string) {
      const userId = requireUserId();
      const expense = await pb.collection('expenses').getOne(id);
      if (expense.user !== userId) {
        throw new Error('You can only submit your own expense.');
      }
      const { access, project } = await getProjectContext(expense.project);
      if (!access.canManageTime) {
        throw new Error('You do not have permission to submit expenses in this project.');
      }
      const updated = await pb.collection('expenses').update(id, { status: 'submitted' });
      await pb.collection('approvals').create({
        project: expense.project,
        type: 'expense',
        entityId: id,
        status: 'pending',
        requestedBy: userId
      });
      await logAudit({
        action: 'update',
        entity: 'expense',
        entityId: id,
        project: expense.project,
        workspace: project.workspace,
        before: expense,
        after: updated
      });
      return updated;
    },

    async approveExpense(id: string, approved: boolean, notes?: string) {
      const reviewerId = requireUserId();
      const expense = await pb.collection('expenses').getOne(id);
      const { access, project } = await getProjectContext(expense.project);
      if (!access.canManageBilling) {
        throw new Error('You do not have permission to approve expenses in this project.');
      }
      const updated = await pb.collection('expenses').update(id, {
        status: approved ? 'approved' : 'rejected'
      });
      try {
        const approval = await pb.collection('approvals').getFirstListItem(
          `project = "${expense.project}" && type = "expense" && entityId = "${id}" && status = "pending"`
        );
        await pb.collection('approvals').update(approval.id, {
          status: approved ? 'approved' : 'rejected',
          reviewedBy: reviewerId,
          notes: notes || ''
        });
      } catch {
        // no-op
      }
      await logAudit({
        action: 'update',
        entity: 'expense',
        entityId: id,
        project: expense.project,
        workspace: project.workspace,
        before: expense,
        after: updated
      });
      return updated;
    },

    async exportInvoicePayload(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canManageBilling) {
        throw new Error('You do not have permission to export billing payloads.');
      }
      const [entries, expenses] = await Promise.all([
        pb.collection('time_entries').getFullList({ filter: `project = "${projectId}" && billable = true`, sort: '-created', expand: 'user,task' }),
        pb.collection('expenses').getFullList({ filter: `project = "${projectId}" && billable = true && status = "approved"`, sort: '-expenseDate', expand: 'user' })
      ]);
      return {
        projectId,
        exportedAt: new Date().toISOString(),
        billableTimeEntries: entries,
        billableExpenses: expenses
      };
    }
  },

  agile: {
    async getBoard(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      const [tasks, sprints, epics, initiatives, retros] = await Promise.all([
        pb.collection('tasks').getFullList({ filter: `project = "${projectId}"`, sort: 'order' }),
        pb.collection('sprints').getFullList({ filter: `project = "${projectId}"`, sort: '-startDate' }),
        pb.collection('epics').getFullList({ filter: `project = "${projectId}"`, sort: '-wsjfScore' }),
        pb.collection('initiatives').getFullList({ filter: `project = "${projectId}"`, sort: '-created' }),
        pb.collection('retros').getFullList({ filter: `project = "${projectId}"`, sort: '-created' })
      ]);
      return { tasks, sprints, epics, initiatives, retros };
    },

    async createSprint(data: { project: string; name: string; goal?: string; startDate: string; endDate: string; capacityHours?: number }) {
      const { access, project } = await getProjectContext(data.project);
      if (!access.canManageAgile) {
        throw new Error('You do not have permission to manage sprints in this project.');
      }
      const sprint = await pb.collection('sprints').create({
        ...data,
        status: 'planned',
        capacityHours: data.capacityHours ?? 0
      });
      await logAudit({
        action: 'create',
        entity: 'sprint',
        entityId: sprint.id,
        project: data.project,
        workspace: project.workspace,
        after: sprint
      });
      return sprint;
    },

    async updateSprint(id: string, data: Record<string, unknown>) {
      const sprint = await pb.collection('sprints').getOne(id);
      const { access, project } = await getProjectContext(sprint.project);
      if (!access.canManageAgile) {
        throw new Error('You do not have permission to update sprints in this project.');
      }
      const updated = await pb.collection('sprints').update(id, data);
      await logAudit({
        action: 'update',
        entity: 'sprint',
        entityId: id,
        project: sprint.project,
        workspace: project.workspace,
        before: sprint,
        after: data
      });
      return updated;
    },

    async rolloverIncompleteTasks(sprintId: string, nextSprintId: string) {
      const sprint = await pb.collection('sprints').getOne(sprintId);
      const { access } = await getProjectContext(sprint.project);
      if (!access.canManageAgile) {
        throw new Error('You do not have permission to rollover tasks in this project.');
      }
      const backlog = await pb.collection('tasks').getFullList({
        filter: `project = "${sprint.project}" && status != "done"`
      });
      await Promise.all(
        backlog.map((task, index) =>
          pb.collection('tasks').update(task.id, {
            order: index,
            sprint: nextSprintId
          })
        )
      );
      return { movedTaskCount: backlog.length };
    },

    async upsertEpic(data: { project: string; sprint?: string; name: string; description?: string; storyPoints?: number; wsjfScore?: number }) {
      const { access } = await getProjectContext(data.project);
      if (!access.canManageAgile) {
        throw new Error('You do not have permission to manage epics in this project.');
      }
      try {
        const existing = await pb.collection('epics').getFirstListItem(
          `project = "${data.project}" && name = "${data.name.replace(/"/g, '\\"')}"`
        );
        return pb.collection('epics').update(existing.id, {
          ...data,
          storyPoints: data.storyPoints ?? existing.storyPoints ?? 0,
          wsjfScore: data.wsjfScore ?? existing.wsjfScore ?? 0
        });
      } catch {
        return pb.collection('epics').create({
          ...data,
          storyPoints: data.storyPoints ?? 0,
          wsjfScore: data.wsjfScore ?? 0
        });
      }
    },

    async createInitiative(data: { project: string; name: string; description?: string; status?: 'planned' | 'active' | 'completed' }) {
      const { access } = await getProjectContext(data.project);
      if (!access.canManageAgile) {
        throw new Error('You do not have permission to manage initiatives in this project.');
      }
      return pb.collection('initiatives').create({
        ...data,
        status: data.status || 'planned'
      });
    },

    async createRetro(data: { project: string; sprint?: string; title: string; boardJson?: unknown; actionItems?: unknown[] }) {
      const { access } = await getProjectContext(data.project);
      if (!access.canManageAgile) {
        throw new Error('You do not have permission to manage retrospectives in this project.');
      }
      const retro = await pb.collection('retros').create({
        project: data.project,
        sprint: data.sprint || null,
        title: data.title,
        boardJson: data.boardJson || {},
        actionItems: data.actionItems || []
      });
      if (Array.isArray(data.actionItems)) {
        const taskItems = data.actionItems.filter((item) => item && typeof item === 'object' && (item as any).title);
        await Promise.all(
          taskItems.map((item: any, index) =>
            api.tasks.create({
              title: item.title,
              description: item.description || `Retro action from ${data.title}`,
              project: data.project,
              status: 'todo',
              order: index
            })
          )
        );
      }
      return retro;
    },

    async velocity(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      const [sprints, tasks] = await Promise.all([
        pb.collection('sprints').getFullList({ filter: `project = "${projectId}"`, sort: 'startDate' }),
        pb.collection('tasks').getFullList({ filter: `project = "${projectId}"` })
      ]);
      const completed = tasks.filter((task) => task.status === 'done').length;
      const perSprint = sprints.map((sprint, index) => ({
        sprint: sprint.name,
        velocity: sprints.length === 0 ? 0 : Math.round(completed / Math.max(1, sprints.length) + index * 0)
      }));
      return {
        velocityTrend: perSprint,
        totalCompleted: completed
      };
    },

    async burndown(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      const tasks = await pb.collection('tasks').getFullList({ filter: `project = "${projectId}"` });
      const total = tasks.length;
      const done = tasks.filter((task) => task.status === 'done').length;
      const remaining = total - done;
      return {
        total,
        done,
        remaining,
        burnup: done,
        burndown: remaining
      };
    }
  },

  reports: {
    async getDashboardConfigs(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      return pb.collection('dashboard_configs').getFullList({
        filter: `project = "${projectId}" || project = ""`,
        sort: '-updated',
        expand: 'owner'
      });
    },

    async saveDashboardConfig(data: { project?: string; workspace?: string; name: string; widgetsJson: unknown }) {
      const userId = requireUserId();
      if (data.project) {
        const access = await getProjectAccess(data.project);
        if (!access.canViewReports) {
          throw new Error('You do not have permission to save dashboard configs in this project.');
        }
      }
      return pb.collection('dashboard_configs').create({
        ...data,
        owner: userId
      });
    },

    async health(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      const [milestonesData, tasks, budgetData] = await Promise.all([
        api.milestones.getForProject(projectId),
        pb.collection('tasks').getFullList({ filter: `project = "${projectId}"` }),
        api.billing.getBudgetVsActual(projectId)
      ]);
      const now = Date.now();
      const overdueMilestones = milestonesData.milestones.filter((m) => m.plannedDue && new Date(m.plannedDue).getTime() < now && m.status !== 'completed').length;
      const overdueTasks = tasks.filter((task) => task.status !== 'done' && new Date(task.created).getTime() < now - 1000 * 60 * 60 * 24 * 14).length;
      const scheduleScore = Math.max(0, 100 - overdueMilestones * 10 - overdueTasks * 3);
      const budgetScore = budgetData.variance >= 0 ? 100 : Math.max(0, 100 + (budgetData.variance / Math.max(1, budgetData.budget)) * 100);
      const workloadScore = Math.max(0, 100 - Math.round(tasks.length / 2));
      const riskScore = Math.max(0, 100 - milestonesData.dependencies.filter((d) => d.requiresApproval).length * 5);
      const overall = Math.round((scheduleScore + budgetScore + workloadScore + riskScore) / 4);
      return {
        overall,
        scheduleScore,
        budgetScore,
        workloadScore,
        riskScore,
        overdueMilestones,
        overdueTasks
      };
    },

    async leadCycleTime(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      const tasks = await pb.collection('tasks').getFullList({ filter: `project = "${projectId}"` });
      const completed = tasks.filter((task) => task.status === 'done');
      const leadTimes = completed.map((task) => {
        const createdAt = new Date(task.created).getTime();
        const updatedAt = new Date(task.updated).getTime();
        return Math.max(0, updatedAt - createdAt) / (1000 * 60 * 60 * 24);
      });
      const avgLead = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;
      return {
        averageLeadTimeDays: Number(avgLead.toFixed(2)),
        averageCycleTimeDays: Number(avgLead.toFixed(2)),
        sampleSize: completed.length
      };
    },

    async workloadCapacity(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewProject) {
        throw new Error('You do not have access to this project.');
      }
      const [entries, memberships] = await Promise.all([
        pb.collection('time_entries').getFullList({ filter: `project = "${projectId}"`, expand: 'user' }),
        pb.collection('project_members').getFullList({ filter: `project = "${projectId}"`, expand: 'user' })
      ]);
      const minutesByUser = new Map<string, number>();
      entries.forEach((entry) => {
        minutesByUser.set(entry.user, (minutesByUser.get(entry.user) || 0) + Number(entry.minutes || 0));
      });
      return memberships.map((member) => ({
        userId: member.user,
        name: member.expand?.user?.name || member.expand?.user?.email || 'User',
        role: member.role,
        hoursLogged: Number(((minutesByUser.get(member.user) || 0) / 60).toFixed(2)),
        capacityHours: member.role === 'admin' ? 35 : member.role === 'manager' ? 40 : 30
      }));
    },

    async createSavedReport(data: {
      project?: string;
      workspace?: string;
      type: 'executive' | 'health' | 'capacity' | 'velocity' | 'timesheet' | 'budget';
      name: string;
      filtersJson?: unknown;
      dataJson: unknown;
      scheduleCron?: string;
    }) {
      const userId = requireUserId();
      if (data.project) {
        const access = await getProjectAccess(data.project);
        if (!access.canViewReports) {
          throw new Error('You do not have permission to save reports in this project.');
        }
      }
      return pb.collection('saved_reports').create({
        ...data,
        owner: userId
      });
    },

    async getSavedReports(projectId: string) {
      const access = await getProjectAccess(projectId);
      if (!access.canViewReports) {
        throw new Error('You do not have permission to view reports in this project.');
      }
      return pb.collection('saved_reports').getFullList({
        filter: `project = "${projectId}" || project = ""`,
        sort: '-updated',
        expand: 'owner'
      });
    },

    async export(projectId: string, format: 'csv' | 'xlsx' | 'pdf') {
      const access = await getProjectAccess(projectId);
      if (!access.canViewReports) {
        throw new Error('You do not have permission to export reports in this project.');
      }
      const [health, velocity, budget] = await Promise.all([
        this.health(projectId),
        api.agile.velocity(projectId),
        api.billing.getBudgetVsActual(projectId)
      ]);
      return {
        format,
        generatedAt: new Date().toISOString(),
        projectId,
        payload: {
          health,
          velocity,
          budget
        }
      };
    }
  }
};
