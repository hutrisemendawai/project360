import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function setup() {
  try {
    await pb.admins.create({ email: 'admin@project360.local', password: 'password123', passwordConfirm: 'password123' });
    console.log('Admin created.');
  } catch (err) {
    console.log('Admin create err:', err.response?.message || err.message);
  }

  try {
    await pb.admins.authWithPassword('admin@project360.local', 'password123');
    console.log('Authenticated as admin.');
  } catch (err) {
    console.error('Failed auth as admin:', err.response?.message || err.message);
    process.exit(1);
  }

  try {
    await pb.collections.create({
      name: 'projects',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text', required: false },
        { name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ["active", "completed", "archived"] } }
      ]
    });
    console.log('Projects collection created.');
  } catch (err) { 
    console.log('Projects collection error:', err.response?.message || err.message); 
  }

  try {
    const projCollection = await pb.collections.getOne('projects');
    await pb.collections.create({
      name: 'tasks',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      schema: [
        { name: 'title', type: 'text', required: true },
        { name: 'project', type: 'relation', required: true, options: { maxSelect: 1, collectionId: projCollection.id } },
        { name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ["todo", "in_progress", "review", "done"] } },
        { name: 'order', type: 'number', required: false }
      ]
    });
    console.log('Tasks collection created.');
  } catch (err) { 
    console.log('Tasks collection error:', err.response?.message || err.message); 
  }

  console.log('Database setup complete.');
}

setup();
