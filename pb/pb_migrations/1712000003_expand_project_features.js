migrate((db) => {
  const dao = new Dao(db);
  const usersCollection = dao.findCollectionByNameOrId('users');
  const projectsCollection = dao.findCollectionByNameOrId('projects');
  const workspacesCollection = dao.findCollectionByNameOrId('workspaces');
  const tasksCollection = dao.findCollectionByNameOrId('tasks');

  const attachments = new Collection({
    id: 'attachments_col01',
    name: 'attachments',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'att_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'att_task001', name: 'task', type: 'relation', required: false, options: { maxSelect: 1, collectionId: tasksCollection.id, cascadeDelete: true } },
      { system: false, id: 'att_name001', name: 'name', type: 'text', required: true, options: {} },
      { system: false, id: 'att_file001', name: 'file', type: 'file', required: true, options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] } },
      { system: false, id: 'att_uploaded1', name: 'uploadedBy', type: 'relation', required: true, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: false } },
      { system: false, id: 'att_version1', name: 'currentVersion', type: 'number', required: false, options: { min: 1, noDecimal: true } }
    ],
    indexes: [
      'CREATE INDEX idx_attachments_project_created ON attachments (project, created)',
      'CREATE INDEX idx_attachments_name ON attachments (name)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(attachments);

  const attachmentVersions = new Collection({
    id: 'att_versions_col1',
    name: 'attachment_versions',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'atv_attach001', name: 'attachment', type: 'relation', required: true, options: { maxSelect: 1, collectionId: attachments.id, cascadeDelete: true } },
      { system: false, id: 'atv_file001', name: 'file', type: 'file', required: true, options: { maxSelect: 1, maxSize: 10485760 } },
      { system: false, id: 'atv_version01', name: 'version', type: 'number', required: true, options: { min: 1, noDecimal: true } },
      { system: false, id: 'atv_notes001', name: 'notes', type: 'text', required: false, options: {} },
      { system: false, id: 'atv_user001', name: 'uploadedBy', type: 'relation', required: true, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: false } }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_attachment_versions_unique ON attachment_versions (attachment, version)',
      'CREATE INDEX idx_attachment_versions_created ON attachment_versions (created)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(attachmentVersions);

  const wikiPages = new Collection({
    id: 'wiki_pages_col001',
    name: 'wiki_pages',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'wpg_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'wpg_title001', name: 'title', type: 'text', required: true, options: {} },
      { system: false, id: 'wpg_slug001', name: 'slug', type: 'text', required: true, options: {} },
      { system: false, id: 'wpg_parent001', name: 'parent', type: 'relation', required: false, options: { maxSelect: 1, collectionId: 'wiki_pages_col001', cascadeDelete: false } },
      { system: false, id: 'wpg_content01', name: 'content', type: 'editor', required: false, options: {} },
      { system: false, id: 'wpg_template1', name: 'template', type: 'relation', required: false, options: { maxSelect: 1, collectionId: 'templates_col001', cascadeDelete: false } },
      { system: false, id: 'wpg_editor001', name: 'lastEditedBy', type: 'relation', required: true, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: false } }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_wiki_project_slug ON wiki_pages (project, slug)',
      'CREATE INDEX idx_wiki_title ON wiki_pages (title)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(wikiPages);

  const wikiLinks = new Collection({
    id: 'wiki_links_col001',
    name: 'wiki_links',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'wlk_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'wlk_source001', name: 'sourcePage', type: 'relation', required: true, options: { maxSelect: 1, collectionId: wikiPages.id, cascadeDelete: true } },
      { system: false, id: 'wlk_target001', name: 'targetPage', type: 'relation', required: true, options: { maxSelect: 1, collectionId: wikiPages.id, cascadeDelete: true } }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_wiki_links_source_target ON wiki_links (sourcePage, targetPage)',
      'CREATE INDEX idx_wiki_links_project ON wiki_links (project)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(wikiLinks);

  const linkPreviews = new Collection({
    id: 'link_previews001',
    name: 'link_previews',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'lpr_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'lpr_url001', name: 'url', type: 'url', required: true, options: {} },
      { system: false, id: 'lpr_provider01', name: 'provider', type: 'select', required: true, options: { maxSelect: 1, values: ['google_docs', 'notion', 'figma', 'other'] } },
      { system: false, id: 'lpr_title001', name: 'title', type: 'text', required: false, options: {} },
      { system: false, id: 'lpr_desc001', name: 'description', type: 'text', required: false, options: {} },
      { system: false, id: 'lpr_image001', name: 'imageUrl', type: 'url', required: false, options: {} },
      { system: false, id: 'lpr_meta001', name: 'metaJson', type: 'json', required: false, options: {} }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_link_previews_url ON link_previews (url)',
      'CREATE INDEX idx_link_previews_provider ON link_previews (provider)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(linkPreviews);

  const templates = new Collection({
    id: 'templates_col001',
    name: 'templates',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'tpl_name001', name: 'name', type: 'text', required: true, options: {} },
      { system: false, id: 'tpl_kind001', name: 'kind', type: 'select', required: true, options: { maxSelect: 1, values: ['prd', 'spec', 'retro', 'risk_register'] } },
      { system: false, id: 'tpl_content01', name: 'content', type: 'editor', required: true, options: {} },
      { system: false, id: 'tpl_workspace1', name: 'workspace', type: 'relation', required: false, options: { maxSelect: 1, collectionId: workspacesCollection.id, cascadeDelete: true } },
      { system: false, id: 'tpl_project001', name: 'project', type: 'relation', required: false, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'tpl_createdby1', name: 'createdBy', type: 'relation', required: true, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: false } }
    ],
    indexes: [
      'CREATE INDEX idx_templates_scope ON templates (workspace, project)',
      'CREATE INDEX idx_templates_kind ON templates (kind)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(templates);

  const milestones = new Collection({
    id: 'milestones_col001',
    name: 'milestones',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'mls_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'mls_title001', name: 'title', type: 'text', required: true, options: {} },
      { system: false, id: 'mls_status001', name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ['planned', 'in_progress', 'completed', 'blocked'] } },
      { system: false, id: 'mls_plstart01', name: 'plannedStart', type: 'date', required: false, options: {} },
      { system: false, id: 'mls_pldue001', name: 'plannedDue', type: 'date', required: false, options: {} },
      { system: false, id: 'mls_actstart1', name: 'actualStart', type: 'date', required: false, options: {} },
      { system: false, id: 'mls_actdue001', name: 'actualDue', type: 'date', required: false, options: {} },
      { system: false, id: 'mls_progress1', name: 'completion', type: 'number', required: false, options: { min: 0, max: 100 } },
      { system: false, id: 'mls_owner001', name: 'owner', type: 'relation', required: false, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: false } }
    ],
    indexes: [
      'CREATE INDEX idx_milestones_project_dates ON milestones (project, plannedDue)',
      'CREATE INDEX idx_milestones_project_status ON milestones (project, status)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(milestones);

  const dependencies = new Collection({
    id: 'dependencies_col1',
    name: 'dependencies',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'dep_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'dep_source001', name: 'sourceMilestone', type: 'relation', required: true, options: { maxSelect: 1, collectionId: milestones.id, cascadeDelete: true } },
      { system: false, id: 'dep_target001', name: 'targetMilestone', type: 'relation', required: true, options: { maxSelect: 1, collectionId: milestones.id, cascadeDelete: true } },
      { system: false, id: 'dep_type001', name: 'type', type: 'select', required: true, options: { maxSelect: 1, values: ['finish_to_start', 'start_to_start', 'finish_to_finish'] } },
      { system: false, id: 'dep_approval01', name: 'requiresApproval', type: 'bool', required: false, options: {} }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_dependencies_pair ON dependencies (sourceMilestone, targetMilestone)',
      'CREATE INDEX idx_dependencies_project ON dependencies (project)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(dependencies);

  const calendars = new Collection({
    id: 'calendars_col001',
    name: 'calendars',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'cal_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'cal_provider01', name: 'provider', type: 'select', required: true, options: { maxSelect: 1, values: ['google', 'microsoft', 'ical'] } },
      { system: false, id: 'cal_external01', name: 'externalId', type: 'text', required: false, options: {} },
      { system: false, id: 'cal_icaltoken1', name: 'icalToken', type: 'text', required: false, options: {} },
      { system: false, id: 'cal_meta001', name: 'metaJson', type: 'json', required: false, options: {} }
    ],
    indexes: [
      'CREATE INDEX idx_calendars_project_provider ON calendars (project, provider)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(calendars);

  const holidays = new Collection({
    id: 'holidays_col001',
    name: 'holidays',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'hol_workspace1', name: 'workspace', type: 'relation', required: false, options: { maxSelect: 1, collectionId: workspacesCollection.id, cascadeDelete: true } },
      { system: false, id: 'hol_project001', name: 'project', type: 'relation', required: false, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'hol_locale001', name: 'locale', type: 'text', required: true, options: {} },
      { system: false, id: 'hol_team001', name: 'team', type: 'text', required: false, options: {} },
      { system: false, id: 'hol_date001', name: 'date', type: 'date', required: true, options: {} },
      { system: false, id: 'hol_name001', name: 'name', type: 'text', required: true, options: {} }
    ],
    indexes: [
      'CREATE INDEX idx_holidays_scope_date ON holidays (workspace, project, date)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(holidays);

  const approvals = new Collection({
    id: 'approvals_col001',
    name: 'approvals',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'apr_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'apr_type001', name: 'type', type: 'select', required: true, options: { maxSelect: 1, values: ['reschedule', 'timesheet', 'expense'] } },
      { system: false, id: 'apr_entity001', name: 'entityId', type: 'text', required: true, options: {} },
      { system: false, id: 'apr_status001', name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ['pending', 'approved', 'rejected'] } },
      { system: false, id: 'apr_reqby001', name: 'requestedBy', type: 'relation', required: true, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: false } },
      { system: false, id: 'apr_revby001', name: 'reviewedBy', type: 'relation', required: false, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: false } },
      { system: false, id: 'apr_notes001', name: 'notes', type: 'text', required: false, options: {} }
    ],
    indexes: [
      'CREATE INDEX idx_approvals_project_status ON approvals (project, status)',
      'CREATE INDEX idx_approvals_entity ON approvals (entityId)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(approvals);

  const timeEntries = new Collection({
    id: 'time_entries_col1',
    name: 'time_entries',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'tim_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'tim_task001', name: 'task', type: 'relation', required: false, options: { maxSelect: 1, collectionId: tasksCollection.id, cascadeDelete: true } },
      { system: false, id: 'tim_user001', name: 'user', type: 'relation', required: true, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: true } },
      { system: false, id: 'tim_start001', name: 'startedAt', type: 'date', required: false, options: {} },
      { system: false, id: 'tim_end001', name: 'endedAt', type: 'date', required: false, options: {} },
      { system: false, id: 'tim_minutes01', name: 'minutes', type: 'number', required: true, options: { min: 1, noDecimal: true } },
      { system: false, id: 'tim_billable1', name: 'billable', type: 'bool', required: false, options: {} },
      { system: false, id: 'tim_notes001', name: 'notes', type: 'text', required: false, options: {} }
    ],
    indexes: [
      'CREATE INDEX idx_time_entries_project_user_date ON time_entries (project, user, created)',
      'CREATE INDEX idx_time_entries_billable ON time_entries (billable)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(timeEntries);

  const timesheets = new Collection({
    id: 'timesheets_col001',
    name: 'timesheets',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'tsh_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'tsh_user001', name: 'user', type: 'relation', required: true, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: true } },
      { system: false, id: 'tsh_week001', name: 'weekStart', type: 'date', required: true, options: {} },
      { system: false, id: 'tsh_minutes01', name: 'totalMinutes', type: 'number', required: true, options: { min: 0, noDecimal: true } },
      { system: false, id: 'tsh_status001', name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ['draft', 'submitted', 'approved', 'rejected'] } },
      { system: false, id: 'tsh_subat001', name: 'submittedAt', type: 'date', required: false, options: {} },
      { system: false, id: 'tsh_appby001', name: 'approvedBy', type: 'relation', required: false, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: false } },
      { system: false, id: 'tsh_appat001', name: 'approvedAt', type: 'date', required: false, options: {} }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_timesheets_project_user_week ON timesheets (project, user, weekStart)',
      'CREATE INDEX idx_timesheets_status ON timesheets (status)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(timesheets);

  const rates = new Collection({
    id: 'rates_col000001',
    name: 'rates',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'rat_workspace01', name: 'workspace', type: 'relation', required: false, options: { maxSelect: 1, collectionId: workspacesCollection.id, cascadeDelete: true } },
      { system: false, id: 'rat_project001', name: 'project', type: 'relation', required: false, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'rat_user001', name: 'user', type: 'relation', required: false, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: true } },
      { system: false, id: 'rat_role001', name: 'role', type: 'select', required: false, options: { maxSelect: 1, values: ['admin', 'manager', 'member', 'guest'] } },
      { system: false, id: 'rat_hourly001', name: 'hourlyRate', type: 'number', required: true, options: { min: 0 } }
    ],
    indexes: [
      'CREATE INDEX idx_rates_scope ON rates (workspace, project, user, role)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(rates);

  const expenses = new Collection({
    id: 'expenses_col001',
    name: 'expenses',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'exp_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'exp_user001', name: 'user', type: 'relation', required: true, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: true } },
      { system: false, id: 'exp_amount001', name: 'amount', type: 'number', required: true, options: { min: 0 } },
      { system: false, id: 'exp_billable1', name: 'billable', type: 'bool', required: false, options: {} },
      { system: false, id: 'exp_category01', name: 'category', type: 'text', required: false, options: {} },
      { system: false, id: 'exp_desc001', name: 'description', type: 'text', required: false, options: {} },
      { system: false, id: 'exp_status001', name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ['draft', 'submitted', 'approved', 'rejected'] } },
      { system: false, id: 'exp_date001', name: 'expenseDate', type: 'date', required: true, options: {} }
    ],
    indexes: [
      'CREATE INDEX idx_expenses_project_date ON expenses (project, expenseDate)',
      'CREATE INDEX idx_expenses_status ON expenses (status)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(expenses);

  const sprints = new Collection({
    id: 'sprints_col0001',
    name: 'sprints',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'spr_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'spr_name001', name: 'name', type: 'text', required: true, options: {} },
      { system: false, id: 'spr_goal001', name: 'goal', type: 'text', required: false, options: {} },
      { system: false, id: 'spr_start001', name: 'startDate', type: 'date', required: true, options: {} },
      { system: false, id: 'spr_end001', name: 'endDate', type: 'date', required: true, options: {} },
      { system: false, id: 'spr_capacity1', name: 'capacityHours', type: 'number', required: false, options: { min: 0 } },
      { system: false, id: 'spr_status001', name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ['planned', 'active', 'completed'] } }
    ],
    indexes: [
      'CREATE INDEX idx_sprints_project_dates ON sprints (project, startDate, endDate)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(sprints);

  const epics = new Collection({
    id: 'epics_col000001',
    name: 'epics',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'epc_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'epc_sprint001', name: 'sprint', type: 'relation', required: false, options: { maxSelect: 1, collectionId: sprints.id, cascadeDelete: false } },
      { system: false, id: 'epc_name001', name: 'name', type: 'text', required: true, options: {} },
      { system: false, id: 'epc_desc001', name: 'description', type: 'text', required: false, options: {} },
      { system: false, id: 'epc_points01', name: 'storyPoints', type: 'number', required: false, options: { min: 0, noDecimal: true } },
      { system: false, id: 'epc_wsjf001', name: 'wsjfScore', type: 'number', required: false, options: { min: 0 } }
    ],
    indexes: [
      'CREATE INDEX idx_epics_project ON epics (project)',
      'CREATE INDEX idx_epics_wsjf ON epics (wsjfScore)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(epics);

  const initiatives = new Collection({
    id: 'initiatives_col1',
    name: 'initiatives',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'ini_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'ini_name001', name: 'name', type: 'text', required: true, options: {} },
      { system: false, id: 'ini_desc001', name: 'description', type: 'text', required: false, options: {} },
      { system: false, id: 'ini_status001', name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ['planned', 'active', 'completed'] } }
    ],
    indexes: [
      'CREATE INDEX idx_initiatives_project_status ON initiatives (project, status)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(initiatives);

  const retros = new Collection({
    id: 'retros_col00001',
    name: 'retros',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'rtr_project001', name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'rtr_sprint001', name: 'sprint', type: 'relation', required: false, options: { maxSelect: 1, collectionId: sprints.id, cascadeDelete: true } },
      { system: false, id: 'rtr_title001', name: 'title', type: 'text', required: true, options: {} },
      { system: false, id: 'rtr_board001', name: 'boardJson', type: 'json', required: false, options: {} },
      { system: false, id: 'rtr_actions01', name: 'actionItems', type: 'json', required: false, options: {} }
    ],
    indexes: [
      'CREATE INDEX idx_retros_project_created ON retros (project, created)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(retros);

  const dashboardConfigs = new Collection({
    id: 'dash_configs_col1',
    name: 'dashboard_configs',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'dsh_project001', name: 'project', type: 'relation', required: false, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'dsh_workspace1', name: 'workspace', type: 'relation', required: false, options: { maxSelect: 1, collectionId: workspacesCollection.id, cascadeDelete: true } },
      { system: false, id: 'dsh_owner001', name: 'owner', type: 'relation', required: true, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: true } },
      { system: false, id: 'dsh_name001', name: 'name', type: 'text', required: true, options: {} },
      { system: false, id: 'dsh_widgets01', name: 'widgetsJson', type: 'json', required: true, options: {} }
    ],
    indexes: [
      'CREATE INDEX idx_dashboard_scope ON dashboard_configs (workspace, project, owner)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(dashboardConfigs);

  const savedReports = new Collection({
    id: 'saved_reports001',
    name: 'saved_reports',
    type: 'base',
    system: false,
    schema: [
      { system: false, id: 'srp_project001', name: 'project', type: 'relation', required: false, options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true } },
      { system: false, id: 'srp_workspace1', name: 'workspace', type: 'relation', required: false, options: { maxSelect: 1, collectionId: workspacesCollection.id, cascadeDelete: true } },
      { system: false, id: 'srp_type001', name: 'type', type: 'select', required: true, options: { maxSelect: 1, values: ['executive', 'health', 'capacity', 'velocity', 'timesheet', 'budget'] } },
      { system: false, id: 'srp_name001', name: 'name', type: 'text', required: true, options: {} },
      { system: false, id: 'srp_filters01', name: 'filtersJson', type: 'json', required: false, options: {} },
      { system: false, id: 'srp_data001', name: 'dataJson', type: 'json', required: true, options: {} },
      { system: false, id: 'srp_schedule1', name: 'scheduleCron', type: 'text', required: false, options: {} },
      { system: false, id: 'srp_owner001', name: 'owner', type: 'relation', required: true, options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: true } }
    ],
    indexes: [
      'CREATE INDEX idx_saved_reports_scope ON saved_reports (workspace, project, type)',
      'CREATE INDEX idx_saved_reports_owner ON saved_reports (owner)'
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(savedReports);
}, (db) => {
  const dao = new Dao(db);
  const names = [
    'saved_reports',
    'dashboard_configs',
    'retros',
    'initiatives',
    'epics',
    'sprints',
    'expenses',
    'rates',
    'timesheets',
    'time_entries',
    'approvals',
    'holidays',
    'calendars',
    'dependencies',
    'milestones',
    'templates',
    'link_previews',
    'wiki_links',
    'wiki_pages',
    'attachment_versions',
    'attachments'
  ];

  names.forEach((name) => {
    try {
      const collection = dao.findCollectionByNameOrId(name);
      dao.deleteCollection(collection);
    } catch {
      // no-op
    }
  });
});
