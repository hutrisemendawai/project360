migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("tasks");
  if (!collection) return;
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "desc_field123",
    "name": "description",
    "type": "text",
    "required": false,
    "options": {}
  }));
  return dao.saveCollection(collection);
}, (db) => {
});
