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
  const photoWheel = document.getElementById("ojtPhotoWheel");
  const photoWheelStage = document.getElementById("ojtPhotoWheelStage");
  const photoWheelCounter = document.getElementById("ojtWheelCounter");
  const photoWheelAngle = 34;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let wheelIndex = 0;
  let wheelAnimating = false;
  let queuedWheelSteps = 0;
  let queuedPhotoTarget = null;
  let queuedPhotoOpen = false;

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

  function renderPhotoWheel() {
    if (!photoResources.length) {
      photoWheelStage.innerHTML = "";
      photoWheelCounter.textContent = "00 / 00";
      return;
    }
    photoWheelCounter.textContent = `${String(wheelIndex + 1).padStart(2, "0")} / ${String(photoResources.length).padStart(2, "0")}`;
    photoWheelStage.innerHTML = Array.from({ length: 7 }, (_, slot) => {
      const offset = slot - 3;
      const index = (wheelIndex + offset + photoResources.length) % photoResources.length;
      const photo = photoResources[index];
      const tilt = offset === 0 ? 0 : (offset % 2 ? -1.4 : 1.2);
      const opacity = Math.max(.12, 1 - Math.abs(offset) * .23);
      return `<button class="ojt-wheel-card${offset === 0 ? " is-active" : ""}" type="button" data-wheel-photo="${index}" aria-label="Bring OJT photo ${index + 1} to the front and open it" style="--wheel-angle:${-offset * photoWheelAngle}deg;--wheel-tilt:${tilt}deg;--wheel-opacity:${opacity}">
        <img src="${escapeHTML(photo.src)}" alt="${escapeHTML(photo.alt)}" loading="${Math.abs(offset) < 2 ? "eager" : "lazy"}" decoding="async">
      </button>`;
    }).join("");
  }

  function rotatePhotoWheel(steps, openWhenFinished = false) {
    if (!photoResources.length) return;
    if (wheelAnimating) {
      queuedWheelSteps = Math.max(-8, Math.min(8, queuedWheelSteps + steps));
      return;
    }
    if (!steps) {
      if (openWhenFinished) showPhoto(wheelIndex);
      return;
    }

    wheelAnimating = true;
    const duration = reducedMotion.matches ? 0 : Math.min(820, 380 + Math.abs(steps) * 90);
    photoWheelStage.style.transition = `transform ${duration}ms cubic-bezier(.22,.68,.22,1)`;
    requestAnimationFrame(() => { photoWheelStage.style.transform = `rotateX(${steps * photoWheelAngle}deg)`; });

    let finished = false;
    const finishRotation = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(fallbackTimer);
      wheelIndex = (wheelIndex + steps + photoResources.length) % photoResources.length;
      renderPhotoWheel();
      photoWheelStage.style.transition = "none";
      photoWheelStage.style.transform = "rotateX(0deg)";
      photoWheelStage.offsetHeight;
      requestAnimationFrame(() => { photoWheelStage.style.transition = ""; });
      wheelAnimating = false;
      const shouldOpenPhoto = openWhenFinished || queuedPhotoOpen;
      queuedPhotoOpen = false;

      if (queuedPhotoTarget !== null) {
        const target = queuedPhotoTarget;
        queuedPhotoTarget = null;
        movePhotoTo(target, shouldOpenPhoto);
      } else if (queuedWheelSteps) {
        const nextStep = Math.sign(queuedWheelSteps);
        queuedWheelSteps -= nextStep;
        rotatePhotoWheel(nextStep, shouldOpenPhoto);
      } else if (shouldOpenPhoto) {
        showPhoto(wheelIndex);
      }
    };
    photoWheelStage.addEventListener("transitionend", event => {
      if (event.target === photoWheelStage && event.propertyName === "transform") finishRotation();
    }, { once: true });
    const fallbackTimer = window.setTimeout(finishRotation, duration + 80);
  }

  function movePhotoTo(target, openWhenFinished = true) {
    if (!photoResources.length) return;
    if (wheelAnimating) {
      queuedPhotoTarget = target;
      queuedPhotoOpen = openWhenFinished;
      return;
    }
    const count = photoResources.length;
    const forward = (target - wheelIndex + count) % count;
    const steps = forward > count / 2 ? forward - count : forward;
    rotatePhotoWheel(steps, openWhenFinished);
  }

  renderPhotoWheel();
  photoWheel.addEventListener("wheel", event => {
    if (Math.abs(event.deltaY) < Math.abs(event.deltaX) * .6) return;
    event.preventDefault();
    rotatePhotoWheel(Math.sign(event.deltaY));
  }, { passive: false });
  photoWheel.addEventListener("keydown", event => {
    if (["ArrowDown", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      rotatePhotoWheel(1);
    } else if (["ArrowUp", "ArrowLeft"].includes(event.key)) {
      event.preventDefault();
      rotatePhotoWheel(-1);
    }
  });
  let touchStartY = null;
  let suppressWheelClick = false;
  photoWheel.addEventListener("touchstart", event => { touchStartY = event.changedTouches[0]?.clientY ?? null; }, { passive: true });
  photoWheel.addEventListener("touchend", event => {
    if (touchStartY === null) return;
    const delta = touchStartY - (event.changedTouches[0]?.clientY ?? touchStartY);
    if (Math.abs(delta) > 28) {
      suppressWheelClick = true;
      window.setTimeout(() => { suppressWheelClick = false; }, 450);
      rotatePhotoWheel(Math.sign(delta));
    }
    touchStartY = null;
  }, { passive: true });
  photoWheel.addEventListener("click", event => {
    if (suppressWheelClick) return;
    const card = event.target.closest("[data-wheel-photo]");
    if (card) movePhotoTo(Number(card.dataset.wheelPhoto));
  });
  document.getElementById("ojtWheelPrevious").addEventListener("click", () => rotatePhotoWheel(-1));
  document.getElementById("ojtWheelNext").addEventListener("click", () => rotatePhotoWheel(1));
  photoWheel.addEventListener("error", event => {
    if (event.target instanceof HTMLImageElement) event.target.hidden = true;
  }, true);

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
