const names = { home: 'Home page', about: 'About section', skills: 'Skills', experience: 'Experience', projects: 'Projects', ojt: 'OJT progress', contact: 'Contact & settings' };
const $ = (id) => document.getElementById(id);
const loginPanel = $('loginPanel'), editorPanel = $('editorPanel'), editor = $('contentEditor');
let documentData = { draft: {}, published: {} }, activeSection = 'home', savedText = '';

async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}
function sectionValue(source, key) { return source?.[key] ?? {}; }
function updateEditor() {
  const source = documentData.draft || {};
  const value = sectionValue(source, activeSection);
  editor.value = JSON.stringify(value, null, 2);
  savedText = editor.value;
  $('sectionLabel').textContent = activeSection.toUpperCase(); $('sectionTitle').textContent = names[activeSection];
  $('dirty').hidden = true; $('saveState').textContent = 'Draft loaded';
}
async function enterEditor() {
  documentData = await api('admin/content'); loginPanel.hidden = true; editorPanel.hidden = false; $('logout').hidden = false; updateEditor();
}
document.querySelectorAll('[data-section]').forEach((button) => button.addEventListener('click', () => {
  if (editor.value !== savedText && !confirm('Discard unsaved edits in this section?')) return;
  document.querySelector('[data-section].selected')?.classList.remove('selected'); button.classList.add('selected'); activeSection = button.dataset.section; updateEditor();
}));
editor.addEventListener('input', () => { $('dirty').hidden = editor.value === savedText; $('saveState').textContent = editor.value === savedText ? 'Draft loaded' : 'Unsaved changes'; });
async function save(publish) {
  let value; try { value = JSON.parse(editor.value); } catch { $('message').textContent = 'Fix the JSON syntax before saving.'; return; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) { $('message').textContent = 'Each section must be a JSON object.'; return; }
  const content = { ...(documentData.draft || {}), [activeSection]: value };
  $('message').textContent = publish ? 'Publishing…' : 'Saving…';
  try { await api('admin/content', { method: 'PUT', body: JSON.stringify({ content, publish }) }); documentData.draft = content; if (publish) documentData.published = content; updateEditor(); $('saveState').textContent = publish ? 'Published' : 'Draft saved'; $('message').textContent = publish ? 'Published changes are now live.' : 'Draft saved. Public visitors cannot see it.'; }
  catch (error) { $('message').textContent = error.message; }
}
$('saveDraft').addEventListener('click', () => save(false)); $('publish').addEventListener('click', () => save(true));
$('loginForm').addEventListener('submit', async (event) => { event.preventDefault(); $('loginMessage').textContent = ''; try { await api('login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) }); $('password').value = ''; await enterEditor(); } catch (error) { $('loginMessage').textContent = error.message; } });
$('logout').addEventListener('click', async () => { await api('logout', { method: 'POST', body: '{}' }).catch(() => {}); editorPanel.hidden = true; loginPanel.hidden = false; $('logout').hidden = true; });
$('fileUpload').addEventListener('change', async (event) => { const file = event.target.files[0]; if (!file) return; if (file.size > 4 * 1024 * 1024) { $('uploadResult').textContent = 'File exceeds 4 MB.'; return; } $('uploadResult').textContent = 'Uploading…'; try { const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); }); const result = await api('admin/upload', { method: 'POST', body: JSON.stringify({ name: file.name, type: file.type, data }) }); await navigator.clipboard.writeText(result.url).catch(() => {}); $('uploadResult').textContent = `Uploaded. URL copied: ${result.url}`; } catch (error) { $('uploadResult').textContent = error.message; } event.target.value = ''; });
window.addEventListener('beforeunload', (event) => { if (!editorPanel.hidden && editor.value !== savedText) { event.preventDefault(); event.returnValue = ''; } });
api('admin/content').then((data) => { documentData = data; }).catch(() => {});
