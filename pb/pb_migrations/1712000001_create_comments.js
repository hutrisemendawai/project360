migrate((db) => {
  const dao = new Dao(db);
  const tasksCollection = dao.findCollectionByNameOrId("tasks");
  const usersCollection = dao.findCollectionByNameOrId("users");

  const collection = new Collection({
    "id": "comments_collection",
    "name": "comments",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "comm_content",
        "name": "content",
        "type": "text",
        "required": true,
        "options": {}
      },
      {
        "system": false,
        "id": "comm_task",
        "name": "task",
        "type": "relation",
        "required": true,
        "options": { "collectionId": tasksCollection.id, "cascadeDelete": true, "maxSelect": 1 }
      },
      {
        "system": false,
        "id": "comm_author",
        "name": "author",
        "type": "relation",
        "required": true,
        "options": { "collectionId": usersCollection.id, "cascadeDelete": true, "maxSelect": 1 }
      }
    ],
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id = author",
    "deleteRule": "@request.auth.id = author"
  });
  
  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("comments");
  return dao.deleteCollection(collection);
});
