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
    const source = String(value ?? "");
    const sourceDate = source.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (sourceDate) {
      const year = Number(sourceDate[3]) + (sourceDate[3].length === 2 ? 2000 : 0);
      const date = new Date(Date.UTC(year, Number(sourceDate[1]) - 1, Number(sourceDate[2])));
      return date.getUTCFullYear() === year && date.getUTCMonth() === Number(sourceDate[1]) - 1 && date.getUTCDate() === Number(sourceDate[2]) ? date : null;
    }
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
      const date = parseDate(record.date);
      const longDate = date ? date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "";
      const dateSearch = `${record.date ?? ""} ${readableDate(record.date)} ${longDate}`.toLowerCase();
      const matchesSearch = !query || String(record.dutyNumber ?? "").toLowerCase().includes(query) || dateSearch.includes(query);
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

  const activityCards = [...activities.children];
  if (activityCards.length > 1) {
    let visibleCards = 3;
    let cardStep = 0;
    let wheelLocked = false;
    let settleTimer;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function settleActivityScroll() {
      window.clearTimeout(settleTimer);
      if (!cardStep) return;
      const loopWidth = cardStep * activityCards.length;
      const firstRealCard = cardStep * visibleCards;
      let nextLeft = activities.scrollLeft;
      while (nextLeft < firstRealCard - cardStep / 2) nextLeft += loopWidth;
      while (nextLeft >= firstRealCard + loopWidth - cardStep / 2) nextLeft -= loopWidth;
      if (Math.abs(nextLeft - activities.scrollLeft) > 1) activities.scrollLeft = nextLeft;
      wheelLocked = false;
    }

    function scheduleActivitySettle() {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settleActivityScroll, 140);
    }

    function prepareActivityCarousel() {
      activities.querySelectorAll(".is-activity-clone").forEach(card => card.remove());
      visibleCards = window.matchMedia("(max-width: 650px)").matches ? 1
        : window.matchMedia("(max-width: 900px)").matches ? 2 : 3;

      const before = document.createDocumentFragment();
      for (let offset = visibleCards; offset > 0; offset -= 1) {
        const source = activityCards[(activityCards.length - offset % activityCards.length + activityCards.length) % activityCards.length];
        const clone = source.cloneNode(true);
        clone.classList.add("is-activity-clone");
        clone.setAttribute("aria-hidden", "true");
        before.append(clone);
      }
      activities.prepend(before);

      const after = document.createDocumentFragment();
      for (let offset = 0; offset < visibleCards; offset += 1) {
        const clone = activityCards[offset % activityCards.length].cloneNode(true);
        clone.classList.add("is-activity-clone");
        clone.setAttribute("aria-hidden", "true");
        after.append(clone);
      }
      activities.append(after);

      const styles = getComputedStyle(activities);
      const gap = parseFloat(styles.columnGap) || 0;
      cardStep = activityCards[0].getBoundingClientRect().width + gap;
      activities.scrollLeft = cardStep * visibleCards;
    }

    activities.addEventListener("wheel", event => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      if (wheelLocked) return;
      wheelLocked = true;
      activities.scrollBy({ left: Math.sign(event.deltaY) * cardStep, behavior: reducedMotion.matches ? "auto" : "smooth" });
      scheduleActivitySettle();
    }, { passive: false });
    activities.addEventListener("scroll", scheduleActivitySettle, { passive: true });
    activities.addEventListener("scrollend", settleActivityScroll);
    activities.addEventListener("keydown", event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      activities.scrollBy({ left: (event.key === "ArrowRight" ? 1 : -1) * cardStep, behavior: reducedMotion.matches ? "auto" : "smooth" });
    });
    window.addEventListener("resize", prepareActivityCarousel);
    prepareActivityCarousel();
  }

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

  const docsTrack = document.getElementById("ojtDocsTrack");
  const photoResources = (Array.isArray(data.photos) ? data.photos : []).filter(photo => {
    const src = String(photo?.src || "");
    return /^assets\/ojt\/[\w./ ~()-]+\.(?:jpe?g|png|webp|avif)$/i.test(src) && !src.split("/").includes("..");
  }).map(photo => ({
    src: String(photo.src),
    alt: String(photo.alt || "OJT photo documentation from a computer laboratory.")
  }));
  const lightbox = document.getElementById("ojtLightbox");
  const lightboxImage = document.getElementById("ojtLightboxImage");
  const lightboxPrevious = document.getElementById("ojtLightboxPrevious");
  const lightboxNext = document.getElementById("ojtLightboxNext");
  let activePhoto = 0;

  docsTrack.innerHTML = photoResources.map((photo, index) => `
    <button class="ojt-polaroid" type="button" data-photo-index="${index}" aria-label="Open OJT photo ${index + 1}">
      <img src="${escapeHTML(photo.src)}" alt="${escapeHTML(photo.alt)}" loading="${index < 8 ? "eager" : "lazy"}" decoding="async">
    </button>`).join("");

  docsTrack.addEventListener("error", event => {
    if (!(event.target instanceof HTMLImageElement)) return;
    event.target.hidden = true;
    event.target.closest(".ojt-polaroid")?.classList.add("is-missing");
  }, true);

  function showPhoto(index) {
    if (!photoResources.length) return;
    activePhoto = (index + photoResources.length) % photoResources.length;
    const photo = photoResources[activePhoto];
    lightboxImage.hidden = false;
    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.alt;
    if (!lightbox.open) lightbox.showModal();
  }

  docsTrack.addEventListener("click", event => {
    const opener = event.target.closest("[data-photo-index]");
    if (opener) showPhoto(Number(opener.dataset.photoIndex));
  });
  lightboxImage.addEventListener("error", () => { lightboxImage.hidden = true; });
  lightboxImage.addEventListener("load", () => { lightboxImage.hidden = false; });
  document.getElementById("ojtLightboxClose").addEventListener("click", () => lightbox.close());
  lightboxPrevious.addEventListener("click", () => showPhoto(activePhoto - 1));
  lightboxNext.addEventListener("click", () => showPhoto(activePhoto + 1));
  lightbox.addEventListener("click", event => { if (event.target === lightbox) lightbox.close(); });
  lightbox.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") { event.preventDefault(); showPhoto(activePhoto - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); showPhoto(activePhoto + 1); }
  });
})();
