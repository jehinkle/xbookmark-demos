# xbookmark-demos

Personal sandbox for **Demo Lab**: throwaway demos inspired by interesting X bookmarks (and pasted links in v0).

## How demos work

1. Create a branch: `demo/YYYY-MM-DD-<slug>`
2. Build a minimal Vite + React page that shows the idea
3. Open a PR from that branch
4. **Cloudflare Pages** deploys a preview URL on the PR (`*.xbookmark-demos.pages.dev`)

Do **not** put secrets, API tokens, or `.env` files in this repo. Mock anything that needs keys.

`main` is the production splash / home. Prefer leaving demo work on PR branches; only merge when you intentionally want something on production.

## Local

```bash
npm install
npm run dev
npm run build   # output → dist/ (Cloudflare Pages build output)
```

## Stack

- Vite + React
- Build command: `npm run build`
- Output directory: `dist`
