migrate((db) => {
  const dao = new Dao(db);

  const usersCollection = dao.findCollectionByNameOrId('users');
  const projectsCollection = dao.findCollectionByNameOrId('projects');

  const organizations = new Collection({
    id: 'orgs_collection001',
    name: 'organizations',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: 'org_name001',
        name: 'name',
        type: 'text',
        required: true,
        options: {}
      },
      {
        system: false,
        id: 'org_owner001',
        name: 'owner',
        type: 'relation',
        required: true,
        options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: false }
      }
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id = owner',
    deleteRule: '@request.auth.id = owner'
  });
  dao.saveCollection(organizations);

  const workspaces = new Collection({
    id: 'workspaces_col001',
    name: 'workspaces',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: 'wsp_org001',
        name: 'organization',
        type: 'relation',
        required: true,
        options: { maxSelect: 1, collectionId: organizations.id, cascadeDelete: true }
      },
      {
        system: false,
        id: 'wsp_name001',
        name: 'name',
        type: 'text',
        required: true,
        options: {}
      }
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(workspaces);

  const workspaceMembers = new Collection({
    id: 'wsp_members_col01',
    name: 'workspace_members',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: 'wsm_wsp001',
        name: 'workspace',
        type: 'relation',
        required: true,
        options: { maxSelect: 1, collectionId: workspaces.id, cascadeDelete: true }
      },
      {
        system: false,
        id: 'wsm_user001',
        name: 'user',
        type: 'relation',
        required: true,
        options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: true }
      },
      {
        system: false,
        id: 'wsm_role001',
        name: 'role',
        type: 'select',
        required: true,
        options: { maxSelect: 1, values: ['admin', 'manager', 'member', 'guest'] }
      }
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(workspaceMembers);

  projectsCollection.schema.addField(
    new SchemaField({
      system: false,
      id: 'proj_workspace1',
      name: 'workspace',
      type: 'relation',
      required: false,
      options: { maxSelect: 1, collectionId: workspaces.id, cascadeDelete: true }
    })
  );

  projectsCollection.schema.addField(
    new SchemaField({
      system: false,
      id: 'proj_createdby1',
      name: 'createdBy',
      type: 'relation',
      required: false,
      options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: false }
    })
  );

  projectsCollection.listRule = '@request.auth.id != ""';
  projectsCollection.viewRule = '@request.auth.id != ""';
  projectsCollection.createRule = '@request.auth.id != ""';
  projectsCollection.updateRule = '@request.auth.id != ""';
  projectsCollection.deleteRule = '@request.auth.id != ""';

  dao.saveCollection(projectsCollection);

  const projectMembers = new Collection({
    id: 'proj_members_col1',
    name: 'project_members',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: 'prm_proj001',
        name: 'project',
        type: 'relation',
        required: true,
        options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true }
      },
      {
        system: false,
        id: 'prm_user001',
        name: 'user',
        type: 'relation',
        required: true,
        options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: true }
      },
      {
        system: false,
        id: 'prm_role001',
        name: 'role',
        type: 'select',
        required: true,
        options: { maxSelect: 1, values: ['admin', 'manager', 'member', 'guest'] }
      }
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(projectMembers);

  const projectFinancials = new Collection({
    id: 'proj_finance_col1',
    name: 'project_financials',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: 'pf_proj001',
        name: 'project',
        type: 'relation',
        required: true,
        options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true }
      },
      {
        system: false,
        id: 'pf_budget001',
        name: 'budget',
        type: 'number',
        required: false,
        options: {}
      },
      {
        system: false,
        id: 'pf_cost001',
        name: 'actualCost',
        type: 'number',
        required: false,
        options: {}
      }
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""'
  });
  dao.saveCollection(projectFinancials);

  const auditLogs = new Collection({
    id: 'audit_logs_col001',
    name: 'audit_logs',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: 'aud_user001',
        name: 'user',
        type: 'relation',
        required: true,
        options: { maxSelect: 1, collectionId: usersCollection.id, cascadeDelete: false }
      },
      {
        system: false,
        id: 'aud_action01',
        name: 'action',
        type: 'select',
        required: true,
        options: { maxSelect: 1, values: ['create', 'update', 'delete'] }
      },
      {
        system: false,
        id: 'aud_entity01',
        name: 'entity',
        type: 'text',
        required: true,
        options: {}
      },
      {
        system: false,
        id: 'aud_entityid1',
        name: 'entityId',
        type: 'text',
        required: true,
        options: {}
      },
      {
        system: false,
        id: 'aud_project01',
        name: 'project',
        type: 'relation',
        required: false,
        options: { maxSelect: 1, collectionId: projectsCollection.id, cascadeDelete: true }
      },
      {
        system: false,
        id: 'aud_wspace01',
        name: 'workspace',
        type: 'relation',
        required: false,
        options: { maxSelect: 1, collectionId: workspaces.id, cascadeDelete: true }
      },
      {
        system: false,
        id: 'aud_before01',
        name: 'beforeData',
        type: 'text',
        required: false,
        options: {}
      },
      {
        system: false,
        id: 'aud_after001',
        name: 'afterData',
        type: 'text',
        required: false,
        options: {}
      }
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: null,
    deleteRule: null
  });
  dao.saveCollection(auditLogs);
}, (db) => {
  const dao = new Dao(db);

  const names = [
    'audit_logs',
    'project_financials',
    'project_members',
    'workspace_members',
    'workspaces',
    'organizations'
  ];

  names.forEach((name) => {
    try {
      const collection = dao.findCollectionByNameOrId(name);
      dao.deleteCollection(collection);
    } catch {
      // no-op
    }
  });

  const projectsCollection = dao.findCollectionByNameOrId('projects');
  projectsCollection.schema.removeField('proj_workspace1');
  projectsCollection.schema.removeField('proj_createdby1');
  dao.saveCollection(projectsCollection);
});
