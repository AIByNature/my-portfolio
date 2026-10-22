(() => {
  const text = (selector, value) => { const node = document.querySelector(selector); if (node && typeof value === 'string') node.textContent = value; };
  const safeLink = (value) => { try { const url = new URL(value, location.href); return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
  const addLink = (parent, label, value) => { const href = safeLink(value); if (!href) return; const link = document.createElement('a'); link.href = href; link.textContent = label; if (href.startsWith('http')) { link.target = '_blank'; link.rel = 'noreferrer'; } parent.append(link); };

  function renderExperience(items) {
    const root = document.querySelector('#experience .timeline'); if (!root || !Array.isArray(items)) return;
    root.replaceChildren(...items.filter(item => item && item.published !== false).map(item => {
      const article = document.createElement('article'); article.className = 'timeline-item';
      const date = document.createElement('div'); date.className = 'timeline-date'; date.textContent = item.dates || ([item.startDate,item.endDate||(item.current?'Present':'')].filter(Boolean).join(' — ')) || item.date || '';
      const marker = document.createElement('div'); marker.className = 'timeline-marker';
      const content = document.createElement('div'); content.className = 'timeline-content';
      const kicker = document.createElement('span'); kicker.className = 'card-kicker'; kicker.textContent = item.organization || item.category || 'EXPERIENCE';
      const title = document.createElement('h3'); title.textContent = item.title || item.role || '';
      const description = document.createElement('p'); description.textContent = item.description || '';
      content.append(kicker, title, description);
      if(item.image&&safeLink(item.image)){const image=document.createElement('img');image.src=safeLink(item.image);image.alt=item.title?`${item.title} photo`:'';image.loading='lazy';image.className='experience-image';content.append(image);}
      addLink(content,'Supporting document ↗',item.documentUrl);
      article.append(date, marker, content); return article;
    }));
  }
  function renderProjects(items) {
    const root = document.querySelector('#projects .projects-grid'); if (!root || !Array.isArray(items)) return;
    const projectItems=items.filter(item=>item&&item.published!==false).map((item,index)=>({item,index})).sort((a,b)=>Number(Boolean(b.item.featured))-Number(Boolean(a.item.featured))||a.index-b.index).map(entry=>entry.item);
    root.replaceChildren(...projectItems.map((item, index) => {
      const card = document.createElement('article'); card.className = 'project-card';
      const visual = document.createElement('div'); visual.className = 'project-visual visual-olive';
      if (item.image && safeLink(item.image)) { const image = document.createElement('img'); image.src = safeLink(item.image); image.alt = item.title ? `${item.title} thumbnail` : 'Project image'; image.loading = 'lazy'; visual.append(image); }
      const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
      const titleVisual = document.createElement('div'); titleVisual.className = 'visual-word'; titleVisual.textContent = item.title || 'PROJECT'; visual.append(number, titleVisual);
      const info = document.createElement('div'); info.className = 'project-info';
      const category = document.createElement('div'); category.className = 'project-type'; category.textContent = item.category || 'PROJECT';
      if(item.featured){const featured=document.createElement('span');featured.className='project-featured';featured.textContent='FEATURED';info.append(featured);}
      const title = document.createElement('h3'); title.textContent = item.title || '';
      const description = document.createElement('p'); description.textContent = item.description || '';
      info.append(category, title, description);
      const tags = document.createElement('div'); tags.className = 'tags';
      (Array.isArray(item.tools) ? item.tools : Array.isArray(item.technologies) ? item.technologies : []).forEach(label => { const tag = document.createElement('span'); tag.textContent = label; tags.append(tag); }); info.append(tags);
      if(Array.isArray(item.gallery)&&item.gallery.length){const gallery=document.createElement('div');gallery.className='project-gallery';item.gallery.forEach((url,i)=>{const href=safeLink(url);if(!href)return;const image=document.createElement('img');image.src=href;image.alt=`${item.title||'Project'} gallery image ${i+1}`;image.loading='lazy';gallery.append(image);});info.append(gallery);}
      addLink(info, 'Repository ↗', item.repository); addLink(info, 'Live project ↗', item.liveUrl); addLink(info, 'Demonstration ↗', item.demoUrl);
      card.append(visual, info); return card;
    }));
  }
  function renderOjt(items) {
    const section = document.querySelector('#ojt .ojt-heading'); if (!section || !Array.isArray(items)) return;
    let root = document.getElementById('publishedOjtReports');
    if (!root) { root = document.createElement('div'); root.id = 'publishedOjtReports'; root.className = 'ojt-published-reports'; section.after(root); }
    root.replaceChildren();
    items.filter(item => item && item.published !== false).forEach(item => {
      const article = document.createElement('article'); article.className = 'ojt-block';
      const heading = document.createElement('h3'); heading.textContent = [item.week ? `Week ${item.week}` : '', item.title || item.activity || '', item.date || ''].filter(Boolean).join(' · ');
      const description = document.createElement('p'); description.textContent = item.description || '';
      article.append(heading, description);
      ['tasks', 'skills', 'challenges', 'accomplishments'].forEach(key => { if (!item[key]) return; const line = document.createElement('p'); line.textContent = `${key[0].toUpperCase()}${key.slice(1)}: ${Array.isArray(item[key]) ? item[key].join(', ') : item[key]}`; article.append(line); });
      if(item.reflections){const reflection=document.createElement('p');reflection.textContent=`Reflection: ${item.reflections}`;article.append(reflection);}
      if (Array.isArray(item.photos)) { const gallery = document.createElement('div'); gallery.className = 'ojt-report-photos'; item.photos.forEach(photo => { const figure = document.createElement('figure'); const image = document.createElement('img'); image.src = safeLink(typeof photo === 'string' ? photo : photo.url); image.alt = typeof photo === 'string' ? '' : (photo.caption || 'OJT activity photo'); image.loading = 'lazy'; figure.append(image); if (photo.caption) { const caption = document.createElement('figcaption'); caption.textContent = photo.caption; figure.append(caption); } gallery.append(figure); }); article.append(gallery); }
      addLink(article, 'Open report ↗', item.documentUrl); root.append(article);
    });
  }
  function renderCertificates(items) {
    const root=document.getElementById('achievementGrid');if(!root||!Array.isArray(items))return;
    const visible=items.filter(item=>item&&item.published!==false);root.replaceChildren();
    if(!visible.length){const empty=document.createElement('p');empty.className='content-empty';empty.textContent='Published certificates and achievements will appear here.';root.append(empty);return;}
    visible.forEach(item=>{const card=document.createElement('article');card.className='achievement-card';const title=document.createElement('h3');title.textContent=item.title||'Achievement';const meta=document.createElement('div');meta.className='achievement-meta';meta.textContent=[item.issuer,item.date].filter(Boolean).join(' · ');const description=document.createElement('p');description.textContent=item.description||'';card.append(meta,title,description);if(item.image&&safeLink(item.image)){const image=document.createElement('img');image.src=safeLink(item.image);image.alt=`${item.title||'Certificate'} image`;image.loading='lazy';card.append(image);}addLink(card,'View certificate ↗',item.documentUrl);root.append(card);});
  }
  function renderGallery(items) {
    const root=document.getElementById('portfolioGallery');if(!root||!Array.isArray(items))return;
    const visible=items.filter(item=>item&&item.published!==false&&item.image&&safeLink(item.image));root.replaceChildren();
    if(!visible.length){const empty=document.createElement('p');empty.className='content-empty';empty.textContent='Published gallery items will appear here.';root.append(empty);return;}
    visible.forEach(item=>{const figure=document.createElement('figure');const image=document.createElement('img');image.src=safeLink(item.image);image.alt=item.title||item.category||'Portfolio gallery image';image.loading='lazy';const caption=document.createElement('figcaption');caption.textContent=item.title||item.description||'';figure.append(image,caption);if(item.category){const category=document.createElement('span');category.className='gallery-category';category.textContent=item.category;figure.append(category);}root.append(figure);});
  }
  function apply(data) {
    if (!data || typeof data !== 'object') return;
    const home = data.home || {};
    text('.hero-copy h1', home.heroTitle); text('.hero-lead', home.tagline || home.introduction); text('.hero-note', home.welcomeMessage); text('#profileRole', home.professionalTitle);
    if (home.displayName) { const brand = document.querySelector('.brand'); if (brand?.lastElementChild) brand.lastElementChild.firstChild.textContent = home.displayName.toUpperCase(); document.title = `${home.displayName} — Portfolio`; }
    if (home.pageTitle) document.title = home.pageTitle;
    if (home.metaDescription) document.querySelector('meta[name="description"]')?.setAttribute('content', home.metaDescription);
    if(Array.isArray(home.buttons)){const root=document.querySelector('.hero-actions');home.buttons.slice(0,2).forEach((item,index)=>{const current=root?.children[index];if(!current||!item)return;const label=item.label||current.textContent.trim();if(item.destination&&item.destination.startsWith('#')){current.dataset.go=item.destination.slice(1);current.textContent=label;}else{const href=safeLink(item.destination);if(!href)return;const anchor=document.createElement('a');anchor.className=current.className;anchor.href=href;anchor.textContent=label;if(href.startsWith('http')){anchor.target='_blank';anchor.rel='noreferrer';}current.replaceWith(anchor);}});}
    if (home.profileImage && !Array.isArray(home.profileImages)) window.dispatchEvent(new CustomEvent('portfolio:content', { detail: { ...data, home: { ...home, profileImages: [{ src: home.profileImage, alt: home.displayName || 'Profile photo' }] } } }));
    const about = data.about || {};
    text('#about .section-intro', about.introduction);
    if(about.professionalGoals){const root=document.querySelector('.about-copy');if(root){let goals=root.querySelector('.professional-goals');if(!goals){goals=document.createElement('p');goals.className='professional-goals';root.insertBefore(goals,root.querySelector('.fact-list'));}goals.textContent=about.professionalGoals;}}
    if(about.image&&safeLink(about.image)){let image=document.getElementById('aboutPortrait');if(!image){image=document.createElement('img');image.id='aboutPortrait';image.className='about-portrait';image.alt='About profile';document.querySelector('.about-copy')?.prepend(image);}image.src=safeLink(about.image);}
    if (Array.isArray(about.paragraphs)) { const root = document.querySelector('.about-copy'); if (root) { root.querySelectorAll(':scope > p').forEach(node => node.remove()); const factList = root.querySelector('.fact-list'); about.paragraphs.forEach(value => { const p = document.createElement('p'); p.textContent = value; root.insertBefore(p, factList); }); } }
    if (about.education) text('.fact-list div strong', about.education);
    if (about.university) text('.fact-list div:nth-child(2) strong', about.university);
    const settings = data.settings || {};
    const featuredIds=new Set(Array.isArray(settings.featuredProjects)?settings.featuredProjects:[]);
    const projects=Array.isArray(data.projects)?data.projects.map(item=>featuredIds.has(item.id)?{...item,featured:true}:item):data.projects;
    renderExperience(data.experience); renderProjects(projects); renderOjt(data.ojt); renderCertificates(data.certificates); renderGallery(data.gallery);
    const contact = { ...(data.home?.socialLinks || {}), ...(data.contact || {}) };
    text('#contact .section-intro', contact.contactText);
    if (contact.email) { const link = document.querySelector('.contact-row a[href^="mailto:"]'); if (link) { link.href = `mailto:${contact.email}`; link.textContent = `${contact.email} ↗`; } const copy = document.getElementById('copyEmail'); if (copy) copy.dataset.email = contact.email; }
    const externalLinks = [...document.querySelectorAll('.contact-row a')];
    [['github', 1], ['linkedin', 2]].forEach(([key, index]) => { if (contact[key] && externalLinks[index]) { externalLinks[index].href = safeLink(contact[key]); externalLinks[index].textContent = `${contact[key].replace(/^https?:\/\//, '')} ↗`; } });
    if(Array.isArray(contact.otherLinks)){const card=document.querySelector('.contact-card');contact.otherLinks.forEach(item=>{if(!item?.label)return;const row=document.createElement('div');row.className='contact-row';const name=document.createElement('span');name.textContent=String(item.label).toUpperCase();row.append(name);addLink(row,item.label+' ↗',item.url);card?.insertBefore(row,card.querySelector('.contact-hint'));});}
    if(home.resumeLink){const card=document.querySelector('.contact-card');addLink(card,'Resume / CV ↗',home.resumeLink);}
    if (settings.pageTitle) document.title=settings.pageTitle;
    if (settings.metaDescription) document.querySelector('meta[name="description"]')?.setAttribute('content',settings.metaDescription);
    if (settings.footerText) text('.footer > span:last-of-type', settings.footerText);
    if (settings.favicon) { let icon = document.querySelector('link[rel="icon"]'); if (!icon) { icon = document.createElement('link'); icon.rel='icon'; document.head.append(icon); } icon.href=safeLink(settings.favicon); }
    if (settings.sectionVisibility && typeof settings.sectionVisibility === 'object') Object.entries(settings.sectionVisibility).forEach(([id,visible])=>{const section=document.getElementById(id);const nav=document.querySelector(`.nav-tab[data-page="${id}"]`);if(section){section.hidden=visible===false;section.style.display=visible===false?'none':'';}if(nav)nav.hidden=visible===false;});
    const colors=settings.themeColors||{};const colorVariables={olive:'--olive',lightOlive:'--olive2',brown:'--brown',beige:'--sand',darkGray:'--ink',cream:'--paper'};Object.entries(colorVariables).forEach(([key,variable])=>{if(typeof colors[key]==='string'&&/^#[\da-f]{6}$/i.test(colors[key]))document.documentElement.style.setProperty(variable,colors[key]);});
    if(settings.backgroundImage&&safeLink(settings.backgroundImage)){document.body.style.backgroundImage=`url("${safeLink(settings.backgroundImage)}")`;document.body.style.backgroundAttachment='fixed';document.body.style.backgroundSize='cover';}
    window.dispatchEvent(new CustomEvent('portfolio:content', { detail: data }));
  }
  const isPreview = new URLSearchParams(location.search).get('portfolioPreview') === '1';
  if (isPreview && window.opener && window.opener.location.origin === location.origin) {
    document.getElementById('portfolioIntro')?.remove();
    window.addEventListener('message', event => { if (event.source !== window.opener || event.origin !== location.origin || event.data?.type !== 'portfolio-preview') return; apply(event.data.content); }, { once: true });
  } else {
    fetch('/api/content').then(response => { if (!response.ok) throw new Error('Content unavailable'); return response.json(); }).then(apply).catch(() => { /* Keep the existing portfolio visible if the API is not configured yet. */ });
  }
})();
