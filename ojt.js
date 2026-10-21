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

  const gallery = document.getElementById("ojtGallery");
  const photos = Array.isArray(data.photos) ? data.photos : [];
  gallery.innerHTML = photos.length ? photos.map(photo => `<figure class="ojt-photo-card"><img src="${escapeHTML(photo.src)}" alt="${escapeHTML(photo.alt || "OJT documentation photo")}" loading="lazy"><figcaption>${escapeHTML(photo.caption || "OJT documentation")}</figcaption></figure>`).join("") : `<div class="ojt-empty"><span>NO PHOTOS / 00</span><p>Add your own permitted OJT documentation images to the <code>photos</code> array in <code>ojt-data.js</code>. No sample or stock images are used.</p></div>`;
  gallery.querySelectorAll("img").forEach(image => image.addEventListener("error", () => {
    const placeholder = document.createElement("div");
    placeholder.className = "ojt-photo-placeholder-block";
    placeholder.textContent = "PHOTO UNAVAILABLE";
    image.replaceWith(placeholder);
  }, { once: true }));
})();
