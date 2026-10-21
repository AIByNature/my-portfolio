const { createSign } = require("node:crypto");

const DOCS_SCOPE = "https://www.googleapis.com/auth/documents.readonly";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly";
const FIXED_DOCUMENT_ID = "1AUfp2S6zZt3Ow2Zn2VhfwMKlOQ9rngF8Z0uYDYbL6vw";
let tokenCache = { value: "", expiresAt: 0 };
let responseCache = { value: null, expiresAt: 0 };

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

async function accessToken() {
  if (tokenCache.value && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey || process.env.GOOGLE_DOCS_DOCUMENT_ID !== FIXED_DOCUMENT_ID) throw new Error("Google Docs integration is not configured");

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: email,
    scope: `${DOCS_SCOPE} ${DRIVE_SCOPE}`,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(privateKey, "base64url")}`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  if (!tokenResponse.ok) throw new Error("Google authorization failed");
  const token = await tokenResponse.json();
  if (!token.access_token) throw new Error("Google authorization failed");
  tokenCache = { value: token.access_token, expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000 };
  return tokenCache.value;
}

function paragraphsFrom(elements, output = []) {
  for (const element of elements || []) {
    if (element.paragraph) {
      const paragraph = element.paragraph;
      const parts = paragraph.elements || [];
      const text = parts.map(part => part.textRun?.content || "").join("").trim();
      const links = parts.map(part => part.textRun?.textStyle?.link?.url).filter(Boolean);
      if (text) output.push({ text, links, style: paragraph.paragraphStyle?.namedStyleType || "NORMAL_TEXT" });
    }
    if (element.table) {
      for (const row of element.table.tableRows || []) {
        for (const cell of row.tableCells || []) paragraphsFrom(cell.content, output);
      }
    }
    if (element.tableOfContents) paragraphsFrom(element.tableOfContents.content, output);
  }
  return output;
}

const clean = value => String(value || "").replace(/\s+/g, " ").trim();
const headingPattern = /^(?:week|wk)\s*(\d+)\b\s*[:\u2013\u2014-]?\s*(.*)$/i;

function classify(text) {
  const value = text.toLowerCase();
  if (/clone|deploy|install|software|application|os\b/.test(value)) return "Software";
  if (/network|router|switch|lan\b|ip address|troubleshoot/.test(value)) return "Networking";
  if (/inventory|asset|serial number|tagging/.test(value)) return "Inventory";
  if (/document|report|encode|record/.test(value)) return "Documentation";
  if (/computer|pc\b|hardware|maintenance|repair|laboratory|lab\b/.test(value)) return "Hardware";
  return "";
}

function parseReport(elements) {
  const lines = paragraphsFrom(elements);
  const result = { completedHours: null, requiredHours: null, internshipCompleted: false, finalReflection: {}, weeks: [], beforeAfter: [] };
  let week = null;
  let section = "";
  let globalReflection = "";
  const startWeek = (number, title) => {
    week = {
      week: Number(number), startDate: "", endDate: "", location: "", summary: clean(title),
      hoursCompleted: null, status: "documented", activities: [], skills: [], challenges: "", lessons: "", reflection: {}, photos: []
    };
    result.weeks.push(week);
    section = "";
  };
  const append = (key, text) => { week[key] = clean([week[key], text].filter(Boolean).join(" ")); };

  for (const line of lines) {
    const text = clean(line.text);
    const weekMatch = text.match(headingPattern);
    if (weekMatch) { startWeek(weekMatch[1], weekMatch[2]); continue; }
    const isHeading = line.style.startsWith("HEADING_") || line.style === "TITLE";
    const label = text.match(/^(activities?(?: performed)?|tasks?(?: performed)?|skills?(?: developed| learned)?|competencies|challenges?(?: encountered)?|lessons?(?: learned)?|reflections?|dates?|period|location|department|hours?(?: completed|required)?|overall experience|valuable lessons|readiness)\s*:?$/i);
    if (label && !isHeading) {
      section = label[1].toLowerCase();
      continue;
    }
    if (!week && /final reflection|overall experience|valuable lessons/i.test(text)) { section = "final"; continue; }
    if (isHeading) {
      section = text.toLowerCase();
      if (!week || !weekMatch) continue;
    }

    const hours = text.match(/(?:completed|total|accumulated)\s*(?:ojt\s*)?hours?\s*[:\-â€“]?\s*([\d,.]+)|([\d,.]+)\s*hours?\s*(?:completed|total)/i);
    if (hours) {
      const value = Number((hours[1] || hours[2]).replace(/,/g, ""));
      if (Number.isFinite(value)) {
        if (/required/i.test(text)) result.requiredHours = value;
        else if (week && /week|daily|this/i.test(text)) week.hoursCompleted = value;
        else result.completedHours = value;
      }
    }
    const required = text.match(/required\s*(?:ojt\s*)?hours?\s*[:\-â€“]?\s*([\d,.]+)/i);
    if (required) result.requiredHours = Number(required[1].replace(/,/g, ""));
    if (/internship completed|ojt completed|training completed/i.test(text)) result.internshipCompleted = true;

    if (!week) {
      if (section === "final" || /overall experience|valuable lessons|skills developed|readiness/i.test(text)) globalReflection += `${globalReflection ? " " : ""}${text}`;
      continue;
    }

    const imageLinks = [...new Set([...(line.links || []), ...(text.match(/https:\/\/[^\s)]+/g) || [])])]
      .filter(url => /^https:\/\//i.test(url) && /\.(?:png|jpe?g|webp|gif)(?:[?#].*)?$/i.test(url));
    imageLinks.forEach((src, index) => {
      const photo = { src, alt: `OJT report photo ${index + 1}`, caption: "" };
      const activity = week.activities[week.activities.length - 1];
      if (activity) activity.photos.push(photo);
      else week.photos.push(photo);
    });

    const dateRange = text.match(/(?:date|period|week of)\s*[:\-â€“]?\s*(\d{4}-\d{2}-\d{2})(?:\s*(?:to|through|[-â€“â€”])\s*(\d{4}-\d{2}-\d{2}))?/i);
    if (dateRange) { week.startDate = dateRange[1]; week.endDate = dateRange[2] || ""; continue; }
    const location = text.match(/(?:assigned\s+)?(?:location|department|office|site)\s*[:\-â€“]\s*(.+)/i);
    if (location) { week.location = clean(location[1]); continue; }
    const labeledHours = text.match(/(?:hours|time rendered)\s*[:\-â€“]\s*([\d,.]+)/i);
    if (labeledHours) { week.hoursCompleted = Number(labeledHours[1].replace(/,/g, "")); continue; }
    if (/^(?:date|period|week of|location|department|assigned location|hours|time rendered)\b/i.test(text)) continue;

    const content = text.replace(/^\s*[\u2022*-]\s*/, "");
    if (/skill|competenc|learning outcome/i.test(section)) {
      week.skills.push(content);
    } else if (/challenge|difficult|problem encountered/i.test(section)) {
      append("challenges", content);
      week.reflection.challenges = appendReflection(week.reflection.challenges, content);
    } else if (/lesson|reflection|learning|takeaway/i.test(section)) {
      append("lessons", content);
      week.reflection.gained = appendReflection(week.reflection.gained, content);
    } else if (/activity|task|responsibilit|work performed/i.test(section) || /^\s*[â€¢*-]/.test(text)) {
      week.activities.push({ title: content, details: "", category: classify(content), skills: [], photos: [] });
    } else if (!week.summary) {
      week.summary = content;
    } else if (isHeading) {
      section = text.toLowerCase();
    } else {
      week.activities.push({ title: content, details: "", category: classify(content), skills: [], photos: [] });
    }
  }
  if (globalReflection) result.finalReflection.overallExperience = globalReflection;
  return result;
}

function appendReflection(current, value) {
  return clean([current, value].filter(Boolean).join(" "));
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  if (responseCache.value && responseCache.expiresAt > Date.now()) return res.status(200).json(responseCache.value);
  try {
    const id = process.env.GOOGLE_DOCS_DOCUMENT_ID;
    const token = await accessToken();
    const headers = { Authorization: `Bearer ${token}` };
    const documentResponse = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(id)}`, { headers });
    if (!documentResponse.ok) throw new Error("Document read failed");
    const document = await documentResponse.json();
    const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=modifiedTime`, { headers });
    const metadata = metadataResponse.ok ? await metadataResponse.json() : {};
    const result = { ok: true, fetchedAt: new Date().toISOString(), sourceUpdatedAt: metadata.modifiedTime || null, data: parseReport(document.body?.content) };
    responseCache = { value: result, expiresAt: Date.now() + 5 * 60_000 };
    return res.status(200).json(result);
  } catch {
    return res.status(503).json({ ok: false, error: "OJT report is temporarily unavailable" });
  }
};
