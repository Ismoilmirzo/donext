# GitHub Pages Deployment Runbook (DoNext)

This file is the source of truth for publishing and updating the public DoNext site.

## Current live setup

- App repo: `https://github.com/Ismoilmirzo/donext`
- Live URL: `https://donext.uz`
- Backup Pages URL: `https://ismoilmirzo.github.io/donext/`
- Pages source: `gh-pages` branch, root path (`/`)
- Custom domain is preserved by `public/CNAME`.
- `donext` must be public on current plan for Pages to work.

## Important rules

- Do not commit secrets (`.env`, service keys, auth tokens).
- Build from the latest `main`.
- Always copy `index.html` to `404.html` for SPA routing.
- Keep `.nojekyll` in published output.

## One-time checks

1. Repo visibility must be public:
```powershell
$req = "protocol=https`nhost=github.com`n`n"
$credRaw = $req | git credential fill
$token = (($credRaw -split "`n" | ? { $_ -like 'password=*' }) -replace '^password=','')
$user = (($credRaw -split "`n" | ? { $_ -like 'username=*' }) -replace '^username=','')
curl.exe -s "https://api.github.com/repos/$user/donext" `
  -H "Authorization: token $token" `
  -H "Accept: application/vnd.github+json"
```
Check `"private": false`.

2. Pages source should be `gh-pages`:
```powershell
$body = '{"source":{"branch":"gh-pages","path":"/"}}'
curl.exe -s -X POST "https://api.github.com/repos/$user/donext/pages" `
  -H "Authorization: token $token" `
  -H "Accept: application/vnd.github+json" `
  -H "X-GitHub-Api-Version: 2022-11-28" `
  -d $body
```
If POST returns 409/422, run the same with `-X PUT`.

## Standard update flow (custom domain root)

Run from repo root (`C:\Users\Asus\onedrive\desktop\momentum`):

1. Build:
```powershell
npm run lint
npm run build
```

2. Prepare temporary publish folder:
```powershell
$ts = Get-Date -Format 'yyyyMMddHHmmss'
$deployDir = ".gh-pages-tmp-$ts"
New-Item -ItemType Directory -Path $deployDir | Out-Null
Copy-Item -Path 'dist\*' -Destination $deployDir -Recurse -Force
Copy-Item -Path "$deployDir\index.html" -Destination "$deployDir\404.html" -Force
New-Item -ItemType File -Path "$deployDir\.nojekyll" -Force | Out-Null
```

3. Push to `gh-pages`:
```powershell
git init -b gh-pages $deployDir
git -C $deployDir add .
git -C $deployDir commit -m "deploy: github pages"
git -C $deployDir remote add origin https://github.com/Ismoilmirzo/donext.git
git -C $deployDir push -f origin gh-pages
```

4. Verify:
```powershell
Invoke-WebRequest -Uri 'https://donext.uz' -UseBasicParsing
```
Expected: HTTP `200`.

5. Cleanup:
```powershell
cmd /c rmdir /s /q $deployDir
```

## Fallback mode (private code repo + public hosting repo)

Use this if `donext` must stay private on a plan that does not allow private Pages.

- Private code repo: `donext`
- Public hosting repo: `donext-site`
- Public URL: `https://ismoilmirzo.github.io/donext-site/`

Deploy steps:

1. Build with overridden base:
```powershell
npx vite build --base=/donext-site/
```

2. Repeat the same publish flow as above, but push to:
`https://github.com/Ismoilmirzo/donext-site.git`

3. Verify:
```powershell
Invoke-WebRequest -Uri 'https://ismoilmirzo.github.io/donext-site/' -UseBasicParsing
```

## Troubleshooting

- `404` on `donext.uz` with asset requests pointing to `/donext/assets/...`:
  - The app was built with the wrong Vite base path.
  - `vite.config.js` must use `base: '/'`.

- `404` on `/donext/`:
  - Confirm repo is public.
  - Confirm Pages is enabled and source is `gh-pages`.
  - Wait 1-2 minutes after push; GitHub can lag.

- API says: `Your current plan does not support GitHub Pages for this repository`:
  - Repo is private and plan disallows private Pages.
  - Make repo public, or deploy via the `donext-site` fallback.

- Route pages (for example `/projects`) show 404:
  - Ensure `404.html` is present and is copied from `index.html`.

## Notes about this project config

- `vite.config.js` uses:
  - `base: '/'`
- `src/App.jsx` uses:
  - `<BrowserRouter basename={import.meta.env.BASE_URL}>`

For the `donext.uz` custom domain, keep Vite base at `/`.
