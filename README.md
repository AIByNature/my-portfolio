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

## OJT local data

The OJT page uses `ojt-data.js` as its only data source. Its summary values and undated activity descriptions come from the provided request. Attendance rows remain empty until copied exactly from `On The Job Requirements.pdf`; that PDF was not present in the workspace when this change was made. No cloud credentials or service account are required.

To add attendance, add one object per source row to `dutyRecords`, using the fields `dutyNumber`, `date`, `timeIn`, `timeOut`, and `recordedTime`. Copy each value from the PDF, and keep recorded time values as strings so their notation is preserved.


## Private portfolio editor (Vercel + Supabase)

The public site still works as a static portfolio when the API is not configured. On Vercel, `/admin` provides password login and draft/publish editing. The public site reads only the `published` JSON document from `/api/content`; drafts are available only from the authenticated admin endpoint. The dashboard edits each section as JSON so lists such as skills, projects, experience, and OJT reports can be managed without changing site source files.

### Configure Supabase

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor.
2. In Supabase Project Settings, copy the project URL and the service role key. Keep this key server-side only.
3. Add the values from [`.env.example`](.env.example) to Vercel Project Settings → Environment Variables for Production (and Preview if needed). Do not commit a real `.env` file.
4. Generate the password hash locally with Node.js. Pick a long unique password, then run this in PowerShell (it prompts without echoing the password):

   ```powershell
   $secure = Read-Host 'New admin password' -AsSecureString
   $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
   try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr); $plain | node -e "const c=require('node:crypto'),f=require('node:fs');let s=c.randomBytes(16).toString('hex'),p=f.readFileSync(0,'utf8').replace(/\\r?\\n$/,'');process.stdout.write(s+':'+c.scryptSync(p,s,64).toString('hex'))" } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
   ```

   Set the resulting `salt:hash` as `ADMIN_PASSWORD_HASH`. Set `SESSION_SECRET` to a separate random secret (for example, generate 48 random bytes with a local password manager or `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`). Redeploy after changing either secret. There is no default password or public registration.
5. Redeploy the Vercel project. The admin session cookie is Secure, HttpOnly, SameSite=Strict, and expires after eight hours.

### Edit and publish

Open `https://your-domain.example/admin`, enter the configured password, and choose a section. Each section is a JSON object; save draft to keep it private, or publish to update the public version. Supported fields include:

- `home`: `displayName`, `professionalTitle`, `heroTitle`, `tagline`, `welcomeMessage`, `profileImages` (array of `{ "src", "alt", "role" }`), `metaDescription`, `pageTitle`.
- `about`: `introduction`, `paragraphs` (array), `education`.
- `skills`: array of `{ "name", "status", "icon", "abilities" }`.
- `experience`: array of `{ "dates", "organization", "title", "description" }`.
- `projects`: array of `{ "title", "category", "description", "tools", "image", "repository", "liveUrl", "demoUrl" }`.
- `ojt`: array of `{ "week", "date", "title", "description", "tasks", "skills", "challenges", "accomplishments", "photos": [{ "url", "caption" }], "documentUrl" }`.
- `contact`: `email`, `github`, and `linkedin`.

Upload an asset in the dashboard; its public URL is copied for use in a section's JSON. JPG, PNG, WebP, GIF, and PDF are accepted up to 4 MB. Public assets are readable by visitors. Log out to end the browser session. Change the password by replacing `ADMIN_PASSWORD_HASH` in Vercel and redeploying.

### Deployment checklist and current limits

Import the existing repository into Vercel as a static project; no build command is needed. Vercel serves the `api/` functions automatically. After configuring Supabase and Vercel variables, check that wrong passwords are rejected, admin content/upload requests without a session return 401, saving a draft does not change `/api/content`, publishing updates the public page, reload retains published content, and logout blocks admin API calls.

Login throttling uses serverless-instance memory. For multiple function instances, also enable Vercel Firewall rate limiting for `/api/login`; the in-function lockout is best effort across instances. The editor uses JSON instead of rich-text forms, and there is no preview mode yet.
