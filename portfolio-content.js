(() => {
  const text = (selector, value) => { const node = document.querySelector(selector); if (node && typeof value === 'string') node.textContent = value; };
  const safeLink = (value) => { try { const url = new URL(value, location.href); return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
  const addLink = (parent, label, value) => { const href = safeLink(value); if (!href) return; const link = document.createElement('a'); link.href = href; link.textContent = label; if (href.startsWith('http')) { link.target = '_blank'; link.rel = 'noreferrer'; } parent.append(link); };

  function renderExperience(items) {
    const root = document.querySelector('#experience .timeline'); if (!root || !Array.isArray(items)) return;
    root.replaceChildren(...items.filter(item => item && item.published !== false).map(item => {
      const article = document.createElement('article'); article.className = 'timeline-item';
      const date = document.createElement('div'); date.className = 'timeline-date'; date.textContent = item.dates || item.date || '';
      const marker = document.createElement('div'); marker.className = 'timeline-marker';
      const content = document.createElement('div'); content.className = 'timeline-content';
      const kicker = document.createElement('span'); kicker.className = 'card-kicker'; kicker.textContent = item.organization || item.category || 'EXPERIENCE';
      const title = document.createElement('h3'); title.textContent = item.title || item.role || '';
      const description = document.createElement('p'); description.textContent = item.description || '';
      content.append(kicker, title, description); article.append(date, marker, content); return article;
    }));
  }
  function renderProjects(items) {
    const root = document.querySelector('#projects .projects-grid'); if (!root || !Array.isArray(items)) return;
    root.replaceChildren(...items.filter(item => item && item.published !== false).map((item, index) => {
      const card = document.createElement('article'); card.className = 'project-card';
      const visual = document.createElement('div'); visual.className = 'project-visual visual-olive';
      if (item.image) { const image = document.createElement('img'); image.src = safeLink(item.image); image.alt = item.title ? `${item.title} thumbnail` : 'Project image'; image.loading = 'lazy'; visual.append(image); }
      const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
      const titleVisual = document.createElement('div'); titleVisual.className = 'visual-word'; titleVisual.textContent = item.title || 'PROJECT'; visual.append(number, titleVisual);
      const info = document.createElement('div'); info.className = 'project-info';
      const category = document.createElement('div'); category.className = 'project-type'; category.textContent = item.category || 'PROJECT';
      const title = document.createElement('h3'); title.textContent = item.title || '';
      const description = document.createElement('p'); description.textContent = item.description || '';
      info.append(category, title, description);
      const tags = document.createElement('div'); tags.className = 'tags';
      (Array.isArray(item.tools) ? item.tools : Array.isArray(item.technologies) ? item.technologies : []).forEach(label => { const tag = document.createElement('span'); tag.textContent = label; tags.append(tag); }); info.append(tags);
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
      if (Array.isArray(item.photos)) { const gallery = document.createElement('div'); gallery.className = 'ojt-report-photos'; item.photos.forEach(photo => { const figure = document.createElement('figure'); const image = document.createElement('img'); image.src = safeLink(typeof photo === 'string' ? photo : photo.url); image.alt = typeof photo === 'string' ? '' : (photo.caption || 'OJT activity photo'); image.loading = 'lazy'; figure.append(image); if (photo.caption) { const caption = document.createElement('figcaption'); caption.textContent = photo.caption; figure.append(caption); } gallery.append(figure); }); article.append(gallery); }
      addLink(article, 'Open report ↗', item.documentUrl); root.append(article);
    });
  }
  function apply(data) {
    if (!data || typeof data !== 'object') return;
    const home = data.home || {};
    text('.hero-copy h1', home.heroTitle); text('.hero-lead', home.tagline || home.introduction); text('.hero-note', home.welcomeMessage); text('#profileRole', home.professionalTitle);
    if (home.displayName) { const brand = document.querySelector('.brand'); if (brand?.lastElementChild) brand.lastElementChild.firstChild.textContent = home.displayName.toUpperCase(); document.title = `${home.displayName} — Portfolio`; }
    if (home.pageTitle) document.title = home.pageTitle;
    if (home.metaDescription) document.querySelector('meta[name="description"]')?.setAttribute('content', home.metaDescription);
    const about = data.about || {};
    text('#about .section-intro', about.introduction);
    if (Array.isArray(about.paragraphs)) { const root = document.querySelector('.about-copy'); if (root) { root.querySelectorAll(':scope > p').forEach(node => node.remove()); const factList = root.querySelector('.fact-list'); about.paragraphs.forEach(value => { const p = document.createElement('p'); p.textContent = value; root.insertBefore(p, factList); }); } }
    if (about.education) text('.fact-list div strong', about.education);
    renderExperience(data.experience); renderProjects(data.projects); renderOjt(data.ojt);
    const contact = data.contact || {};
    if (contact.email) { const link = document.querySelector('.contact-row a[href^="mailto:"]'); if (link) { link.href = `mailto:${contact.email}`; link.textContent = `${contact.email} ↗`; } const copy = document.getElementById('copyEmail'); if (copy) copy.dataset.email = contact.email; }
    const externalLinks = [...document.querySelectorAll('.contact-row a')];
    [['github', 1], ['linkedin', 2]].forEach(([key, index]) => { if (contact[key] && externalLinks[index]) { externalLinks[index].href = safeLink(contact[key]); externalLinks[index].textContent = `${contact[key].replace(/^https?:\/\//, '')} ↗`; } });
    window.dispatchEvent(new CustomEvent('portfolio:content', { detail: data }));
  }
  fetch('/api/content').then(response => { if (!response.ok) throw new Error('Content unavailable'); return response.json(); }).then(apply).catch(() => { /* Keep the existing portfolio visible if the API is not configured yet. */ });
})();
