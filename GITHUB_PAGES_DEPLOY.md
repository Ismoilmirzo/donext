# GitHub Pages Deployment Runbook (DoNext)

This file is the source of truth for publishing and updating the public DoNext site.

## Current live setup

- App repo: `https://github.com/Ismoilmirzo/donext`
- Live URL: `https://donext.uz`
- Backup Pages URL: `https://ismoilmirzo.github.io/donext/`
- Automated deploy trigger: GitHub Actions workflow from `main`
- Workflow file: `.github/workflows/deploy-pages.yml`
- GitHub Pages API should report:
  - `build_type: workflow`
  - `source.branch: main`
  - `https_enforced: true`
- `github-pages` environment must allow deployments only from:
  - `main`
- Build-time repo variables required:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_ADMIN_EMAILS`
- Repo must stay public on the current GitHub plan for Pages to work.

## How publishing works now

- Every push to `main` triggers the Pages workflow automatically.
- The workflow installs dependencies with `npm ci`, runs `npm run build`, copies `dist/index.html` to `dist/404.html`, uploads `dist`, and deploys it to the `github-pages` environment.
- `404.html` is required because the app uses `BrowserRouter` and needs SPA fallback handling.
- The custom domain is enforced over HTTPS, so `http://donext.uz` redirects to `https://donext.uz/`.

## One-time setup checks

Run from repo root (`C:\Users\Asus\onedrive\desktop\momentum`).

1. Get the current GitHub token from git credentials:
```powershell
$req = "protocol=https`nhost=github.com`n`n"
$credRaw = $req | git credential fill
$token = (($credRaw -split "`n" | Where-Object { $_ -like 'password=*' }) -replace '^password=','')
$user = (($credRaw -split "`n" | Where-Object { $_ -like 'username=*' }) -replace '^username=','')
```

2. Confirm the repo is public:
```powershell
curl.exe -s "https://api.github.com/repos/$user/donext" `
  -H "Authorization: token $token" `
  -H "Accept: application/vnd.github+json"
```
Check `"private": false`.

3. Confirm Pages is configured for workflow deployment and HTTPS:
```powershell
curl.exe -s "https://api.github.com/repos/$user/donext/pages" `
  -H "Authorization: token $token" `
  -H "Accept: application/vnd.github+json" `
  -H "X-GitHub-Api-Version: 2026-03-10"
```
Expected:
- `"build_type": "workflow"`
- `"source.branch": "main"`
- `"cname": "donext.uz"`
- `"https_enforced": true`
- `"status": "built"`

4. Confirm the `github-pages` environment allows `main`:
```powershell
curl.exe -s "https://api.github.com/repos/$user/donext/environments/github-pages/deployment-branch-policies" `
  -H "Authorization: token $token" `
  -H "Accept: application/vnd.github+json" `
  -H "X-GitHub-Api-Version: 2026-03-10"
```
Expected branch names:
- `main`

5. Confirm repo variables exist:
```powershell
curl.exe -s "https://api.github.com/repos/$user/donext/actions/variables" `
  -H "Authorization: token $token" `
  -H "Accept: application/vnd.github+json" `
  -H "X-GitHub-Api-Version: 2026-03-10"
```
Expected variable names:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAILS`

## Standard update flow

1. Make code changes on `main`.

2. Verify locally:
```powershell
npm run lint
npm run build
```

3. Push:
```powershell
git add .
git commit -m "feat: describe change"
git push origin main
```

4. Watch the deploy:
```powershell
curl.exe -s "https://api.github.com/repos/$user/donext/actions/runs?per_page=5" `
  -H "Authorization: token $token" `
  -H "Accept: application/vnd.github+json" `
  -H "X-GitHub-Api-Version: 2026-03-10"
```
The newest `Deploy GitHub Pages` run should move from `queued` or `in_progress` to `completed` with success.

5. Verify production:
```powershell
Invoke-WebRequest -Uri 'https://donext.uz' -UseBasicParsing
Invoke-WebRequest -Uri 'https://donext.uz/auth/' -UseBasicParsing
Invoke-WebRequest -Uri 'https://donext.uz/projects' -UseBasicParsing
```
Expected: HTTP `200` for both.

## If build variables ever need updating

This app reads Supabase values at build time. Update the repository variables instead of committing `.env`.

Example:
```powershell
$body = '{"name":"VITE_SUPABASE_URL","value":"https://your-project.supabase.co"}'
curl.exe -s -X PATCH "https://api.github.com/repos/$user/donext/actions/variables/VITE_SUPABASE_URL" `
  -H "Authorization: token $token" `
  -H "Accept: application/vnd.github+json" `
  -H "X-GitHub-Api-Version: 2026-03-10" `
  -d $body
```

If the variable does not exist yet, create it with `POST` to:
`https://api.github.com/repos/$user/donext/actions/variables`

## Fallback mode (private code repo + public hosting repo)

Use this only if `donext` must stay private on a plan that does not allow Pages on the code repo.

- Private code repo: `donext`
- Public hosting repo: `donext-site`
- Public URL: `https://ismoilmirzo.github.io/donext-site/`

For that fallback:
- build with `npx vite build --base=/donext-site/`
- deploy the built output to the public repo instead

## Troubleshooting

- White page, assets trying to load from `/donext/assets/...`:
  - `vite.config.js` was built with the wrong base.
  - Keep `base: '/'` for `donext.uz`.

- Pages does not update after push:
  - Check the latest `Deploy GitHub Pages` workflow run.
  - Make sure the `github-pages` environment allows `main`.
  - Confirm repo variables still exist.
  - Confirm the Pages API still reports `build_type: workflow`.

- Workflow fails during build with missing Supabase env:
  - Repo variables are missing or wrong.
  - Recheck `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

- Route pages such as `/projects` return 404:
  - Ensure the workflow still copies `dist/index.html` to `dist/404.html`.

- Google sign-in is disabled or returns to a blank/404 callback:
  - Supabase Auth must have Google provider enabled.
  - The callback URL used by the app is `https://donext.uz/auth/`.
  - Add these redirect URLs where relevant:
    - `https://donext.uz/auth/`
    - `https://ismoilmirzo.github.io/donext/auth/`
    - `http://localhost:5173/auth/`
  - Ensure the build still publishes `dist/auth/index.html`.

- `http://donext.uz` does not redirect to HTTPS:
  - Re-run the Pages update with `https_enforced: true`.
  - Confirm the Pages API returns `"https_enforced": true`.

## Notes about this project config

- `vite.config.js` uses `base: '/'`
- `src/App.jsx` uses `<BrowserRouter basename={import.meta.env.BASE_URL}>`

For the `donext.uz` custom domain, keep Vite base at `/`.
