<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '$lib/api';
  import { pb, currentUser } from '$lib/pocketbase';

  let { task, onClose } = $props<{ task: any, onClose: () => void }>();

  let comments = $state<any[]>([]);
  let newComment = $state('');
  let isLoading = $state(true);
  let canCommentOnTask = $state(true);

  onMount(async () => {
    try {
      const access = await api.governance.getProjectAccess(task.project);
      canCommentOnTask = access.canComment;
      comments = await api.comments.getForTask(task.id);
      
      pb.collection('comments').subscribe('*', function (e) {
        if (e.action === 'create' && e.record.task === task.id) {
          // get author data too if not expanded (since realtime doesn't expand by default)
          if (!e.record.expand) {
            pb.collection('users').getOne(e.record.author).then(user => {
              e.record.expand = { author: user };
              comments = [...comments, e.record];
            });
          } else {
            comments = [...comments, e.record];
          }
        }
      });
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  });

  onDestroy(() => {
    pb.collection('comments').unsubscribe('*');
  });

  async function postComment() {
    if (!newComment.trim() || !$currentUser) return;
    try {
      await api.comments.create({
        task: task.id,
        content: newComment,
        author: $currentUser.id
      });
      newComment = '';
    } catch (e) {
      console.error('Failed to post comment', e);
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-backdrop" role="presentation" onclick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
  <div class="modal task-modal">
    <div class="modal-header">
      <h2>{task.title}</h2>
      <button class="close-btn" onclick={onClose}>&times;</button>
    </div>

    <div class="modal-body">
      <div class="main-col">
        <section class="desc-section">
          <h3>Description</h3>
          <p class="task-desc">{task.description || 'No description provided.'}</p>
        </section>

        <section class="activity-section">
          <h3>Activity & Comments</h3>
          <div class="comments-list">
            {#if isLoading}
              <div class="loader"></div>
            {:else}
              {#each comments as comment}
                <div class="comment">
                  <div class="avatar">{comment.expand?.author?.name?.charAt(0).toUpperCase() || 'U'}</div>
                  <div class="comment-content">
                    <span class="author-name">
                      {comment.expand?.author?.name || 'User'} 
                      <span class="date">{new Date(comment.created).toLocaleString()}</span>
                    </span>
                    <p>{comment.content}</p>
                  </div>
                </div>
              {/each}
              {#if comments.length === 0}
                <p class="empty-msg">No comments yet. Start the conversation!</p>
              {/if}
            {/if}
          </div>

          <div class="comment-input-area">
            <textarea bind:value={newComment} placeholder="Add a comment..."></textarea>
            <button class="save" onclick={postComment} disabled={!newComment.trim() || !canCommentOnTask}>Comment</button>
          </div>
        </section>
      </div>

      <div class="side-col">
        <div class="meta-card">
          <h4>Details</h4>
          <div class="meta-row">
            <span class="label">Status</span>
            <span class="value status-badge {task.status}">{task.status.replace('_', ' ')}</span>
          </div>
          <div class="meta-row">
            <span class="label">Assignee</span>
            <span class="value">Unassigned</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 1000;
  }

  .task-modal {
    background: var(--surface-color); border-radius: 16px;
    width: 100%; max-width: 800px; max-height: 90vh;
    border: 1px solid var(--border-color);
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    display: flex; flex-direction: column; overflow: hidden;
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .modal-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 30px; border-bottom: 1px solid var(--border-color);
    background: var(--bg-color);
  }

  .modal-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
  .close-btn { font-size: 24px; color: var(--text-muted); cursor: pointer; padding: 0; background: none; border: none; }
  .close-btn:hover { color: var(--text-main); }

  .modal-body {
    display: flex; flex: 1; overflow: hidden;
  }

  .main-col {
    flex: 2; padding: 30px; overflow-y: auto;
    border-right: 1px solid var(--border-color);
  }

  .side-col {
    flex: 1; padding: 30px; background: rgba(0,0,0,0.1); overflow-y: auto;
  }

  .desc-section { margin-bottom: 40px; }
  h3 { margin: 0 0 15px; font-size: 15px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 10px; }
  .task-desc { font-size: 14px; color: var(--text-muted); line-height: 1.6; white-space: pre-wrap; margin: 0; }

  .comments-list { margin-bottom: 20px; }
  .comment { display: flex; gap: 15px; margin-bottom: 20px; }
  .avatar { width: 32px; height: 32px; min-width: 32px; border-radius: 50%; background: var(--color-green); display: flex; align-items: center; justify-content: center; font-weight: bold; color: var(--color-black); }
  .comment-content { flex: 1; background: var(--bg-color); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); }
  .author-name { display: block; font-weight: 600; font-size: 13px; margin-bottom: 5px; }
  .date { font-weight: normal; color: var(--text-muted); font-size: 11px; margin-left: 8px; }
  .comment-content p { margin: 0; font-size: 14px; color: var(--text-muted); line-height: 1.5; white-space: pre-wrap; }
  .empty-msg { font-size: 13px; color: var(--text-muted); font-style: italic; }

  .comment-input-area { display: flex; flex-direction: column; gap: 10px; }
  .comment-input-area textarea { background: var(--bg-color); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; color: var(--text-main); font-family: inherit; resize: vertical; min-height: 80px; }
  .comment-input-area textarea:focus { outline: none; border-color: var(--color-green); }
  .comment-input-area .save { align-self: flex-end; }

  .save { background: var(--color-green); color: var(--color-black); padding: 8px 16px; border-radius: 6px; font-weight: 500; border: none; cursor: pointer; }
  .save:hover:not(:disabled) { background: var(--color-green-light); }
  .save:disabled { opacity: 0.5; cursor: not-allowed; }

  .meta-card h4 { margin: 0 0 15px; font-size: 14px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-size: 13px; }
  .meta-row .label { color: var(--text-muted); }
  
  .status-badge { font-size: 11px; padding: 4px 8px; border-radius: 12px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; display: inline-block; }
  .status-badge.todo { background: rgba(150, 150, 150, 0.2); color: #ccc; }
  .status-badge.in_progress { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
  .status-badge.review { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
  .status-badge.done { background: rgba(29, 185, 84, 0.2); color: var(--color-green-light); }
</style>
