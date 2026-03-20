# Deployment Runbook

This project deploys on Vercel.

## Production

- Production domain: `https://donext.uz`
- Vercel project: `donext`
- Git repository: `Ismoilmirzo/donext`
- Production branch: `main`

## Normal deploy flow

1. Verify locally:
   - `npm run lint`
   - `npm run build`
2. Commit the intended changes.
3. Push to `main`:
   - `git push origin main`
4. Vercel auto-deploys the latest `main` commit to production.
5. Verify:
   - `https://donext.uz/`
   - `https://donext.uz/auth/`
   - `https://donext.uz/projects`

## Forced production deploy

Use this only if Git-based auto-deploy is delayed or needs to be overridden:

```powershell
npx vercel@latest --prod --yes
```

## Environment variables

These must exist in Vercel for `production` and `preview`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAILS`

## Routing

- SPA routing is handled by `vercel.json`
- Do not reintroduce GitHub Pages `404.html` fallback logic

## Domain / DNS

- `donext.uz` and `www.donext.uz` point to Vercel
- Current DNS target:
  - `A @ -> 76.76.21.21`
  - `A www -> 76.76.21.21`

## Important

- Do not use GitHub Pages for deployment anymore
- Do not restore `.github/workflows/deploy-pages.yml`
- Do not restore `public/CNAME`
