<script lang="ts">
  import { api } from '$lib/api';
  import { pb } from '$lib/pocketbase';
  import { onMount } from 'svelte';

  let { project, access } = $props<{ project: any; access: any }>();

  let attachments = $state<any[]>([]);
  let selectedAttachment = $state<any>(null);
  let versions = $state<any[]>([]);
  let uploadFile = $state<File | null>(null);
  let versionFile = $state<File | null>(null);
  let isLoading = $state(false);
  let error = $state('');
  const PREVIEWABLE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];

  function isPreviewable(fileName: string) {
    const lower = fileName.toLowerCase();
    return PREVIEWABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  }

  function fileUrl(record: any) {
    return `${pb.baseUrl}/api/files/${record.collectionId}/${record.id}/${record.file}`;
  }

  async function loadAttachments() {
    isLoading = true;
    error = '';
    try {
      attachments = await api.files.getForProject(project.id);
      if (selectedAttachment) {
        selectedAttachment = attachments.find((item) => item.id === selectedAttachment.id) || null;
      }
    } catch (e) {
      console.error(e);
      error = 'Failed to load attachments.';
    } finally {
      isLoading = false;
    }
  }

  async function loadVersions(attachmentId: string) {
    try {
      versions = await api.files.getVersions(attachmentId);
    } catch (e) {
      console.error(e);
      versions = [];
    }
  }

  async function uploadSelected() {
    if (!uploadFile || !access?.canManageFiles) return;
    await api.files.upload({ project: project.id, file: uploadFile });
    uploadFile = null;
    await loadAttachments();
  }

  async function uploadVersion() {
    if (!versionFile || !selectedAttachment || !access?.canManageFiles) return;
    await api.files.addVersion(selectedAttachment.id, { file: versionFile });
    versionFile = null;
    await loadAttachments();
    await loadVersions(selectedAttachment.id);
  }

  async function deleteAttachment() {
    if (!selectedAttachment || !access?.canManageFiles) return;
    await api.files.delete(selectedAttachment.id);
    selectedAttachment = null;
    versions = [];
    await loadAttachments();
  }

  async function onDropUpload(e: DragEvent) {
    e.preventDefault();
    if (!access?.canManageFiles) return;
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    uploadFile = file;
    await uploadSelected();
  }

  async function selectAttachment(attachment: any) {
    selectedAttachment = attachment;
    await loadVersions(attachment.id);
  }

  onMount(async () => {
    await loadAttachments();
  });
</script>

<div class="panel">
  <div class="panel-header">
    <h3>Attachments</h3>
    {#if access?.canManageFiles}
      <div class="upload-controls">
        <input
          id="file-upload-input"
          type="file"
          onchange={(e) => {
            const target = e.currentTarget as HTMLInputElement;
            uploadFile = target.files?.[0] || null;
          }}
        />
        <button onclick={uploadSelected} disabled={!uploadFile}>Upload</button>
      </div>
    {/if}
  </div>

  {#if access?.canManageFiles}
    <div
      class="dropzone"
      role="region"
      aria-label="File drop zone"
      ondragover={(e) => e.preventDefault()}
      ondrop={onDropUpload}
    >
      Drag and drop a file here (PDF/images)
    </div>
  {/if}

  {#if error}
    <div class="error">{error}</div>
  {/if}

  <div class="layout">
    <div class="list">
      {#if isLoading}
        <p>Loading attachments...</p>
      {:else if attachments.length === 0}
        <p>No attachments yet.</p>
      {:else}
        {#each attachments as attachment}
          <button class="item {selectedAttachment?.id === attachment.id ? 'active' : ''}" onclick={() => selectAttachment(attachment)}>
            <span>{attachment.name}</span>
            <small>v{attachment.currentVersion || 1}</small>
          </button>
        {/each}
      {/if}
    </div>
    <div class="details">
      {#if selectedAttachment}
        <h4>{selectedAttachment.name}</h4>
        {#if isPreviewable(selectedAttachment.file)}
          {#if selectedAttachment.file.toLowerCase().endsWith('.pdf')}
            <iframe src={fileUrl(selectedAttachment)} title="Attachment preview"></iframe>
          {:else}
            <img src={fileUrl(selectedAttachment)} alt={selectedAttachment.name} />
          {/if}
        {:else}
          <p>Preview not available for this file type.</p>
        {/if}

        <div class="version-row">
          <h5>Versions</h5>
          {#if access?.canManageFiles}
            <div class="upload-controls">
              <input
                id="version-upload-input"
                type="file"
                onchange={(e) => {
                  const target = e.currentTarget as HTMLInputElement;
                  versionFile = target.files?.[0] || null;
                }}
              />
              <button onclick={uploadVersion} disabled={!versionFile}>Add Version</button>
            </div>
          {/if}
        </div>
        <ul>
          {#each versions as version}
            <li>v{version.version} · {new Date(version.created).toLocaleString()}</li>
          {/each}
          {#if versions.length === 0}
            <li>No version history yet.</li>
          {/if}
        </ul>
        {#if access?.canManageFiles}
          <button class="danger" onclick={deleteAttachment}>Delete attachment</button>
        {/if}
      {:else}
        <p>Select an attachment to preview.</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .panel { display: flex; flex-direction: column; gap: 12px; }
  .panel-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .upload-controls { display: flex; gap: 8px; align-items: center; }
  .dropzone { border: 1px dashed var(--border-color); border-radius: 8px; padding: 12px; color: var(--text-muted); }
  .layout { display: grid; grid-template-columns: 280px 1fr; gap: 12px; min-height: 460px; }
  .list, .details { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .item { background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px; text-align: left; display: flex; justify-content: space-between; }
  .item.active { border-color: var(--color-green); }
  iframe { width: 100%; height: 320px; border: 1px solid var(--border-color); border-radius: 6px; background: #fff; }
  img { max-width: 100%; max-height: 320px; border-radius: 6px; border: 1px solid var(--border-color); }
  .version-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 12px; }
  .danger { color: #ff5a5a; }
  .error { color: #ff5a5a; }
</style>
