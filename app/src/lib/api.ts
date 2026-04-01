import { pb, currentUser } from './pocketbase';
import { get } from 'svelte/store';

export const api = {
  projects: {
    async getAll() {
      // Fetch user's projects
      return await pb.collection('projects').getFullList({
        sort: '-created',
      });
    },
    async create(data: { name: string, description?: string, status: string }) {
      return await pb.collection('projects').create(data);
    },
    async update(id: string, data: any) {
      return await pb.collection('projects').update(id, data);
    },
    async delete(id: string) {
      return await pb.collection('projects').delete(id);
    }
  },
  
  tasks: {
    async getForProject(projectId: string) {
      return await pb.collection('tasks').getFullList({
        filter: `project = "${projectId}"`,
        sort: 'order',
      });
    },
    async create(data: { title: string, project: string, status: string, order?: number, description?: string }) {
      return await pb.collection('tasks').create(data);
    },
    async update(id: string, data: any) {
      return await pb.collection('tasks').update(id, data);
    },
    async delete(id: string) {
      return await pb.collection('tasks').delete(id);
    }
  },

  comments: {
    async getForTask(taskId: string) {
      return await pb.collection('comments').getFullList({
        filter: `task = "${taskId}"`,
        sort: 'created',
        expand: 'author'
      });
    },
    async create(data: { task: string, content: string, author: string }) {
      return await pb.collection('comments').create(data);
    },
    async delete(id: string) {
      return await pb.collection('comments').delete(id);
    }
  }
};
