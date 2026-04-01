migrate((db) => {
  const collection1 = new Collection({
    id: "projects_collection0",
    name: "projects",
    type: "base",
    schema: [
      { name: "name", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "status", type: "select", required: true, options: { maxSelect: 1, values: ["active", "completed", "archived"] } }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });
  
  Dao(db).saveCollection(collection1);

  const collection2 = new Collection({
    id: "tasks_collection000",
    name: "tasks",
    type: "base",
    schema: [
      { name: "title", type: "text", required: true },
      { name: "project", type: "relation", required: true, options: { maxSelect: 1, collectionId: collection1.id } },
      { name: "status", type: "select", required: true, options: { maxSelect: 1, values: ["todo", "in_progress", "review", "done"] } },
      { name: "order", type: "number" }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  Dao(db).saveCollection(collection2);
}, (db) => {
  const dao = new Dao(db);
  const c1 = dao.findCollectionByNameOrId("projects");
  const c2 = dao.findCollectionByNameOrId("tasks");
  dao.deleteCollection(c1);
  dao.deleteCollection(c2);
});
