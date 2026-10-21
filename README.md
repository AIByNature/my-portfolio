# Personal Portfolio Starter

This starter uses plain HTML, CSS, and JavaScript. No npm or package.json is required.

## Files
- `index.html` — portfolio content and page sections
- `style.css` — colors, layout, responsive styles
- `script.js` — navigation tabs and small interactions

## Preview locally
Open `index.html` in a browser, or open this folder in VS Code and use the Live Server extension.

## Before publishing
1. Replace `[Your Name]` and `YOUR PHOTO`.
2. Replace `your.email@example.com` with your real email in `index.html` and `data-email` on the copy button.
3. Update experience and dates to match your records.
4. Replace sample project descriptions with work you have permission to share.
5. Add your own project images if available.

## Push to GitHub
From the project folder in the VS Code terminal:
```bash
git status
git add index.html style.css script.js README.md
git commit -m "Add portfolio website starter"
git push
```
If Git says no upstream branch is set, follow the command it prints. If you cloned your repository, the remote should already be configured.

## Deploy
Import `AIByNature/my-portfolio` at https://vercel.com/new. For this plain HTML site, no build command is needed; leave the output directory empty/default unless Vercel asks otherwise.

## Google Docs OJT integration

The portfolio reads the fixed document ID in `GOOGLE_DOCS_DOCUMENT_ID` through the server-side `/api/ojt` Vercel Function. Visitors cannot supply another document ID. The parser recognizes `Week 1` style headings, Google Docs heading styles, and inline labels for dates, locations, hours, activities, skills, challenges, and reflections. It preserves source text and leaves missing information blank. The source report could not be inspected from this workspace, so review its parsed result once connected. The site never edits the original document.

1. In Google Cloud Console, create or select a project and enable **Google Docs API** and **Google Drive API**.
2. Create a service account and JSON key. Share the existing report with the service account email as a **Viewer**. Do not make the report public.
3. In Vercel Project Settings → Environment Variables, add the following for Preview and Production:
   - `GOOGLE_DOCS_DOCUMENT_ID` = `1AUfp2S6zZt3Ow2Zn2VhfwMKlOQ9rngF8Z0uYDYbL6vw`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = the service account email
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` = the `private_key` from its JSON key, including the BEGIN/END lines. Literal `\n` line breaks are supported.
4. Redeploy after adding the variables. `/api/ojt` caches server responses for five minutes. The OJT page refreshes when opened and has a manual Refresh/Retry button. The browser keeps its last successful public payload as an outage fallback.
5. For local development, copy `.env.example` to `.env.local`, fill in the same values, and run `npx vercel dev` from this folder. Never commit `.env.local` or service-account JSON files. Opening `index.html` directly or using static-only Live Server cannot run the API route.

The endpoint uses the read-only `documents.readonly` and `drive.metadata.readonly` Google scopes. It does not log report contents or return credentials. Confirm that the document contains only information you intend to publish on your portfolio before connecting it.
