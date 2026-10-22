const $ = (id) => document.getElementById(id);
const names = { home: 'Home page', about: 'About section', skills: 'Skills', experience: 'Experience', projects: 'Projects', ojt: 'OJT progress', contact: 'Contact information', settings: 'Website settings' };
const objectFields = {
  home: [['displayName','Display name'],['professionalTitle','Professional title'],['tagline','Tagline','area'],['introduction','Introduction','area'],['welcomeMessage','Welcome message','area'],['heroTitle','Hero heading'],['profileImages','Profile photos (JSON)','json'],['buttons','Hero buttons (JSON)','json'],['socialLinks','Social links (JSON)','json']],
  about: [['introduction','Introduction','area'],['paragraphs','Biography paragraphs (one per line)','list'],['education','Education'],['university','University'],['professionalGoals','Professional goals','area'],['image','About image URL']],
  contact: [['email','Email'],['github','GitHub URL'],['linkedin','LinkedIn URL'],['otherLinks','Other links (JSON)','json'],['contactText','Contact section text','area']],
  settings: [['pageTitle','Page title'],['metaDescription','Meta description','area'],['favicon','Favicon URL'],['footerText','Footer text'],['sectionVisibility','Section visibility (JSON)','json']],
};
const entryFields = {
  skills: [['name','Skill name'],['category','Category'],['status','Experience label','status'],['description','Description','area'],['abilities','Evidence or abilities (one per line)','list']],
  experience: [['organization','Organization'],['role','Role'],['title','Display title'],['category','Category'],['dates','Dates'],['current','Current experience','boolean'],['description','Description','area'],['image','Image URL'],['documentUrl','Supporting document URL']],
  projects: [['title','Project title'],['category','Category'],['description','Description','area'],['tools','Tools or technologies (one per line)','list'],['image','Thumbnail URL'],['gallery','Gallery image URLs (one per line)','list'],['repository','Repository URL'],['liveUrl','Live project URL'],['demoUrl','Demonstration URL']],
  ojt: [['week','Week number'],['date','Date'],['title','Activity title'],['description','Description','area'],['tasks','Tasks performed (one per line)','list'],['skills','Skills developed (one per line)','list'],['challenges','Challenges (one per line)','list'],['accomplishments','Accomplishments (one per line)','list'],['photos','Photos and captions (JSON)','json'],['documentUrl','Report document URL'],['googleDocUrl','Google Docs URL']],
};
const defaults = {
  skills: { name:'', status:'Developing', abilities:[], published:false }, experience: { title:'', description:'', published:false }, projects: { title:'', description:'', tools:[], published:false }, ojt: { title:'', description:'', tasks:[], skills:[], photos:[], published:false },
};
let serverData = { draft: {}, published: {} }, working = {}, activeSection = 'overview', dirty = false;
const loginPanel = $('loginPanel'), editorPanel = $('editorPanel');

async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}
function markDirty() { dirty = true; $('dirty').hidden = false; $('saveState').textContent = 'Unsaved changes'; }
function element(tag, className, value) { const node = document.createElement(tag); if (className) node.className = className; if (value != null) node.textContent = value; return node; }
function fieldControl(key, labelText, type, value, update) {
  const wrap = element('label', 'field'); wrap.append(element('span', '', labelText));
  let input;
  if (type === 'boolean') { input = document.createElement('input'); input.type = 'checkbox'; input.checked = Boolean(value); }
  else if (type === 'status') { input = document.createElement('select'); ['Comfortable','Developing','Currently Learning'].forEach(option => { const opt = element('option','',option); opt.value = option; input.append(opt); }); input.value = value || 'Developing'; }
  else if (type === 'area' || type === 'list' || type === 'json') { input = document.createElement('textarea'); input.rows = type === 'area' ? 4 : type === 'json' ? 5 : 3; if (type === 'json') { input.value = JSON.stringify(value ?? (key === 'photos' ? [] : {}), null, 2); } else if (type === 'list') input.value = Array.isArray(value) ? value.join('\n') : (value || ''); else input.value = value || ''; }
  else { input = document.createElement('input'); input.type = 'text'; input.value = value ?? ''; }
  input.addEventListener('input', () => {
    let next = input.type === 'checkbox' ? input.checked : input.value;
    if (type === 'list') next = input.value.split('\n').map(item => item.trim()).filter(Boolean);
    if (type === 'json') { try { next = JSON.parse(input.value); input.setCustomValidity(''); } catch { input.setCustomValidity('Enter valid JSON.'); } }
    update(next); markDirty();
  });
  wrap.append(input); return wrap;
}
function updateStats() {
  const published = serverData.published || {}, draft = working;
  $('statProjects').textContent = (published.projects || []).filter(item => item.published !== false).length;
  $('statExperience').textContent = (published.experience || []).filter(item => item.published !== false).length;
  $('statOjt').textContent = (published.ojt || []).filter(item => item.published !== false).length;
  let count = 0;
  ['skills','experience','projects','ojt'].forEach(key => {
    const items = draft[key] || [], live = published[key] || [], byId = new Map(live.map((item, i) => [item.id || `legacy-${i}`, item]));
    count += items.filter((item, i) => { const prior = byId.get(item.id || `legacy-${i}`); return item.published === false || !prior || JSON.stringify(item) !== JSON.stringify(prior); }).length;
  });
  Object.keys(objectFields).forEach(key => { if (JSON.stringify(draft[key] || {}) !== JSON.stringify(published[key] || {})) count += 1; });
  $('statDrafts').textContent = count;
}
function renderObjectFields(section) {
  const root = $('formFields'); root.replaceChildren();
  const data = working[section] && !Array.isArray(working[section]) ? working[section] : {};
  working[section] = data;
  objectFields[section].forEach(([key,label,type='text']) => root.append(fieldControl(key,label,type,data[key],value => { data[key] = value; updateStats(); })));
}
function renderEntries(section) {
  const root = $('entries'); root.replaceChildren(); $('formFields').replaceChildren();
  if (!Array.isArray(working[section])) working[section] = [];
  const fields = entryFields[section];
  working[section].forEach((item,index) => {
    const card = element('article','entry-card');
    const top = element('div','entry-head'); const heading = element('strong','',item.title || item.name || item.role || `Entry ${index+1}`); top.append(heading);
    const controls = element('div','entry-controls');
    [['↑','Move up',-1],['↓','Move down',1]].forEach(([labelText,title,step]) => { const button = element('button','small-button',labelText); button.type='button'; button.title=title; button.disabled=index+step<0||index+step>=working[section].length; button.addEventListener('click',()=>{ [working[section][index],working[section][index+step]]=[working[section][index+step],working[section][index]]; renderEntries(section); markDirty(); }); controls.append(button); });
    const remove = element('button','small-button danger','Delete'); remove.type='button'; remove.addEventListener('click',()=>{ if(confirm('Delete this entry? This change takes effect after you save or publish.')) { working[section].splice(index,1); renderEntries(section); markDirty(); updateStats(); } }); controls.append(remove); top.append(controls); card.append(top);
    const status = element('span',`entry-status ${item.published===false?'is-draft':'is-published'}`,item.published===false?'Draft':'Published'); card.append(status);
    const fieldsRoot = element('div','field-grid');
    fields.forEach(([key,label,type='text'])=>fieldsRoot.append(fieldControl(key,label,type,item[key],value=>{item[key]=value;heading.textContent=item.title||item.name||item.role||`Entry ${index+1}`;updateStats();})));
    card.append(fieldsRoot); root.append(card);
  });
  $('addEntry').hidden = false; $('addEntry').onclick = () => { const value = structuredClone(defaults[section]); value.id = crypto.randomUUID(); working[section].push(value); renderEntries(section); markDirty(); updateStats(); };
}
function setSection(section) {
  activeSection = section;
  document.querySelector('[data-section].selected')?.classList.remove('selected');
  document.querySelector(`[data-section="${section}"]`)?.classList.add('selected');
  $('overviewPanel').hidden = section !== 'overview'; $('sectionPanel').hidden = section === 'overview';
  if (section === 'overview') { $('formFields').replaceChildren(); $('entries').replaceChildren(); $('addEntry').hidden = true; return; }
  $('sectionLabel').textContent = section.toUpperCase(); $('sectionTitle').textContent = names[section];
  $('dirty').hidden = !dirty;
  if (entryFields[section]) renderEntries(section); else { $('entries').replaceChildren(); $('addEntry').hidden = true; renderObjectFields(section); }
}
function goSection(section) { if (dirty && !confirm('You have unsaved edits. Discard them and switch sections?')) return; working = structuredClone(serverData.draft && Object.keys(serverData.draft).length ? serverData.draft : serverData.published || {}); dirty=false; setSection(section); updateStats(); }
async function enterEditor() {
  serverData = await api('admin/content');
  working = structuredClone(serverData.draft && Object.keys(serverData.draft).length ? serverData.draft : serverData.published || {});
  loginPanel.hidden = true; editorPanel.hidden = false; updateStats(); setSection('overview'); $('saveState').textContent='Content loaded';
  $('recentUpdate').textContent=serverData.updated_at?`Last saved ${new Date(serverData.updated_at).toLocaleString()}`:'No saved changes yet';
}
document.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => goSection(button.dataset.section)));
document.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => goSection(button.dataset.jump)));
async function save(publish) {
  if (dirty && document.querySelector('#sectionPanel textarea:invalid')) { $('message').textContent='Fix invalid JSON fields before saving.'; return; }
  const content=structuredClone(working);
  if (publish) ['skills','experience','projects','ojt'].forEach(key => { if (Array.isArray(content[key])) content[key].forEach(item => { item.published=true; }); });
  $('message').textContent=publish?'Publishing…':'Saving draft…';
  try { await api('admin/content',{method:'PUT',body:JSON.stringify({content,publish})}); serverData.draft=content; if(publish)serverData.published=structuredClone(content); serverData.updated_at=new Date().toISOString(); working=content; dirty=false; $('dirty').hidden=true; $('saveState').textContent=publish?'Published':'Draft saved'; $('message').textContent=publish?'Published changes are live.':'Draft saved privately.'; $('recentUpdate').textContent=`Last saved ${new Date(serverData.updated_at).toLocaleString()}`; updateStats(); setSection(activeSection); }
  catch(error){ $('message').textContent=error.message; }
}
$('saveDraft').addEventListener('click',()=>save(false)); $('publish').addEventListener('click',()=>save(true));
function previewData(){const current=structuredClone(working); if(['skills','experience','projects','ojt'].includes(activeSection)&&dirty){/* edits already update working */} ['skills','experience','projects','ojt'].forEach(key=>{if(Array.isArray(current[key]))current[key].forEach(item=>item.published=true);});return current;}
$('preview').addEventListener('click',()=>{if(document.querySelector('#sectionPanel textarea:invalid')){$('message').textContent='Fix invalid JSON fields before previewing.';return;}const target=window.open('/?portfolioPreview=1','portfolio-preview');if(!target){$('message').textContent='Allow pop-ups for this site to open the preview.';return;}const data=previewData();target.addEventListener('load',()=>target.postMessage({type:'portfolio-preview',content:data},location.origin),{once:true});});
$('showDrafts').addEventListener('click',()=>{const draft=working;const keys=['skills','experience','projects','ojt'];const next=keys.find(key=>{const live=serverData.published?.[key]||[];const prior=new Map(live.map((item,i)=>[item.id||`legacy-${i}`,item]));return(draft[key]||[]).some((item,i)=>item.published===false||JSON.stringify(item)!==JSON.stringify(prior.get(item.id||`legacy-${i}`)));});if(next)goSection(next);else{$('message').textContent='No unsaved list entries.';}});
$('loginForm').addEventListener('submit',async event=>{event.preventDefault();$('loginMessage').textContent='';try{await api('login',{method:'POST',body:JSON.stringify({password:$('password').value})});$('password').value='';await enterEditor();}catch(error){$('loginMessage').textContent=error.message;}});
$('logout').addEventListener('click',async()=>{await api('logout',{method:'POST',body:'{}'}).catch(()=>{});editorPanel.hidden=true;loginPanel.hidden=false;});
$('fileUpload').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;if(file.size>4*1024*1024){$('uploadResult').textContent='File exceeds 4 MB.';return;}const preview=$('uploadPreview');preview.replaceChildren();if(file.type.startsWith('image/')){const image=document.createElement('img');image.src=URL.createObjectURL(file);image.alt=`Preview of ${file.name}`;image.className='upload-preview-image';preview.append(image);}$('uploadResult').textContent='Uploading…';try{const result=await api('admin/upload',{method:'POST',headers:{'Content-Type':file.type,'X-File-Name':encodeURIComponent(file.name)},body:file});await navigator.clipboard.writeText(result.url).catch(()=>{});$('uploadResult').textContent=`Uploaded. URL copied: ${result.url}`;}catch(error){$('uploadResult').textContent=error.message;}event.target.value='';});
window.addEventListener('beforeunload',event=>{if(!editorPanel.hidden&&dirty){event.preventDefault();event.returnValue='';}});
