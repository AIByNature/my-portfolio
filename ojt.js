(() => {
  const data = window.ojtData || {};
  const weeks = [...(Array.isArray(data.weeks) ? data.weeks : [])].sort((a, b) => {
    const weekOrder = (Number(a.week) || 0) - (Number(b.week) || 0);
    return weekOrder || String(a.startDate || "").localeCompare(String(b.startDate || ""));
  });
  const filters = document.getElementById("ojtFilters");
  const weekList = document.getElementById("ojtWeeks");
  const gallery = document.getElementById("ojtGallery");
  const skills = document.getElementById("ojtSkills");
  const lightbox = document.getElementById("ojtLightbox");
  const lightboxImage = document.getElementById("ojtLightboxImage");
  const lightboxPlaceholder = document.getElementById("ojtLightboxPlaceholder");
  const lightboxCaption = document.getElementById("ojtLightboxCaption");
  const lightboxLabel = document.getElementById("ojtLightboxLabel");
  const lightboxCount = document.getElementById("ojtLightboxCount");
  const photoGroups = new Map();
  let activePhotoGroup = [];
  let activePhotoIndex = 0;

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const hasValue = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
  const textOrPlaceholder = value => value ? escapeHTML(value) : "Not yet specified";
  const formatHours = value => `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} hours`;
  const photoList = photos => (Array.isArray(photos) ? photos : [])
    .map(photo => typeof photo === "string" ? { src: photo, alt: "OJT activity photo", caption: "" } : photo)
    .filter(photo => photo && typeof photo.src === "string" && photo.src.trim());
  const categoryKey = value => String(value || "").trim().toLowerCase();
  const list = value => Array.isArray(value) ? value : [];

  function weekDate(week) {
    const start = week.startDate || "";
    const end = week.endDate || "";
    if (start && end) return `${escapeHTML(start)} — ${escapeHTML(end)}`;
    return textOrPlaceholder(start || end);
  }

  function activityMatches(activity, filter) {
    return filter === "all" || categoryKey(activity.category) === filter;
  }

  function activityPhotoGroup(week, activity) {
    const photos = photoList(activity.photos);
    return { title: activity.title || `Week ${week.week} activity`, photos };
  }

  function renderPhotoButtons(group, className = "ojt-week-photo") {
    if (!group.photos.length) return "";
    const groupId = `photo-group-${photoGroups.size}`;
    photoGroups.set(groupId, group);
    return `<div class="ojt-week-photos">${group.photos.map((photo, index) => `
      <button class="${className}" type="button" data-lightbox="${groupId}" data-photo-index="${index}" aria-label="View photo ${index + 1}: ${escapeHTML(photo.alt || group.title)}">
        <img src="${escapeHTML(photo.src)}" alt="${escapeHTML(photo.alt || group.title)}" loading="lazy">
        <span class="ojt-photo-placeholder">PHOTO</span>
      </button>`).join("")}</div>`;
  }

  function activityHTML(activity) {
    const title = activity.title || "Activity details not yet added";
    const description = activity.details || activity.description || "";
    return `<li class="ojt-activity"><div><span class="ojt-category">${textOrPlaceholder(activity.category)}</span><strong>${escapeHTML(title)}</strong>${description ? `<p>${escapeHTML(description)}</p>` : ""}</div></li>`;
  }

  function reflectionRows(reflection = {}) {
    const prompts = [
      ["What did I accomplish this week?", reflection.accomplished],
      ["What new skills or knowledge did I gain?", reflection.gained],
      ["What challenges did I encounter?", reflection.challenges],
      ["How did I address those challenges?", reflection.addressed],
      ["What will I improve in the following week?", reflection.improve]
    ];
    return prompts.map(([prompt, answer]) => `<div class="ojt-reflection-row"><span>${prompt}</span><p>${textOrPlaceholder(answer)}</p></div>`).join("");
  }

  function renderWeek(week, filter) {
    const activities = list(week.activities).filter(activity => activityMatches(activity, filter));
    const documented = week.status
      ? week.status === "documented"
      : Boolean(week.summary || list(week.activities).length || (hasValue(week.hoursCompleted) && Number(week.hoursCompleted) >= 0));
    const status = documented ? "Documented" : "Needs information";
    const activityMarkup = activities.length
      ? `<ul class="ojt-activity-list">${activities.map(activityHTML).join("")}</ul>`
      : `<p class="ojt-empty-inline">No ${filter === "all" ? "activities" : escapeHTML(filter)} documented for this week yet.</p>`;
    const activityPhotos = activities.flatMap(activity => {
      const group = activityPhotoGroup(week, activity);
      return group.photos.length ? [renderPhotoButtons(group)] : [];
    }).join("");
    const photosMarkup = `${renderPhotoButtons({ title: `Week ${week.week} supporting documentation`, photos: photoList(week.photos) })}${activityPhotos}`;
    const skillsMarkup = [...list(week.skills), ...activities.flatMap(activity => list(activity.skills))]
      .map(skill => typeof skill === "string" ? skill : skill?.name)
      .filter(Boolean);

    return `<details class="ojt-week-card">
      <summary>
        <span class="ojt-week-number">WEEK ${escapeHTML(week.week ?? "—")}</span>
        <span class="ojt-week-summary"><strong>${escapeHTML(week.summary || "Weekly summary not yet added")}</strong><small>${weekDate(week)} · ${textOrPlaceholder(week.location)}</small></span>
        <span class="ojt-status ${documented ? "is-documented" : "is-incomplete"}">${status}</span>
        <span class="ojt-expand-mark" aria-hidden="true">+</span>
      </summary>
      <div class="ojt-week-details">
        <div class="ojt-week-meta"><span><b>DATES</b>${weekDate(week)}</span><span><b>LOCATION</b>${textOrPlaceholder(week.location)}</span><span><b>HOURS</b>${hasValue(week.hoursCompleted) ? formatHours(week.hoursCompleted) : "Not yet specified"}</span></div>
        <div class="ojt-detail-grid">
          <section><h4>Activities performed</h4>${activityMarkup}</section>
          <section><h4>Skills applied or developed</h4>${skillsMarkup.length ? `<div class="ojt-tags">${skillsMarkup.map(skill => `<span>${escapeHTML(skill)}</span>`).join("")}</div>` : `<p class="ojt-empty-inline">Skills will appear when supported by documented activities.</p>`}</section>
          <section><h4>Challenges</h4><p>${textOrPlaceholder(week.challenges)}</p></section>
          <section><h4>Lessons learned</h4><p>${textOrPlaceholder(week.lessons)}</p></section>
        </div>
        <section class="ojt-reflection"><h4>Weekly reflection</h4>${reflectionRows(week.reflection)}</section>
        ${photosMarkup ? `<section class="ojt-supporting-photos"><h4>Supporting photos</h4>${photosMarkup}</section>` : ""}
      </div>
    </details>`;
  }

  function renderWeeks(filter = "all") {
    const visibleWeeks = weeks.filter(week => filter === "all" || list(week.activities).some(activity => activityMatches(activity, filter)));
    weekList.innerHTML = visibleWeeks.length
      ? visibleWeeks.map(week => renderWeek(week, filter)).join("")
      : `<div class="ojt-empty"><span>NO ENTRIES / ${filter === "all" ? "00" : "FILTERED"}</span><p>${filter === "all" ? "Weekly entries will appear here as you add your actual OJT records to ojt-data.js." : `No ${escapeHTML(filter)} activities have been documented yet.`}</p></div>`;
    weekList.querySelectorAll(".ojt-week-photo img").forEach(image => image.addEventListener("error", () => {
      image.closest(".ojt-week-photo").classList.add("is-missing");
    }, { once: true }));
  }

  function renderOverview() {
    const activityCount = weeks.reduce((count, week) => count + list(week.activities).length, 0);
    document.getElementById("ojtWeeksTotal").textContent = weeks.length;
    document.getElementById("ojtActivitiesTotal").textContent = activityCount;
    document.getElementById("ojtTimelineCount").textContent = `${String(weeks.length).padStart(2, "0")} ${weeks.length === 1 ? "ENTRY" : "ENTRIES"}`;

    const allWeeklyHoursEntered = weeks.length > 0 && weeks.every(week => hasValue(week.hoursCompleted) && Number(week.hoursCompleted) >= 0);
    const completed = hasValue(data.completedHours) && Number(data.completedHours) >= 0
      ? Number(data.completedHours)
      : allWeeklyHoursEntered ? weeks.reduce((sum, week) => sum + Number(week.hoursCompleted), 0) : null;
    const required = hasValue(data.requiredHours) && Number(data.requiredHours) >= 0 ? Number(data.requiredHours) : null;
    document.getElementById("ojtHoursCompleted").textContent = completed === null ? "Not yet specified" : formatHours(completed);
    document.getElementById("ojtHoursRequired").textContent = required === null ? "Not yet specified" : formatHours(required);

    const progressText = document.getElementById("ojtProgressText");
    const progressNote = document.getElementById("ojtProgressNote");
    const progressBar = document.getElementById("ojtProgressBar");
    if (completed !== null && required !== null && required > 0) {
      const rawProgress = completed / required * 100;
      const progress = Math.min(100, rawProgress);
      progressText.textContent = `${progress.toFixed(progress % 1 ? 1 : 0)}%`;
      progressBar.style.width = `${progress}%`;
      progressBar.parentElement.setAttribute("role", "progressbar");
      progressBar.parentElement.setAttribute("aria-valuemin", "0");
      progressBar.parentElement.setAttribute("aria-valuemax", "100");
      progressBar.parentElement.setAttribute("aria-valuenow", String(progress));
      progressNote.textContent = rawProgress > 100 ? `${formatHours(completed - required)} beyond requirement` : "Based on documented hours";
    } else {
      progressText.textContent = "Not yet specified";
      progressNote.textContent = required === 0 ? "Required hours must be greater than zero" : "Add completed and required hours to calculate";
      progressBar.style.width = "0%";
      progressBar.parentElement.removeAttribute("role");
      progressBar.parentElement.removeAttribute("aria-valuemin");
      progressBar.parentElement.removeAttribute("aria-valuemax");
      progressBar.parentElement.removeAttribute("aria-valuenow");
    }
  }

  function collectGalleryEntries() {
    const entries = [];
    weeks.forEach(week => {
      list(week.activities).forEach(activity => entries.push({
        title: activity.title || "Activity documentation",
        date: weekDate(week),
        location: week.location,
        caption: activity.details || activity.description || "",
        photos: photoList(activity.photos),
        week: week.week
      }));
      const weekPhotos = photoList(week.photos);
      if (weekPhotos.length) entries.push({ title: `Week ${week.week} supporting documentation`, date: weekDate(week), location: week.location, caption: "", photos: weekPhotos, week: week.week });
    });
    return entries;
  }

  function renderGallery() {
    const entries = collectGalleryEntries();
    if (!entries.length) {
      gallery.innerHTML = `<div class="ojt-empty"><span>DOCUMENTATION GALLERY / 00</span><p>Photos and activity records will appear here when added to your weekly entries.</p></div>`;
      return;
    }
    gallery.innerHTML = entries.map(entry => {
      const photoMarkup = entry.photos.length
        ? `<button class="ojt-gallery-image" type="button" data-lightbox="${registerPhotoGroup(entry)}" data-photo-index="0" aria-label="Open photos for ${escapeHTML(entry.title)}"><img src="${escapeHTML(entry.photos[0].src)}" alt="${escapeHTML(entry.photos[0].alt || entry.title)}" loading="lazy"><span class="ojt-photo-placeholder">PHOTO UNAVAILABLE</span><span class="ojt-image-count">${String(entry.photos.length).padStart(2, "0")} PHOTO${entry.photos.length === 1 ? "" : "S"}</span></button>`
        : `<div class="ojt-gallery-placeholder"><span>NO PHOTO</span><small>ACTIVITY DOCUMENTED</small></div>`;
      return `<article class="ojt-gallery-card">${photoMarkup}<div class="ojt-gallery-info"><span class="ojt-category">WEEK ${escapeHTML(entry.week ?? "—")}</span><h4>${escapeHTML(entry.title)}</h4><p>${escapeHTML(entry.date)} · ${textOrPlaceholder(entry.location)}</p>${entry.caption ? `<p>${escapeHTML(entry.caption)}</p>` : ""}</div></article>`;
    }).join("");
    gallery.querySelectorAll(".ojt-gallery-image img").forEach(image => image.addEventListener("error", () => image.closest(".ojt-gallery-image").classList.add("is-missing"), { once: true }));
  }

  function registerPhotoGroup(entry) {
    const groupId = `photo-group-${photoGroups.size}`;
    photoGroups.set(groupId, { title: entry.title, photos: entry.photos });
    return groupId;
  }

  function renderSkills() {
    const found = new Map();
    weeks.forEach(week => {
      [...list(week.skills), ...list(week.activities).flatMap(activity => list(activity.skills))].forEach(skill => {
        const name = typeof skill === "string" ? skill : skill?.name;
        if (name && !found.has(name.toLowerCase())) found.set(name.toLowerCase(), { name, weeks: [] });
        if (name) found.get(name.toLowerCase()).weeks.push(week.week);
      });
    });
    skills.innerHTML = found.size
      ? [...found.values()].map(skill => `<article class="ojt-skill-card"><span class="card-kicker">PRACTICED</span><strong>${escapeHTML(skill.name)}</strong><small>Documented in ${[...new Set(skill.weeks)].map(week => `Week ${escapeHTML(week)}`).join(", ")}</small></article>`).join("")
      : `<div class="ojt-empty"><span>SKILLS / NOT YET DOCUMENTED</span><p>Skills will be listed here when supported by your weekly activity records.</p></div>`;
  }

  function renderComparisons() {
    const items = list(data.beforeAfter).filter(item => item?.before?.src && item?.after?.src);
    const section = document.getElementById("ojtBeforeAfterSection");
    section.hidden = items.length === 0;
    const comparisons = document.getElementById("ojtComparisons");
    comparisons.innerHTML = items.map(item => `
      <article class="ojt-comparison-card"><h4>${escapeHTML(item.title || "Before & after")}</h4><div class="ojt-comparison-images">
        ${[["BEFORE", item.before], ["AFTER", item.after]].map(([label, photo]) => `<figure><img src="${escapeHTML(photo.src)}" alt="${escapeHTML(photo.alt || label)}" loading="lazy"><figcaption>${label}</figcaption></figure>`).join("")}
      </div><p>${textOrPlaceholder(item.explanation)}</p></article>`).join("");
    comparisons.querySelectorAll("img").forEach(image => image.addEventListener("error", () => {
      image.hidden = true;
      image.parentElement.classList.add("is-missing");
    }, { once: true }));
  }

  function renderFinalReflection() {
    const section = document.getElementById("ojtFinalSection");
    section.hidden = data.internshipCompleted !== true;
    const reflection = data.finalReflection || {};
    const fields = [
      ["Overall experience", reflection.overallExperience],
      ["Most valuable lessons", reflection.valuableLessons],
      ["Skills developed", reflection.skillsDeveloped],
      ["Readiness for future responsibilities", reflection.readiness]
    ];
    document.getElementById("ojtFinalReflection").innerHTML = fields.map(([label, value]) => `<article><span class="card-kicker">${label}</span><p>${textOrPlaceholder(value)}</p></article>`).join("");
  }

  function showPhoto(index) {
    if (!activePhotoGroup.length) return;
    activePhotoIndex = (index + activePhotoGroup.length) % activePhotoGroup.length;
    const photo = activePhotoGroup[activePhotoIndex];
    lightboxImage.hidden = false;
    lightboxImage.alt = photo.alt || lightboxLabel.textContent;
    lightboxPlaceholder.hidden = true;
    lightboxImage.onerror = () => {
      lightboxImage.hidden = true;
      lightboxPlaceholder.hidden = false;
    };
    lightboxImage.src = photo.src;
    lightboxLabel.textContent = (photo.alt || "ACTIVITY PHOTO").toUpperCase();
    lightboxCaption.textContent = photo.caption || "";
    lightboxCount.textContent = `${String(activePhotoIndex + 1).padStart(2, "0")} / ${String(activePhotoGroup.length).padStart(2, "0")}`;
    document.getElementById("ojtLightboxPrevious").hidden = activePhotoGroup.length < 2;
    document.getElementById("ojtLightboxNext").hidden = activePhotoGroup.length < 2;
  }

  function openPhotoGroup(groupId, index) {
    const group = photoGroups.get(groupId);
    if (!group?.photos.length) return;
    activePhotoGroup = group.photos;
    showPhoto(index);
    if (!lightbox.open) lightbox.showModal();
  }

  filters.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    filters.querySelectorAll("[data-category]").forEach(filter => {
      const active = filter === button;
      filter.classList.toggle("active", active);
      filter.setAttribute("aria-pressed", String(active));
    });
    renderWeeks(button.dataset.category);
  });

  [weekList, gallery].forEach(container => container.addEventListener("click", event => {
    const button = event.target.closest("[data-lightbox]");
    if (button) openPhotoGroup(button.dataset.lightbox, Number(button.dataset.photoIndex) || 0);
  }));

  document.getElementById("ojtLightboxClose").addEventListener("click", () => lightbox.close());
  document.getElementById("ojtLightboxPrevious").addEventListener("click", () => showPhoto(activePhotoIndex - 1));
  document.getElementById("ojtLightboxNext").addEventListener("click", () => showPhoto(activePhotoIndex + 1));
  lightbox.addEventListener("click", event => { if (event.target === lightbox) lightbox.close(); });

  renderOverview();
  renderWeeks();
  renderGallery();
  renderSkills();
  renderComparisons();
  renderFinalReflection();
})();
