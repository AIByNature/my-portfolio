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

The attendance view searches by duty number or date, filters by month, and paginates in groups of ten. Activities and skills are maintained in the same file; dates and activity assignments are omitted when they are not verified. Photos already in `assets/OJT/` are referenced by their original filenames in `photos` in `ojt-data.js`. Each photo can optionally include `date` or `week`, `title`, `category`, `description`, `skills`, and `reflection` fields. The photo viewer uses local files only and does not display Drive links. Reflection notes can be saved in the current browser, then copied into the `reflections` object in `ojt-data.js` to persist with the project.
