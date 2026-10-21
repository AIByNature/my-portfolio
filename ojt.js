(() => {
  const data = window.ojtData || {};
  const records = Array.isArray(data.dutyRecords) ? data.dutyRecords : [];
  const pageSize = 10;
  let page = 0;

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  document.getElementById("ojtOrganization").textContent = String(data.organization || "OJT organization not provided");
  document.getElementById("ojtExperience").textContent = String(data.experience || "Information Technology On-the-Job Training");
  document.getElementById("ojtEntryCount").textContent = String(data.recordedDutyEntries ?? records.length);
  document.getElementById("ojtRecordedTotal").textContent = String(data.recordedTotalTime ?? "Not provided");
  const period = data.dutyPeriod || {};
  const periodText = period.start && period.end ? `${period.start} to ${period.end}` : "Not provided";
  document.getElementById("ojtDutyPeriod").textContent = period.start && period.end ? `${period.start} – ${period.end}` : periodText;
  document.getElementById("ojtPeriodIntro").textContent = periodText;
  document.getElementById("ojtActivitiesCount").textContent = String((data.activities || []).length);

  const attendanceRows = document.getElementById("ojtAttendanceRows");
  const attendanceSearch = document.getElementById("ojtAttendanceSearch");
  const monthFilter = document.getElementById("ojtMonthFilter");
  const previousPage = document.getElementById("ojtPreviousPage");
  const nextPage = document.getElementById("ojtNextPage");
  const pageStatus = document.getElementById("ojtPageStatus");
  const attendanceNote = document.getElementById("ojtAttendanceNote");
  const attendanceCount = document.getElementById("ojtAttendanceCount");
  const seenDutyNumbers = new Set();
  const duplicateDutyNumbers = new Set();
  records.forEach(record => {
    const number = String(record.dutyNumber ?? "");
    if (seenDutyNumbers.has(number)) duplicateDutyNumbers.add(number);
    seenDutyNumbers.add(number);
  });
  const missingDutyNumbers = Array.from({ length: Number(data.recordedDutyEntries || 0) }, (_, index) => String(index + 1))
    .filter(number => !seenDutyNumbers.has(number));

  function parseDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? null : date;
  }

  function rowMonth(record) {
    if (record.month) return String(record.month);
    const date = parseDate(record.date);
    return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "";
  }

  function readableDate(value) {
    const date = parseDate(value);
    return date ? date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : String(value || "—");
  }

  function filteredRecords() {
    const query = attendanceSearch.value.trim().toLowerCase();
    const month = monthFilter.value;
    return records.filter(record => {
      const matchesSearch = !query || String(record.dutyNumber ?? "").toLowerCase().includes(query) || String(record.date ?? "").toLowerCase().includes(query);
      const matchesMonth = month === "all" || rowMonth(record) === month;
      return matchesSearch && matchesMonth;
    });
  }

  function renderAttendance() {
    const matched = filteredRecords();
    const pageCount = Math.ceil(matched.length / pageSize);
    page = Math.min(page, Math.max(0, pageCount - 1));
    const first = page * pageSize;
    const shown = matched.slice(first, first + pageSize);
    attendanceRows.innerHTML = shown.length ? shown.map(record => `<tr>
      <td>${escapeHTML(record.dutyNumber ?? "—")}</td>
      <td>${escapeHTML(readableDate(record.date))}</td>
      <td>${escapeHTML(record.timeIn ?? "—")}</td>
      <td>${escapeHTML(record.timeOut ?? "—")}</td>
      <td>${escapeHTML(record.recordedTime ?? "—")}</td>
    </tr>`).join("") : `<tr><td class="ojt-table-empty" colspan="5">${records.length ? "No attendance records match these filters." : "Attendance rows are pending the source PDF; no records have been invented."}</td></tr>`;
    attendanceCount.textContent = `${records.length} OF ${data.recordedDutyEntries ?? records.length} ROWS LOADED`;
    if (duplicateDutyNumbers.size) {
      attendanceNote.hidden = false;
      attendanceNote.textContent = `Duplicate duty numbers found: ${[...duplicateDutyNumbers].join(", ")}. Review the source data.`;
    } else if (records.length && missingDutyNumbers.length) {
      attendanceNote.hidden = false;
      attendanceNote.textContent = `Verified rows loaded: ${records.length}. Missing duty numbers: ${missingDutyNumbers.join(", ")}.`;
    } else {
      attendanceNote.hidden = records.length >= Number(data.recordedDutyEntries || 0) && records.length > 0;
    }
    pageStatus.textContent = matched.length ? `Rows ${first + 1}–${Math.min(first + pageSize, matched.length)} of ${matched.length}` : "No verified rows";
    previousPage.disabled = page === 0 || !matched.length;
    nextPage.disabled = first + pageSize >= matched.length;
  }

  const months = [...new Set(records.map(rowMonth).filter(Boolean))].sort();
  months.forEach(month => {
    const option = document.createElement("option");
    option.value = month;
    const date = parseDate(`${month}-01T00:00:00Z`);
    option.textContent = date ? date.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" }) : month;
    monthFilter.append(option);
  });
  attendanceSearch.addEventListener("input", () => { page = 0; renderAttendance(); });
  monthFilter.addEventListener("change", () => { page = 0; renderAttendance(); });
  previousPage.addEventListener("click", () => { page -= 1; renderAttendance(); });
  nextPage.addEventListener("click", () => { page += 1; renderAttendance(); });
  renderAttendance();

  const activities = document.getElementById("ojtActivities");
  activities.innerHTML = (data.activities || []).map((activity, index) => `<article class="ojt-local-activity">
    <span class="ojt-category">${escapeHTML(activity.category || "OJT EXPERIENCE")}</span>
    <span class="ojt-local-index">${String(index + 1).padStart(2, "0")}</span>
    <h4>${escapeHTML(activity.title)}</h4>
    ${activity.description ? `<p>${escapeHTML(activity.description)}</p>` : ""}
    <small>Undated activity summary</small>
  </article>`).join("");

  document.getElementById("ojtSkills").innerHTML = (data.skills || []).map(skill => `<span class="ojt-skill-tag">${escapeHTML(skill)}</span>`).join("");

  const reflectionKey = "portfolio-ojt-reflections-v1";
  const reflectionFields = [...document.querySelectorAll("[data-reflection]")];
  try {
    const saved = JSON.parse(localStorage.getItem(reflectionKey) || "{}");
    reflectionFields.forEach(field => { field.value = saved[field.dataset.reflection] || data.reflections?.[field.dataset.reflection] || ""; });
  } catch {
    reflectionFields.forEach(field => { field.value = data.reflections?.[field.dataset.reflection] || ""; });
  }
  document.getElementById("ojtSaveReflections").addEventListener("click", () => {
    const value = Object.fromEntries(reflectionFields.map(field => [field.dataset.reflection, field.value.trim()]));
    try {
      localStorage.setItem(reflectionKey, JSON.stringify(value));
      document.getElementById("ojtReflectionStatus").textContent = "Saved in this browser.";
    } catch {
      document.getElementById("ojtReflectionStatus").textContent = "Unable to save in this browser. Copy your notes into ojt-data.js.";
    }
  });

  const docsCarousel = document.getElementById("ojtDocsCarousel");
  const docsWindow = document.getElementById("ojtDocsWindow");
  const docsTrack = document.getElementById("ojtDocsTrack");
  const docsDots = document.getElementById("ojtDocsDots");
  const docsPosition = document.getElementById("ojtDocsPosition");
  const docsPrevious = document.getElementById("ojtDocsPrevious");
  const docsNext = document.getElementById("ojtDocsNext");
  const photoResources = (Array.isArray(data.photos) ? data.photos : []).filter(photo => photo?.src).map(photo => ({
    type: "photo",
    title: photo.title || photo.alt || "OJT photo documentation",
    description: photo.caption || "",
    category: "Photos",
    actionLabel: "View Photo",
    url: photo.src,
    thumbnail: photo.src,
    alt: photo.alt || photo.title || "OJT documentation photo"
  }));
  const resources = [...(Array.isArray(data.resources) ? data.resources : []), ...photoResources].filter(item => item?.title && item?.url);
  let currentResource = 0;
  let dragStartX = null;
  let dragMoved = false;
  let suppressCarouselClick = false;
  let lastWheelNavigation = 0;

  const safeLink = value => {
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === "https:" || url.origin === window.location.origin ? url.href : "";
    } catch { return ""; }
  };

  function resourceMedia(resource) {
    if (resource.thumbnail) return `<img src="${escapeHTML(resource.thumbnail)}" alt="${escapeHTML(resource.alt || resource.title)}" loading="lazy">`;
    const icon = resource.type === "folder"
      ? '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 12.5A3.5 3.5 0 0 1 8.5 9h11l4 4H40a3 3 0 0 1 3 3v19a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V12.5Z"/><path d="M5 18h38"/></svg>'
      : '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 5h16l9 9v29H12z"/><path d="M28 5v10h9M18 24h13M18 30h13M18 36h9"/></svg>';
    return `<span class="ojt-docs-icon" aria-hidden="true">${icon}</span>`;
  }

  function renderResourceCards() {
    docsTrack.innerHTML = resources.length ? resources.map((resource, index) => {
      const link = safeLink(resource.url);
      const action = link
        ? `<a class="ojt-docs-action" href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">${escapeHTML(resource.actionLabel || "Open resource")} <span aria-hidden="true">&#8599;</span></a>`
        : `<span class="ojt-docs-action is-unavailable">Resource link unavailable</span>`;
      return `<article class="ojt-docs-slide" aria-label="Resource ${index + 1} of ${resources.length}" aria-hidden="${index !== currentResource}" ${index !== currentResource ? "inert" : ""}>
        <div class="ojt-docs-card">
          <div class="ojt-docs-media ${resource.thumbnail ? "has-image" : ""}">${resourceMedia(resource)}<span class="ojt-docs-media-label">${escapeHTML(resource.type === "folder" ? "DRIVE / FOLDER" : resource.type === "photo" ? "IMAGE / DOCUMENTATION" : "OJT / RESOURCE")}</span></div>
          <div class="ojt-docs-copy"><span class="ojt-docs-category">${escapeHTML(resource.category || "OJT Resource")}</span><h4>${escapeHTML(resource.title)}</h4><p>${escapeHTML(resource.description || "")}</p>${action}</div>
        </div>
      </article>`;
    }).join("") : `<div class="ojt-empty"><span>NO RESOURCES / 00</span><p>Add a verified file to the <code>resources</code> array in <code>ojt-data.js</code>.</p></div>`;

    docsDots.innerHTML = resources.map((resource, index) => `<button type="button" class="ojt-docs-dot${index === currentResource ? " is-active" : ""}" data-resource-index="${index}" aria-label="Show resource ${index + 1}: ${escapeHTML(resource.title)}" aria-current="${index === currentResource ? "true" : "false"}"></button>`).join("");
    docsTrack.querySelectorAll("img").forEach(image => image.addEventListener("error", () => {
      image.remove();
      image.closest(".ojt-docs-media")?.classList.remove("has-image");
    }, { once: true }));
    updateResourceCarousel();
  }

  function updateResourceCarousel() {
    docsTrack.style.transform = `translateX(-${currentResource * 100}%)`;
    docsTrack.querySelectorAll(".ojt-docs-slide").forEach((slide, index) => {
      const active = index === currentResource;
      slide.setAttribute("aria-hidden", String(!active));
      slide.inert = !active;
    });
    docsPrevious.disabled = resources.length < 2 || currentResource === 0;
    docsNext.disabled = resources.length < 2 || currentResource === resources.length - 1;
    docsPosition.textContent = `${String(resources.length ? currentResource + 1 : 0).padStart(2, "0")} / ${String(resources.length).padStart(2, "0")}`;
    docsDots.querySelectorAll(".ojt-docs-dot").forEach((dot, index) => {
      dot.classList.toggle("is-active", index === currentResource);
      dot.setAttribute("aria-current", String(index === currentResource));
    });
  }

  function goToResource(index) {
    if (index < 0 || index >= resources.length || index === currentResource) return;
    currentResource = index;
    updateResourceCarousel();
  }

  docsPrevious.addEventListener("click", () => goToResource(currentResource - 1));
  docsNext.addEventListener("click", () => goToResource(currentResource + 1));
  docsDots.addEventListener("click", event => {
    const dot = event.target.closest("[data-resource-index]");
    if (dot) goToResource(Number(dot.dataset.resourceIndex));
  });
  docsCarousel.addEventListener("keydown", event => {
    if (event.target.closest("a, input, textarea, select")) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); goToResource(currentResource - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); goToResource(currentResource + 1); }
  });
  docsWindow.addEventListener("pointerdown", event => {
    if (event.target.closest("a, button")) return;
    dragStartX = event.clientX;
    dragMoved = false;
    docsWindow.setPointerCapture(event.pointerId);
  });
  docsWindow.addEventListener("pointerup", event => {
    if (dragStartX === null) return;
    const distance = event.clientX - dragStartX;
    if (Math.abs(distance) > 45) {
      dragMoved = true;
      goToResource(currentResource + (distance < 0 ? 1 : -1));
      suppressCarouselClick = true;
      window.setTimeout(() => { suppressCarouselClick = false; }, 0);
    }
    dragStartX = null;
  });
  docsWindow.addEventListener("pointercancel", () => { dragStartX = null; });
  docsCarousel.addEventListener("click", event => {
    if (suppressCarouselClick && dragMoved) { event.preventDefault(); event.stopPropagation(); }
    dragMoved = false;
  }, true);
  docsWindow.addEventListener("wheel", event => {
    if (Math.abs(event.deltaX) < 24 || Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
    event.preventDefault();
    const now = Date.now();
    if (now - lastWheelNavigation < 450) return;
    lastWheelNavigation = now;
    goToResource(currentResource + (event.deltaX > 0 ? 1 : -1));
  }, { passive: false });
  renderResourceCards();
})();
